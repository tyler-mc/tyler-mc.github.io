/**
 * Case-study pages - the back link returns to the grid where the visitor left
 * it, and the arrow keys step between projects.
 */
(() => {
  /* Analytics (analytics.js): how far down a case study got and for how long (visible time), sent when the tab is hidden or
     closed; under 3 s is a glance. Depth is 0/25/50/75/100. The desktop's project windows do the same in os.js. */
  const TK = window.TK;
  const slug = /\/projects\//.test(location.pathname) ? location.pathname.replace(/^.*\//, '').replace(/\.html$/, '') : '';
  const reading = { t0: performance.now(), max: 0, vid: false,
    depth() {
      const doc = document.documentElement;
      return Math.min(100, Math.floor((scrollY + innerHeight) / doc.scrollHeight * 4) * 25);
    },
    end() {
      if (this.t0 === null) return;
      const secs = Math.round((performance.now() - this.t0) / 1000);
      this.t0 = null;
      this.max = Math.max(this.max, this.depth());
      if (secs >= 3) TK.track('project_read', { slug, depth: this.max, secs: Math.min(secs, 1800), direct: 1 });
    },
    video() { if (!this.vid) { this.vid = true; TK.track('video', { slug }); } } };
  if (TK && slug) {
    TK.onHide(() => reading.end());
    document.addEventListener('visibilitychange', () => { if (!document.hidden && reading.t0 === null) { reading.t0 = performance.now(); reading.max = 0; } });
    addEventListener('scroll', () => { reading.max = Math.max(reading.max, reading.depth()); }, { passive: true });
    document.addEventListener('play', (e) => {
      if (e.target.tagName === 'VIDEO' && !e.target.hasAttribute('autoplay')) reading.video();
    }, true);
  } else {
    reading.end = reading.video = () => {};
  }

  const back = document.querySelector('.case-study__back');
  let fromHome = false;
  try {
    const ref = new URL(document.referrer);
    fromHome = ref.origin === location.origin && /\/(index\.html)?$/.test(ref.pathname);
  } catch (e) { /* no referrer */ }

  // A page opened in a new tab has nothing to go back to, so the link stays a normal link
  if (back && fromHome && history.length > 1) {
    back.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      history.back();
    });
  }

  // Deep-dive pages: the rail marks the section in view
  const railLinks = Array.from(document.querySelectorAll('.cs-rail a'));
  if (railLinks.length) {
    const sections = railLinks.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = window.innerHeight * 0.35;
      let current = null;
      sections.forEach(section => {
        if (section.getBoundingClientRect().top <= line) current = section;
      });
      railLinks.forEach(a => a.classList.toggle('is-current', !!current && a.getAttribute('href') === '#' + current.id));
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    // Only from an idle page: not while something has focus, text is selected or the caret is moving
    if (document.activeElement && document.activeElement !== document.body) return;
    const selection = window.getSelection();
    if (selection && selection.type === 'Range') return;
    const selector = e.key === 'ArrowLeft' ? '.case-study__nav-link:not(.case-study__nav-link--next)'
      : e.key === 'ArrowRight' ? '.case-study__nav-link--next' : null;
    const link = selector && document.querySelector(selector);
    if (link) link.click();
  });

  // Looping clips: still under reduced motion, and a pause button on every one
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('video[autoplay]').forEach(video => {
    const figure = video.closest('figure');
    if (reduced) {
      video.removeAttribute('autoplay');
      video.pause();
    }
    if (!figure) return;
    figure.classList.add('has-video-toggle');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'video-toggle';
    const sync = () => {
      const playing = !video.paused;
      button.setAttribute('aria-label', playing ? 'Pause clip' : 'Play clip');
      button.setAttribute('aria-pressed', String(!playing));
    };
    button.addEventListener('click', () => {
      if (video.paused) { video.play().catch(() => {}); reading.video(); }
      else video.pause();
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
    figure.appendChild(button);
  });
})();
