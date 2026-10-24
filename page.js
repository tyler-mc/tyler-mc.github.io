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
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (/^(INPUT|TEXTAREA|SELECT|VIDEO|AUDIO)$/.test(tag)) return;
    const selector = e.key === 'ArrowLeft' ? '.case-study__nav-link:not(.case-study__nav-link--next)'
      : e.key === 'ArrowRight' ? '.case-study__nav-link--next' : null;
    const link = selector && document.querySelector(selector);
    if (link) link.click();
  });
})();
