/**
 * Case-study pages - the back link returns to the grid where the visitor left
 * it, and the arrow keys step between projects.
 */
(() => {
  const back = document.querySelector('.case-study__back');
  let fromHome = false;
  try {
    const ref = new URL(document.referrer);
    fromHome = ref.origin === location.origin && /\/(index\.html)?$/.test(ref.pathname);
  } catch (e) { /* no referrer */ }

  if (back && fromHome) {
    back.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      history.back();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (/^(INPUT|TEXTAREA|SELECT|VIDEO|AUDIO)$/.test(tag)) return;
    const selector = e.key === 'ArrowLeft' ? '.case-study__nav-link:not(.case-study__nav-link--next)'
      : e.key === 'ArrowRight' ? '.case-study__nav-link--next' : null;
    const link = selector && document.querySelector(selector);
    if (link) link.click();
  });
})();
