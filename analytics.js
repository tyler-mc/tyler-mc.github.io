/**
 * Analytics - a thin wrapper over Umami Cloud (cookieless, no personal data). The Umami tag is a separate
 * <script> (see OS.md); this file is what the desktop and the static pages call.
 *
 * Nothing is sent from localhost, under ?qa, with Do Not Track, or after visiting /?notrack (undo: /?track).
 * Every call is a harmless no-op if Umami is blocked, so the site never depends on it.
 *
 *   TK.landing()                    the first pageview of a desktop visit (page opts in with data-landing on its script tag)
 *   TK.open(url, title, win, via)   a visitor opened a window: a virtual pageview plus an `open` event
 *   TK.track(name, data)            a custom event, attached to the current virtual page
 *   TK.discover(what, extra, name) something found, once per session per `what`; carries n (found so far) and t (seconds in)
 *   TK.trackOnce(name, data)        a custom event, once per session
 *   TK.quiet(fn)                    run fn without counting opens (the desktop opens Read Me by itself)
 *   TK.onHide(fn)                   run fn when the tab is hidden or closed (last chance to send)
 *   TK.log                          every call, kept only when debugging (localhost or ?qa)
 */
(() => {
  if (window.TK) return;
  const script = document.currentScript;
  const debug = /[?&]qa\b/.test(location.search) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const log = [];

  try {
    if (/[?&]notrack\b/.test(location.search)) localStorage.setItem('umami.disabled', '1');
    else if (/[?&]track\b/.test(location.search)) localStorage.removeItem('umami.disabled');
  } catch (e) { /* storage blocked */ }

  /* Umami's tag is deferred, so calls made while the page loads wait for it. If it never arrived (blocked), they are dropped. */
  const queue = [];
  let ready = false, dead = false;
  const send = fn => { try { window.umami.track(fn); } catch (e) { /* tracker error */ } };
  const flush = () => {
    ready = true;
    if (!window.umami) { dead = true; queue.length = 0; return; }
    while (queue.length) send(queue.shift());
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', flush);
  else flush();
  /* The payload is fixed at call time (the queue may send it later). Umami would repeat the landing page's external
     referrer on every call, so after the landing each call names the page the visitor came from instead. */
  const emit = extra => {
    if (debug || dead) return;
    const fn = props => Object.assign({}, props, extra);
    if (ready) send(fn); else if (queue.length < 60) queue.push(fn);
  };

  let cur = location.pathname, prev = '', landed = false, quietDepth = 0;
  const here = () => landed ? { url: cur, referrer: prev } : { url: cur };

  const track = (name, data) => {
    log.push({ type: 'event', name, data, url: cur });
    emit(Object.assign({ name, data }, here()));
  };
  const landing = () => {
    const search = location.search.replace(/([?&])(qa|notrack|track)(=[^&]*)?(?=&|$)/g, '$1').replace(/[?&]+$/, '').replace(/\?&/, '?');
    const url = location.pathname + search;
    log.push({ type: 'page', url, title: document.title, landing: true });
    emit({ url, title: document.title });
    landed = true; prev = ''; cur = location.pathname;
  };
  const open = (url, title, win, via) => {
    if (quietDepth) return;
    prev = cur; cur = url;
    log.push({ type: 'page', url, title, win, via });
    emit({ url, title, referrer: prev });
    track('open', { win, via });
  };

  /* once per session; sessionStorage with an in-memory fallback when storage is blocked */
  const memo = {};
  const seen = key => {
    key = 'tk:' + key;
    try {
      if (sessionStorage.getItem(key)) return true;
      sessionStorage.setItem(key, '1');
      return false;
    } catch (e) {
      if (memo[key]) return true;
      memo[key] = 1;
      return false;
    }
  };
  let found = 0;
  try { found = +sessionStorage.getItem('tk:n') || 0; } catch (e) { /* storage blocked */ }
  /* A single step is the `discover` event with a `what`. A step in a path Umami should chart as a funnel passes its own
     event name as the third argument (crash_open, ach_bar, ...), since funnels match names, not event data. */
  const discover = (what, extra, name) => {
    if (seen('d:' + what)) return;
    found++;
    try { sessionStorage.setItem('tk:n', String(found)); } catch (e) { /* storage blocked */ }
    track(name || 'discover', Object.assign(name ? {} : { what }, { n: found, t: Math.round(performance.now() / 1000) }, extra));
  };
  const trackOnce = (name, data) => { if (!seen('e:' + name)) track(name, data); };

  const quiet = fn => { quietDepth++; try { return fn(); } finally { quietDepth--; } };

  const hideFns = [];
  let hidden = false;
  const hide = () => { if (hidden) return; hidden = true; hideFns.forEach(fn => { try { fn(); } catch (e) { /* keep going */ } }); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hide(); else hidden = false; });
  addEventListener('pagehide', hide);
  addEventListener('pageshow', () => { hidden = false; });

  /* Links: email and LinkedIn are the hiring signals; any other external link is an `outbound` */
  const clicked = e => {
    if (e.type === 'auxclick' && e.button !== 1) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    let u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.protocol === 'mailto:') track('contact', { method: 'email-compose' });
    else if (/(^|\.)linkedin\.com$/.test(u.hostname)) track('contact', { method: 'linkedin' });
    else if (/^https?:$/.test(u.protocol) && u.origin !== location.origin) track('outbound', { host: u.hostname, to: (u.hostname + u.pathname).slice(0, 200) });
  };
  document.addEventListener('click', clicked, true);
  document.addEventListener('auxclick', clicked, true);

  window.TK = { landing, open, track, discover, trackOnce, quiet, onHide: fn => hideFns.push(fn), log, debug };

  if (script && script.hasAttribute('data-landing')) landing();
})();
