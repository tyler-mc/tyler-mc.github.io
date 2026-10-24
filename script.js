/**
 * Tyler McCulloch Portfolio - Interactive Features
 */

// Motion preferences and shared scramble helpers
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ█▓▒░';

function randomScrambleChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

/**
 * Decode an element's text from random characters, left to right.
 * The final text is restored exactly; spaces are never scrambled.
 */
function scrambleText(element, duration, onDone) {
  if (REDUCED_MOTION || element.dataset.scrambling) {
    if (onDone) onDone();
    return;
  }
  const originalText = element.textContent.trim();
  const frameRate = 40;
  const frames = Math.max(1, Math.round(duration / frameRate));
  let currentFrame = 0;

  // Lock dimensions to prevent layout shift
  const rect = element.getBoundingClientRect();
  const originalDisplay = window.getComputedStyle(element).display;
  element.dataset.scrambling = 'true';
  element.style.width = `${rect.width}px`;
  element.style.height = `${rect.height}px`;
  if (originalDisplay === 'inline') element.style.display = 'inline-block';

  const render = (revealIndex) => {
    let out = '';
    for (let i = 0; i < originalText.length; i++) {
      out += i < revealIndex || originalText[i] === ' ' ? originalText[i] : randomScrambleChar();
    }
    element.textContent = out;
  };
  render(0);

  const interval = setInterval(() => {
    currentFrame++;
    render(Math.floor((currentFrame / frames) * originalText.length));
    if (currentFrame >= frames) {
      clearInterval(interval);
      element.textContent = originalText;
      element.style.width = '';
      element.style.height = '';
      if (originalDisplay === 'inline') element.style.display = '';
      delete element.dataset.scrambling;
      if (onDone) onDone();
    }
  }, frameRate);
}

/**
 * Dialog focus handling - moves focus into an opened modal, keeps Tab inside
 * it, and returns focus to whatever opened it on close.
 */
const dialogFocus = {
  stack: [],
  open(dialog) {
    if (this.stack.some(entry => entry.dialog === dialog)) return;
    this.stack.push({ dialog, returnTo: document.activeElement });
    const first = dialog.querySelector('button, a[href]');
    if (first) first.focus({ preventScroll: true });
  },
  close(dialog) {
    const index = this.stack.findIndex(entry => entry.dialog === dialog);
    if (index === -1) return;
    const [{ returnTo }] = this.stack.splice(index, 1);
    if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true });
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || !dialogFocus.stack.length) return;
  const { dialog } = dialogFocus.stack[dialogFocus.stack.length - 1];
  const focusable = Array.from(dialog.querySelectorAll('a[href], button:not([disabled])'))
    .filter(el => el.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!dialog.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all features
  initNavigation();
  initReveal();
  initSmoothScroll();
  initProjectLinks();
  initGlitchText();
  initAboutHoverEffect();
  initMysteryCard();

  // Hero enhancements
  initParticleField();
  initRotatingTagline();

  // Approach, signature seed toy and game feel
  initApproach();
  initSeedGarden();
  initGameFeel();
  initCardCentering();

  // Navigation & UX
  initDotNavigation();
  initLogoCycling();
});

/**
 * Heading scramble - headings decode from random characters the first time
 * they scroll into view. Screen readers and crawlers get the real text via
 * aria-label, so the effect is visual only.
 */
function initGlitchText() {
  const glitchElements = document.querySelectorAll('[data-glitch="true"]');

  glitchElements.forEach(element => {
    element.setAttribute('aria-label', element.textContent.trim());
  });

  if (REDUCED_MOTION) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        scrambleText(entry.target, 840);
      }
    });
  }, {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
  });

  glitchElements.forEach(element => observer.observe(element));
}

/**
 * Reveal on scroll - content is visible by default and only animates in as
 * an enhancement. Anything at or above the bottom of the viewport is revealed,
 * so jumping past a section (anchors, End key, fast flings) never leaves holes.
 */
function initReveal() {
  if (REDUCED_MOTION) return;

  const selector = [
    '.glass-card',
    '.timeline__item',
    '.section-code',
    '.corner-bracket',
    '.decorative-asterisk',
    '.section-stroke'
  ].join(', ');
  let pending = Array.from(document.querySelectorAll(`section:not(#hero) :is(${selector})`));

  pending.forEach(el => el.classList.add('will-reveal'));

  function reveal(el, order) {
    const delay = Math.min(order, 6) * 80;
    el.style.transitionDelay = `${delay}ms`;
    el.classList.add('is-revealed');
    setTimeout(() => {
      el.classList.remove('will-reveal', 'is-revealed');
      el.style.transitionDelay = '';
    }, delay + 1200);

    // Timeline entries decode their title and dates as they arrive
    if (el.classList.contains('timeline__item')) {
      const title = el.querySelector('.timeline__title');
      const year = el.querySelector('.timeline__year');
      if (title) scrambleText(title, 360);
      if (year) scrambleText(year, 240);
    }
  }

  function sweep() {
    const limit = window.innerHeight * 0.92;
    let order = 0;
    pending = pending.filter(el => {
      if (el.getBoundingClientRect().top < limit) {
        reveal(el, order++);
        return false;
      }
      return true;
    });
    if (!pending.length) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      sweep();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // Double rAF so the hidden state paints before the first reveal transitions
  requestAnimationFrame(() => requestAnimationFrame(sweep));
}

/**
 * Navigation - Scroll state & mobile toggle
 */
function initNavigation() {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  // Add scroll state to nav
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]:not(.project-card--mystery)').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const scroll = () => {
        const navHeight = document.getElementById('nav').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: REDUCED_MOTION ? 'auto' : 'smooth'
        });
      };
      if (this.hasAttribute('data-recoil') && !REDUCED_MOTION) setTimeout(scroll, 180);
      else scroll();
    });
  });
}

/**
 * Project links - cards go to the real case-study pages. Cards keep a short
 * hit-stop before the page loads; modified clicks (new tab or window) behave
 * as normal links. The Unreleased card opens its own overlay.
 */
function initProjectLinks() {
  document.querySelectorAll('.project-card:not(.project-card--mystery), .featured-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (REDUCED_MOTION || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      setTimeout(() => { window.location.href = card.href; }, 110);
    });
  });

  const mystery = document.querySelector('.project-card--mystery');
  if (mystery) {
    mystery.addEventListener('click', (e) => {
      e.preventDefault();
      setTimeout(openMysteryModal, REDUCED_MOTION ? 0 : 110);
    });
  }
}

/**
 * About distill - the two About paragraphs collapse into the one sentence
 * hidden inside them (the red keyword fragments). Triggered by the ※ button
 * (mouse, keyboard or touch), by tapping the card on touch screens, or by
 * resting the mouse on the card for a few seconds.
 */
function initAboutHoverEffect() {
  const glassCard = document.querySelector('#about .glass-card');
  const toggle = glassCard && glassCard.querySelector('.about-distill');
  if (!glassCard) return;

  const DWELL_MS = 1000;   // fragments are red from the first moment (CSS :hover)
  const FADE_MS = 1500;
  const paragraphs = glassCard.querySelectorAll('p');
  const announcer = document.createElement('p');
  announcer.className = 'sr-only';
  announcer.setAttribute('aria-live', 'polite');
  glassCard.appendChild(announcer);

  let fadeTimer = null;
  let poemTimer = null;
  let isActivated = false;
  let mode = null; // 'hover' | 'toggle'
  let poemContainer = null;
  let clonedKeywords = [];
  let distillRun = 0; // bumps on every reset so stale timers do nothing

  // Group keyword fragments into lines and join them into readable text:
  // fragments that touch in the source (empath|y) join without a space.
  function buildLines() {
    const lines = {};
    glassCard.querySelectorAll('.about-keyword').forEach(kw => {
      (lines[kw.dataset.line] = lines[kw.dataset.line] || []).push(kw);
    });
    return Object.keys(lines).sort().map(n => {
      let text = '';
      const pieces = lines[n].map(kw => {
        let piece = kw.textContent.replace(/\s+/g, ' ');
        if (!text || text.endsWith(' ')) piece = piece.replace(/^ /, '');
        const start = text.length;
        text += piece;
        return { kw, piece, start };
      });
      return { text: text.trim(), pieces };
    });
  }

  function startDistill(nextMode) {
    if (isActivated || fadeTimer || poemTimer) return;
    mode = nextMode;
    if (toggle) toggle.setAttribute('aria-pressed', 'true');
    const fadeDelay = nextMode === 'hover' ? DWELL_MS : 0;
    const fadeLength = REDUCED_MOTION ? 0 : (nextMode === 'hover' ? FADE_MS : 900);

    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      glassCard.classList.add('text-fading');
      poemTimer = setTimeout(() => {
        poemTimer = null;
        isActivated = true;
        glassCard.classList.add('keywords-activated');
        animateToPoem();
      }, fadeLength);
    }, fadeDelay);
  }

  function resetDistill() {
    distillRun++;
    clearTimeout(fadeTimer);
    clearTimeout(poemTimer);
    fadeTimer = poemTimer = null;
    mode = null;
    if (toggle) toggle.setAttribute('aria-pressed', 'false');
    glassCard.classList.remove('text-fading', 'keywords-activated', 'keywords-poem');
    glassCard.style.height = '';
    glassCard.style.minHeight = '';
    clonedKeywords.forEach(el => el.remove());
    clonedKeywords = [];
    if (poemContainer) {
      poemContainer.remove();
      poemContainer = null;
    }
    paragraphs.forEach(p => {
      p.style.display = '';
      p.style.visibility = '';
    });
    glassCard.querySelectorAll('.about-keyword').forEach(kw => kw.style.visibility = '');
    announcer.textContent = '';
    isActivated = false;
  }

  // Mouse and pen: rest on the card. Touch: tap the card to toggle.
  glassCard.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'touch') startDistill('hover');
  });
  glassCard.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch' && mode === 'hover') resetDistill();
  });
  glassCard.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch' || e.target.closest('.about-distill')) return;
    if (mode) resetDistill();
    else startDistill('toggle');
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      if (mode === 'toggle') resetDistill();
      else {
        resetDistill();
        startDistill('toggle');
      }
    });
  }

  function animateToPoem() {
    const run = distillRun;
    const lines = buildLines();
    const cardRect = glassCard.getBoundingClientRect();

    // Lock the card height so the layout doesn't jump
    glassCard.style.height = cardRect.height + 'px';
    glassCard.style.minHeight = cardRect.height + 'px';

    poemContainer = document.createElement('div');
    poemContainer.className = 'poem-container';
    poemContainer.setAttribute('aria-hidden', 'true');
    lines.forEach(line => {
      const lineEl = document.createElement('div');
      lineEl.className = 'poem-line';
      lineEl.textContent = line.text;
      poemContainer.appendChild(lineEl);
    });

    const sentence = lines.map(l => l.text).join(' ');
    announcer.textContent = sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';

    paragraphs.forEach(p => p.style.visibility = 'hidden');
    glassCard.appendChild(poemContainer);

    if (REDUCED_MOTION) {
      glassCard.classList.add('keywords-poem');
      return;
    }

    // Measure final line positions without the tween-in offset
    const lineEls = Array.from(poemContainer.children);
    lineEls.forEach(el => el.style.animation = 'none');
    const lineRects = lineEls.map(el => el.getBoundingClientRect());
    poemContainer.style.display = 'none';

    const measure = document.createElement('span');
    measure.className = 'keyword-clone';
    measure.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:1.1rem;';
    glassCard.appendChild(measure);
    const widthOf = (text) => {
      measure.textContent = text;
      return measure.getBoundingClientRect().width;
    };

    lines.forEach((line, i) => {
      const lineRect = lineRects[i];
      const lineLeft = cardRect.left + (cardRect.width - widthOf(line.text)) / 2;
      line.pieces.forEach(({ kw, piece, start }) => {
        const from = kw.getBoundingClientRect();
        const clone = document.createElement('span');
        clone.className = 'keyword-clone';
        clone.setAttribute('aria-hidden', 'true');
        clone.textContent = piece;
        clone.style.cssText = `
          position: absolute;
          left: ${from.left - cardRect.left}px;
          top: ${from.top - cardRect.top}px;
          color: var(--accent-red-text);
          font-size: 1.1rem;
          font-weight: 400;
          transition: left 0.5s ease, top 0.5s ease;
          pointer-events: none;
          white-space: pre;
        `;
        clone.dataset.left = `${lineLeft - cardRect.left + widthOf(line.text.slice(0, start))}px`;
        clone.dataset.top = `${lineRect.top - cardRect.top}px`;
        glassCard.appendChild(clone);
        clonedKeywords.push(clone);
        kw.style.visibility = 'hidden';
      });
    });
    measure.remove();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (run !== distillRun) return;
        clonedKeywords.forEach(clone => {
          clone.style.left = clone.dataset.left;
          clone.style.top = clone.dataset.top;
        });
        setTimeout(() => {
          if (run === distillRun) glassCard.classList.add('keywords-poem');
        }, 550);
      });
    });
  }
}

/**
 * Mystery Card - Scroll reveal, special modal, and typewriter effect
 */
function initMysteryCard() {
  const mysteryCard = document.querySelector('.project-card--mystery');
  const mysteryModal = document.getElementById('mysteryModal');
  const mysteryCloseBtn = document.getElementById('mysteryModalClose');

  if (!mysteryCard || !mysteryModal) return;

  // Scroll reveal for mystery card
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(mysteryCard);

  // Close button handler
  if (mysteryCloseBtn) {
    mysteryCloseBtn.addEventListener('click', closeMysteryModal);
  }

  // Click outside to close
  mysteryModal.addEventListener('click', (e) => {
    if (e.target === mysteryModal) {
      closeMysteryModal();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mysteryModal.classList.contains('active')) {
      closeMysteryModal();
    }
  });
}

// Track timeouts to allow cancellation
window.mysteryTimeouts = [];

/**
 * Open mystery modal and start typewriter effect
 */
function openMysteryModal() {
  const mysteryModal = document.getElementById('mysteryModal');
  const paragraphs = mysteryModal.querySelectorAll('.mystery-modal__text p');

  mysteryModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  dialogFocus.open(mysteryModal);

  // Clear any existing timeouts to prevent overlapping typewriters
  if (window.mysteryTimeouts) {
    window.mysteryTimeouts.forEach(id => clearTimeout(id));
  }
  window.mysteryTimeouts = [];

  // Reset paragraphs
  paragraphs.forEach(p => {
    p.classList.remove('typing', 'complete');
    p.style.opacity = '0';
    // Store original HTML with spans
    if (!p.dataset.originalHtml) {
      p.dataset.originalHtml = p.innerHTML;
    }
    p.innerHTML = '';
  });

  // Reduced motion: show the whole text at once
  if (REDUCED_MOTION) {
    paragraphs.forEach(p => {
      p.innerHTML = p.dataset.originalHtml;
      p.classList.add('complete');
      p.style.opacity = '1';
    });
    return;
  }

  // Start typewriter effect after a short delay
  const startTimeout = setTimeout(() => {
    typewriteParagraphs(paragraphs, 0);
  }, 1500);
  window.mysteryTimeouts.push(startTimeout);
}

/**
 * Typewriter effect for paragraphs - Layout-preserving version
 * Renders all text invisibly first, then reveals character by character
 */
function typewriteParagraphs(paragraphs, index) {
  if (index >= paragraphs.length) return;

  const p = paragraphs[index];
  const originalHtml = p.dataset.originalHtml;

  p.classList.add('typing');
  p.style.opacity = '1';

  // Wrap each character in a span with invisible class, preserving existing HTML structure
  const wrappedHtml = wrapCharactersForReveal(originalHtml);
  p.innerHTML = wrappedHtml;

  // Get all character spans
  const charSpans = p.querySelectorAll('.mystery-char');
  let charIndex = 0;
  const speed = 25; // ms per character

  function revealChar() {
    if (charIndex < charSpans.length) {
      charSpans[charIndex].classList.add('revealed');
      charIndex++;
      const timeoutId = setTimeout(revealChar, speed);
      window.mysteryTimeouts.push(timeoutId);
    } else {
      // Paragraph complete - restore original HTML
      p.classList.remove('typing');
      p.classList.add('complete');
      p.innerHTML = originalHtml;

      // Start next paragraph after a pause
      const nextTimeout = setTimeout(() => {
        typewriteParagraphs(paragraphs, index + 1);
      }, 800);
      window.mysteryTimeouts.push(nextTimeout);
    }
  }

  revealChar();
}

/**
 * Wrap each character in a span for reveal animation, preserving HTML structure
 */
function wrapCharactersForReveal(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Wrap each character in a span
      const text = node.textContent;
      if (text.trim() === '') {
        return node; // Keep whitespace-only nodes as-is
      }

      const fragment = document.createDocumentFragment();
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === ' ' || char === '\n') {
          // Keep spaces and newlines visible for layout
          const span = document.createElement('span');
          span.className = 'mystery-char revealed';
          span.textContent = char;
          fragment.appendChild(span);
        } else {
          const span = document.createElement('span');
          span.className = 'mystery-char';
          span.textContent = char;
          fragment.appendChild(span);
        }
      }
      return fragment;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Process child nodes
      const children = Array.from(node.childNodes);
      node.innerHTML = '';
      children.forEach(child => {
        const processed = processNode(child);
        node.appendChild(processed);
      });
      return node;
    }
    return node;
  }

  const children = Array.from(tempDiv.childNodes);
  tempDiv.innerHTML = '';
  children.forEach(child => {
    const processed = processNode(child);
    tempDiv.appendChild(processed);
  });

  return tempDiv.innerHTML;
}

/**
 * Close mystery modal
 */
function closeMysteryModal() {
  const mysteryModal = document.getElementById('mysteryModal');
  mysteryModal.classList.remove('active');
  document.body.style.overflow = '';
  dialogFocus.close(mysteryModal);

  // Clear all typing timeouts
  if (window.mysteryTimeouts) {
    window.mysteryTimeouts.forEach(id => clearTimeout(id));
  }
  window.mysteryTimeouts = [];

  // Reset all content immediately
  const paragraphs = mysteryModal.querySelectorAll('.mystery-modal__text p');
  paragraphs.forEach(p => {
    p.classList.remove('typing', 'complete');
    p.style.opacity = '0';
    p.innerHTML = '';
  });
}

/**
 * Particle Field - Mouse-responsive background particles (Global)
 * Updated with Neo-Brutalist geometric shapes (crosses, squares)
 * & Swirl effect on Contact text hover
 */
function initParticleField() {
  const canvas = document.getElementById('globalParticles');
  if (!canvas) return;
  if (REDUCED_MOTION) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = -9999;
  let mouseY = -9999;
  let animationId;

  // Swirl target state
  let swirlActive = false;
  let swirlCenter = {
    x: 0,
    y: 0
  };
  const contactTitle = document.querySelector('#contact .section-title');

  // Particle configuration
  const config = {
    particleCount: window.innerWidth < 768 ? 20 : 40,
    particleColor: '#FF3333', // Accent red, about 1 in 10
    particleColorAlt: '#0A0A0A', // Ink
    linkRadius: 170, // lines only appear this close to the cursor
    linkDistance: 120,
    maxSize: 5,
    minSize: 2,
    speed: 0.4,
    mouseRadius: 200,
    mouseForce: 0.08,
    swirlForce: 0.0025, // Speed of attraction to swirl center (50% slower: 0.05 -> 0.025)
    swirlSpeed: 0.0020, // Rotation speed (50% slower: 0.005 -> 0.0025)
    swirlRadiusMin: 120, // Minimum orbit radius (creates empty center)
    swirlRadiusMax: 250, // Maximum orbit radius
    swirlEllipseRatio: 1.5 // Ellipse ratio (width/height)
  };

  // Resize canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }

  // Initialize particles
  function initParticles() {
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * (config.maxSize - config.minSize) + config.minSize,
        speedX: (Math.random() - 0.5) * config.speed,
        speedY: (Math.random() - 0.5) * config.speed,
        color: Math.random() < 0.1 ? config.particleColor : config.particleColorAlt,
        alpha: 0.22 + Math.random() * 0.14,
        shape: Math.random() > 0.6 ? 'cross' : (Math.random() > 0.5 ? 'square' : 'x'),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        angle: Math.random() * Math.PI * 2, // For swirl orbit
        radius: Math.random() * (config.swirlRadiusMax - config.swirlRadiusMin) + config.swirlRadiusMin // Donut range
      });
    }
  }

  // Bind hover events for swirl effect
  if (contactTitle) {
    contactTitle.addEventListener('mouseenter', () => {
      swirlActive = true;
      const rect = contactTitle.getBoundingClientRect();
      swirlCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });

    contactTitle.addEventListener('mouseleave', () => {
      swirlActive = false;
      // Give particles a little random push to disperse them naturally
      particles.forEach(p => {
        p.speedX = (Math.random() - 0.5) * 2;
        p.speedY = (Math.random() - 0.5) * 2;
      });
    });

    // Update swirl center on scroll/resize just in case
    window.addEventListener('scroll', () => {
      if (swirlActive) {
        const rect = contactTitle.getBoundingClientRect();
        swirlCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    });
  }

  // Update and draw particles
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      if (swirlActive) {
        // Swirl Logic - Elliptical Donut Pattern

        // Move towards the orbit path with elliptical shape
        // Horizontal radius is wider than vertical (ellipse)
        const targetX = swirlCenter.x + Math.cos(p.angle) * p.radius * config.swirlEllipseRatio;
        const targetY = swirlCenter.y + Math.sin(p.angle) * p.radius;

        // Easing towards that position
        p.x += (targetX - p.x) * config.swirlForce;
        p.y += (targetY - p.y) * config.swirlForce;

        // Orbit rotation (10% of original speed)
        p.angle += config.swirlSpeed;

      } else {
        // Normal Floating Logic

        // Calculate distance from mouse
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Apply mouse repulsion
        if (dist < config.mouseRadius && dist > 0) {
          const force = (config.mouseRadius - dist) / config.mouseRadius;
          p.speedX -= (dx / dist) * force * config.mouseForce;
          p.speedY -= (dy / dist) * force * config.mouseForce;
        }

        // Apply friction
        p.speedX *= 0.98;
        p.speedY *= 0.98;

        // Add random drift
        p.speedX += (Math.random() - 0.5) * 0.02;
        p.speedY += (Math.random() - 0.5) * 0.02;

        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      // Update rotation (always active)
      p.rotation += p.rotationSpeed;

      // Draw particle
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.color === config.particleColor ? 0.7 : p.alpha;
      ctx.lineWidth = 1.4;

      ctx.beginPath();

      if (p.shape === 'cross') {
        // Plus sign
        const s = p.size;
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.moveTo(0, -s);
        ctx.lineTo(0, s);
      } else if (p.shape === 'x') {
        // X shape
        const s = p.size * 0.8;
        ctx.moveTo(-s, -s);
        ctx.lineTo(s, s);
        ctx.moveTo(s, -s);
        ctx.lineTo(-s, s);
      } else {
        // Square
        const s = p.size;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
      }

      ctx.stroke();
      ctx.restore();
    });

    // Connecting lines only around the cursor, so the constellation is
    // something the visitor draws rather than a permanent background
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    const near = particles.filter(p => Math.hypot(p.x - mouseX, p.y - mouseY) < config.linkRadius);
    near.forEach((a, i) => {
      const closeness = 1 - Math.hypot(a.x - mouseX, a.y - mouseY) / config.linkRadius;
      ctx.strokeStyle = `rgba(10, 10, 10, ${(0.3 * closeness).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(mouseX, mouseY);
      ctx.stroke();
      near.slice(i + 1).forEach(b => {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < config.linkDistance) {
          ctx.strokeStyle = `rgba(255, 51, 51, ${(0.45 * (1 - dist / config.linkDistance) * closeness).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });
    });

    animationId = document.hidden ? null : requestAnimationFrame(animate);
  }

  // Pause while the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !animationId) animate();
  });

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    // Canvas is fixed, so client coordinates are sufficient
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Handle resize
  window.addEventListener('resize', resizeCanvas);

  // Initialize
  resizeCanvas();
  animate();
}

/**
 * Rotating Tagline - Cycles through inspirational phrases
 */
function initRotatingTagline() {
  const taglineEl = document.getElementById('heroTagline');
  if (!taglineEl) return;

  const taglines = [
    '→ I plant seeds knowing not all will bloom',
    '→ Creative leadership rooted in empathy, fluency, and flow',
    '→ Every project is a question. Design is how we listen',
    '→ I build worlds so others can find themselves within them'
  ];

  let currentIndex = 0;
  let paused = false;
  const interval = 5000; // 5 seconds between rotations

  // Reduced motion: keep the first line still
  if (REDUCED_MOTION) return;

  // Hold the current line while someone is reading it
  taglineEl.addEventListener('mouseenter', () => paused = true);
  taglineEl.addEventListener('mouseleave', () => paused = false);

  function rotateTagline() {
    if (paused || document.hidden) return;

    // Fade out
    taglineEl.classList.add('fade-out');

    setTimeout(() => {
      // Update text
      currentIndex = (currentIndex + 1) % taglines.length;
      taglineEl.textContent = taglines[currentIndex];

      // Fade in
      taglineEl.classList.remove('fade-out');
    }, 400);
  }

  // Start rotation after initial delay
  setTimeout(() => {
    setInterval(rotateTagline, interval);
  }, interval);
}

/**
 * Approach ledger - each principle expands to its proof
 */
function initApproach() {
  document.querySelectorAll('.approach-row__toggle').forEach(toggle => {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    });
  });
}

/**
 * Dot Navigation - Section progress indicator with scroll tracking
 */
function initDotNavigation() {
  const dots = document.querySelectorAll('.dot-nav__dot');
  const sections = ['featured', 'about', 'approach', 'experience', 'work', 'contact'];

  if (!dots.length) return;

  // Click handlers for dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const sectionId = dot.dataset.section;
      const section = document.getElementById(sectionId);
      if (section) {
        const navHeight = document.getElementById('nav').offsetHeight;
        window.scrollTo({
          top: section.getBoundingClientRect().top + window.scrollY - navHeight,
          behavior: REDUCED_MOTION ? 'auto' : 'smooth'
        });
      }
    });
  });

  // Update active dot based on scroll position
  function updateActiveDot() {
    const scrollPos = window.scrollY + window.innerHeight / 3;

    let activeSectionId = 'hero';
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section && section.offsetTop <= scrollPos) {
        activeSectionId = sectionId;
      }
    });

    dots.forEach(dot => {
      dot.classList.toggle('active', dot.dataset.section === activeSectionId);
    });
  }

  // Initial update
  updateActiveDot();

  // Update on scroll with throttle
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      updateActiveDot();
      scrollTimeout = null;
    }, 50);
  });
}

/**
 * Logo Cycling - Click to glitch and cycle through wavy line images
 * Easter Egg System - Progressive rewards for persistent clickers
 */
function initLogoCycling() {
  const navLogo = document.getElementById('navLogo');
  const logoImage = document.getElementById('logoImage');
  const logoMessage = document.getElementById('logoMessage');

  if (!navLogo || !logoImage) return;

  // Generate array of all 100 wavy line images
  const wavyLines = [];
  for (let i = 1; i <= 100; i++) {
    wavyLines.push(`images/WavyLineCircles/Wavy Line ${i}.png`);
  }

  // Start with index 6 (Wavy Line 7.png, zero-indexed)
  let currentIndex = 6;
  let clickCount = 0;
  let messageTimeout = null;
  let achievementContainer = null;
  let achievementFill = null;

  // Progressive messages aligned with portfolio philosophy
  const messages = {
    3: "...Oh? What you clicking this for?",
    //10: "...",
    15: "Curious one aren't you?",
    //25: " ",
    35: "Every click plants a seed... ",
    45: "wow, you've clicked 45 times...",
    //55: " ",
    65: "...what lies beyond the final seed?",
    //75: " ",
    //85: " ",
    95: "The final seed awaits..."
  };

  navLogo.addEventListener('click', (e) => {
    e.preventDefault();

    // Don't allow clicks after completion
    if (navLogo.classList.contains('completed')) return;

    clickCount++;

    // Add glitch class
    navLogo.classList.add('glitching');

    // Change image after glitch animation starts (200ms into the animation)
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % wavyLines.length;
      logoImage.src = wavyLines[currentIndex];
    }, 200);

    // Remove glitch class after animation completes
    setTimeout(() => {
      navLogo.classList.remove('glitching');
    }, 400);

    // Handle Easter egg progression
    handleEasterEgg(clickCount);
  });

  function handleEasterEgg(count) {
    // Show messages at milestones, with a jolt that grows each time
    if (messages[count]) {
      showMessage(messages[count]);
      const power = { 3: 4, 15: 6, 35: 9, 65: 12 }[count] || 6;
      shakeWorld(power);
      burstFrom(navLogo, 10 + power * 2);
    }

    // Create progress bar at 50 clicks
    if (count === 50) {
      createAchievementBar();
    }

    // Update progress bar from 50-100
    if (count >= 50 && count < 100) {
      updateProgressBar(count);
    }

    // Transform to button at 100 clicks
    if (count === 100) {
      transformToButton();
    }
  }

  function showMessage(text) {
    if (!logoMessage) return;

    // Clear existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }

    logoMessage.textContent = text;
    logoMessage.classList.add('visible', 'glitching');
    scrambleText(logoMessage, 600, () => {
      setTimeout(() => logoMessage.classList.remove('glitching'), 100);
    });

    // Fade out after 3 seconds
    messageTimeout = setTimeout(() => {
      logoMessage.classList.remove('visible');
    }, 3000);
  }

  function createAchievementBar() {
    // Create container
    achievementContainer = document.createElement('div');
    achievementContainer.className = 'achievement-container';
    achievementContainer.innerHTML = `
      <div class="achievement-label">Achievement Unlocked!</div>
      <div class="achievement-bar" id="achievementBar">
        <div class="achievement-fill" id="achievementFill"></div>
      </div>
    `;

    document.body.appendChild(achievementContainer);

    // Get fill element reference
    achievementFill = document.getElementById('achievementFill');

    // Show with fade-in
    setTimeout(() => {
      achievementContainer.classList.add('visible');
    }, 100);

    // Fade out label after 3 seconds
    setTimeout(() => {
      const label = achievementContainer.querySelector('.achievement-label');
      if (label) {
        label.classList.add('fade-out');
      }
    }, 3000);

    // Initial fill at 50%
    achievementFill.style.width = '0%';
  }

  function updateProgressBar(count) {
    if (!achievementFill) return;

    // Calculate percentage from 50 to 100 clicks
    const percentage = ((count - 50) / 50) * 100;
    achievementFill.style.width = `${percentage}%`;
  }

  function transformToButton() {
    if (!achievementContainer) return;

    const achievementBar = document.getElementById('achievementBar');
    if (!achievementBar) return;

    // Hide message if showing
    if (logoMessage) {
      logoMessage.classList.remove('visible');
    }

    // Get bar position for explosion origin
    const rect = achievementBar.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Trigger particle explosion
    createParticleExplosion(centerX, centerY);

    // Transform bar after explosion starts
    setTimeout(() => {
      // Make bar clickable (label stays red and visible above logo)
      achievementBar.classList.add('complete');
      achievementBar.style.cursor = 'pointer';
    }, 400);

    // Add click handler
    achievementBar.addEventListener('click', () => {
      openCelebrationModal();
    });
  }

  function createParticleExplosion(x, y) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = x + 'px';
    container.style.top = y + 'px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '200';
    document.body.appendChild(container);

    // Create 30 particles bursting outward
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'explosion-particle';

      // Calculate random angle and velocity
      const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.3;
      const velocity = 80 + Math.random() * 40;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;

      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');

      container.appendChild(particle);
    }

    // Remove after animation completes
    setTimeout(() => {
      container.remove();
    }, 1000);
  }
}


/**
 * Celebration Modal - Full-screen particle celebration with typewriter message
 */
function openCelebrationModal() {
  const modal = document.getElementById('celebrationModal');
  const canvas = document.getElementById('celebrationParticles');
  const textContainer = document.getElementById('celebrationText');
  const closeBtn = document.getElementById('celebrationClose');

  if (!modal || !canvas || !textContainer) return;

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  dialogFocus.open(modal);

  // Initialize particle animation
  if (!REDUCED_MOTION) initCelebrationParticles(canvas);

  // Prepare typewriter text
  const celebrationMessage = [
    "....",
    "Wow.",
    "",
    "I didn't expect to see you here.",
    "",
    "Design and Interactions can be so simple",
    "yet they can still captivate us,",
    "drawn in by our curiosity we want to see what could possibly be next.",
    "This desire connects us, makes us human.",
    "We create to connect to others, to send a part of us out into the world.",
    "",
    "Thank you for engaging and spending a moment with me."
  ];

  // Create paragraph elements
  textContainer.innerHTML = '';
  celebrationMessage.forEach(line => {
    const p = document.createElement('p');
    p.textContent = line;
    p.dataset.originalText = line;
    textContainer.appendChild(p);
  });

  // Start typewriter effect (reduced motion: show everything at once)
  if (REDUCED_MOTION) {
    textContainer.querySelectorAll('p').forEach(p => {
      p.classList.add('complete');
      p.style.opacity = '1';
    });
  } else {
    setTimeout(() => {
      typewriteCelebration(textContainer.querySelectorAll('p'), 0, celebrationRun);
    }, 1000);
  }

  // Close button handler (only way to close)
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCelebrationModal, { once: true });
  }
}


function closeCelebrationModal() {
  celebrationRun++;
  const modal = document.getElementById('celebrationModal');
  const navLogo = document.getElementById('navLogo');

  modal.classList.remove('active');
  document.body.style.overflow = '';
  dialogFocus.close(modal);

  // Transform logo to asterisk
  if (navLogo) {
    navLogo.classList.add('completed');
  }

  // Remove achievement bar
  const achievementContainer = document.querySelector('.achievement-container');
  if (achievementContainer) {
    achievementContainer.style.opacity = '0';
    setTimeout(() => {
      achievementContainer.remove();
    }, 500);
  }
}

/**
 * Typewriter effect for celebration text
 */
let celebrationRun = 0; // bumps on close so a running typewriter stops

function typewriteCelebration(paragraphs, index, run) {
  if (index >= paragraphs.length || run !== celebrationRun) return;

  const p = paragraphs[index];
  const text = p.dataset.originalText;

  // Skip empty paragraphs
  if (!text.trim()) {
    p.classList.add('complete');
    p.style.opacity = '1';
    setTimeout(() => {
      typewriteCelebration(paragraphs, index + 1, run);
    }, 200);
    return;
  }

  p.classList.add('typing');
  p.style.opacity = '1';
  p.textContent = '';

  let charIndex = 0;
  const speed = 30; // ms per character

  function typeChar() {
    if (run !== celebrationRun) return;
    if (charIndex < text.length) {
      p.textContent += text[charIndex];
      charIndex++;
      setTimeout(typeChar, speed);
    } else {
      // Paragraph complete
      p.classList.remove('typing');
      p.classList.add('complete');

      // Start next paragraph after pause
      setTimeout(() => {
        typewriteCelebration(paragraphs, index + 1, run);
      }, 400);
    }
  }

  typeChar();
}

/**
 * Celebration Particles - Dense star field animation
 */
function initCelebrationParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  // Resize canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  }

  // Initialize particles
  function initParticles() {
    particles = [];
    const colors = ['#FFFFFF', '#F5F5F0', '#FF3333'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.5
      });
    }
  }

  // Animate particles
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      // Update position
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around edges
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Draw connections
    particles.forEach((p1, i) => {
      particles.slice(i + 1, i + 10).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * (1 - dist / 120)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    animationId = requestAnimationFrame(animate);
  }

  // Initialize and start
  resizeCanvas();
  animate();

  // Resize handler
  window.addEventListener('resize', resizeCanvas);

  // Cleanup on modal close
  const modal = document.getElementById('celebrationModal');
  const observer = new MutationObserver(() => {
    if (!modal.classList.contains('active') && animationId) {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      observer.disconnect();
    }
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
}

/**
 * Seed garden - the hero's signature toy. A hand-drawn circle flips through
 * the 100 wavy-line textures as the pointer moves (or the page scrolls);
 * clicking empty hero space plants the current texture as an ink stamp.
 * Some seeds bloom. Most don't.
 */
function initSeedGarden() {
  const hero = document.getElementById('hero');
  const circle = document.getElementById('seedCircle');
  const garden = document.getElementById('seedGarden');
  const counter = document.getElementById('seedCounter');
  if (!hero || !circle || !garden) return;

  const INK = '#0A0A0A';
  const RED = '#FF3333';
  const FRAMES = 100;
  const COLS = 10;
  let FRAME_PX = 320;
  const FLIP_PX = 16;          // pointer travel per page turn
  const SEED_SIZE = 72;        // base planted size (CSS px)
  const BLOOM_CHANCE = 0.2;    // "not all will bloom"
  const RED_RATIO = 0.3;
  const GARDEN_CAP = 36;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const circleCtx = circle.getContext('2d');
  const gardenCtx = garden.getContext('2d');
  const redFrames = new Map();
  const seeds = [];
  let sheet = null;
  let frame = 6; // Wavy Line 7, the logo
  let travel = 0;
  let frozenUntil = 0;
  let lastX = null;
  let lastY = null;
  let planted = 0;
  let bloomed = 0;
  let gardenRAF = 0;

  // Until the sprite arrives, the circle shows the logo frame
  const logoFrame = new Image();
  logoFrame.src = 'images/WavyLineCircles/Wavy Line 7.png';
  logoFrame.onload = () => {
    if (sheet) return;
    // The PNG is white line art; recolour it to ink
    circleCtx.clearRect(0, 0, circle.width, circle.height);
    circleCtx.drawImage(logoFrame, circle.width * 0.01, circle.height * 0.01, circle.width * 0.98, circle.height * 0.98);
    circleCtx.globalCompositeOperation = 'source-in';
    circleCtx.fillStyle = INK;
    circleCtx.fillRect(0, 0, circle.width, circle.height);
    circleCtx.globalCompositeOperation = 'source-over';
  };

  // The sprite stores each texture as luminance; turn it into ink with alpha.
  // It loads after the page does (smaller sheet on small screens).
  const sprite = new Image();
  const loadSprite = () => {
    sprite.src = window.innerWidth < 860 ? 'images/seeds-sprite-sm.webp' : 'images/seeds-sprite.webp';
  };
  if (document.readyState === 'complete') loadSprite();
  else window.addEventListener('load', loadSprite, { once: true });
  sprite.onload = () => {
    FRAME_PX = sprite.width / COLS;
    const c = document.createElement('canvas');
    c.width = sprite.width;
    c.height = sprite.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(sprite, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i];
      px[i] = px[i + 1] = px[i + 2] = 10;
      px[i + 3] = a;
    }
    x.putImageData(data, 0, 0);
    sheet = c;
    drawCircle();
  };

  function redFrame(f) {
    if (!redFrames.has(f)) {
      const c = document.createElement('canvas');
      c.width = c.height = FRAME_PX;
      const x = c.getContext('2d');
      x.drawImage(sheet, (f % COLS) * FRAME_PX, Math.floor(f / COLS) * FRAME_PX, FRAME_PX, FRAME_PX, 0, 0, FRAME_PX, FRAME_PX);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = RED;
      x.fillRect(0, 0, FRAME_PX, FRAME_PX);
      redFrames.set(f, c);
    }
    return redFrames.get(f);
  }

  function drawFrame(ctx, f, color, cx, cy, size) {
    if (!sheet) return;
    const h = size / 2;
    if (color === RED) ctx.drawImage(redFrame(f), cx - h, cy - h, size, size);
    else ctx.drawImage(sheet, (f % COLS) * FRAME_PX, Math.floor(f / COLS) * FRAME_PX, FRAME_PX, FRAME_PX, cx - h, cy - h, size, size);
  }

  function drawCircle() {
    circleCtx.clearRect(0, 0, circle.width, circle.height);
    drawFrame(circleCtx, frame, INK, circle.width / 2, circle.height / 2, circle.width * 0.98);
  }

  function turnPages(distance) {
    if (REDUCED_MOTION || performance.now() < frozenUntil) return;
    travel += distance;
    if (travel < FLIP_PX) return;
    const steps = Math.floor(travel / FLIP_PX);
    travel -= steps * FLIP_PX;
    frame = (frame + steps) % FRAMES;
    drawCircle();
  }

  // The circle leans with the pointer's horizontal speed
  let lean = 0;
  let leanTarget = 0;
  let leanRAF = 0;
  function kickLean() {
    if (leanRAF) return;
    const step = () => {
      lean += (leanTarget - lean) * 0.18;
      leanTarget *= 0.86;
      circle.style.transform = `rotate(${lean.toFixed(2)}deg)`;
      if (Math.abs(lean) > 0.05 || Math.abs(leanTarget) > 0.05) {
        leanRAF = requestAnimationFrame(step);
      } else {
        circle.style.transform = '';
        lean = 0;
        leanRAF = 0;
      }
    };
    leanRAF = requestAnimationFrame(step);
  }

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (lastX !== null) {
      const dx = e.clientX - lastX;
      turnPages(Math.hypot(dx, e.clientY - lastY));
      if (!REDUCED_MOTION) {
        leanTarget = Math.max(-7, Math.min(7, dx * 0.35));
        kickLean();
      }
    }
    lastX = e.clientX;
    lastY = e.clientY;
  });
  hero.addEventListener('pointerleave', () => { lastX = lastY = null; });

  // Scrolling turns the pages too (the main way on touch screens)
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    if (hero.getBoundingClientRect().bottom > 0) turnPages(Math.abs(dy) * 0.6);
  }, { passive: true });

  function sizeCanvases() {
    const c = circle.getBoundingClientRect();
    circle.width = Math.round(c.width * DPR);
    circle.height = Math.round(c.height * DPR);
    drawCircle();
    const h = hero.getBoundingClientRect();
    garden.width = Math.round(h.width * DPR);
    garden.height = Math.round(h.height * DPR);
    renderGarden(performance.now());
  }
  window.addEventListener('resize', sizeCanvases);
  sizeCanvases();

  const easeOutBack = (t) => 1 + 3.2 * Math.pow(t - 1, 3) + 2.2 * Math.pow(t - 1, 2);
  const rand = (a, b) => a + Math.random() * (b - a);

  function makeBloom(now) {
    const n = 11 + Math.floor(Math.random() * 6);
    return {
      at: now + rand(550, 1100),
      petals: Array.from({ length: n }, (_, i) => ({
        a: (i / n) * Math.PI * 2 + rand(-0.12, 0.12),
        l: rand(0.28, 0.5),
        w: rand(0.2, 0.5)
      }))
    };
  }

  function plant(x, y) {
    const now = performance.now();
    seeds.push({
      x, y,
      f: frame,
      size: SEED_SIZE * rand(0.7, 1.3) * (window.innerWidth < 600 ? 0.6 : 1),
      color: Math.random() < RED_RATIO ? RED : INK,
      rot: rand(-0.45, 0.45),
      t0: now,
      splat: Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => ({
        a: rand(0, Math.PI * 2), r: rand(0.55, 0.85), s: rand(0.8, 2)
      })),
      bloom: Math.random() < BLOOM_CHANCE ? makeBloom(now) : null
    });
    planted++;
    const living = seeds.filter(seed => !seed.fadeStart);
    if (living.length > GARDEN_CAP) living[0].fadeStart = now;

    // Next seed is a different texture; brief hit-stop and squash on the circle
    frame = (frame + 1) % FRAMES;
    drawCircle();
    frozenUntil = now + 80;
    if (!REDUCED_MOTION) {
      circle.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(.9, .86)', offset: 0.25 },
        { transform: 'scale(1.05)', offset: 0.6 },
        { transform: 'scale(1)' }
      ], { duration: 320, easing: 'ease-out' });
    }
    updateCounter();
    if (!gardenRAF) gardenRAF = requestAnimationFrame(tick);
  }

  function updateCounter() {
    if (!counter) return;
    const pad = (n) => String(n).padStart(2, '0');
    counter.innerHTML = `SEEDS ${pad(planted)} · BLOOMED <em>${pad(bloomed)}</em>`;
    counter.classList.add('is-visible');
  }

  function tick(now) {
    gardenRAF = 0;
    if (renderGarden(now)) gardenRAF = requestAnimationFrame(tick);
  }

  function renderGarden(now) {
    const ctx = gardenCtx;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, garden.width, garden.height);
    let busy = false;

    for (let i = seeds.length - 1; i >= 0; i--) {
      if (seeds[i].fadeStart && now - seeds[i].fadeStart >= 400) seeds.splice(i, 1);
    }

    seeds.forEach(s => {
      const t = REDUCED_MOTION ? 1 : Math.min(1, (now - s.t0) / 300);
      if (t < 1) busy = true;
      let bt = 0;
      if (s.bloom) {
        if (now < s.bloom.at) busy = true;
        else {
          bt = REDUCED_MOTION ? 1 : Math.min(1, (now - s.bloom.at) / 750);
          if (bt < 1) busy = true;
          if (!s.bloom.counted) {
            s.bloom.counted = true;
            bloomed++;
            updateCounter();
          }
        }
      }
      if (s.fadeStart) busy = true;

      const scale = t < 1 ? easeOutBack(t) : 1;
      const grow = bt > 0 ? 1 + 0.28 * easeOutBack(bt) : 1;
      const squash = t < 1 ? 1 + 0.12 * Math.sin(t * Math.PI) : 1;
      const alpha = s.fadeStart ? 1 - Math.min(1, (now - s.fadeStart) / 400) : 1;

      ctx.save();
      ctx.globalAlpha = alpha * 0.92;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot + bt * 0.25);
      ctx.scale(scale * grow * squash, scale * grow / squash);

      if (bt > 0) {
        const e = easeOutBack(bt);
        ctx.strokeStyle = RED;
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.5;
        s.bloom.petals.forEach(p => {
          const r0 = s.size * 0.5;
          const r1 = r0 + s.size * p.l * e;
          const ax = Math.cos(p.a);
          const ay = Math.sin(p.a);
          const bend = s.size * 0.06 * p.w;
          ctx.beginPath();
          ctx.moveTo(ax * r0, ay * r0);
          ctx.quadraticCurveTo(ax * (r0 + r1) / 2 - ay * bend, ay * (r0 + r1) / 2 + ax * bend, ax * r1, ay * r1);
          ctx.stroke();
        });
      }

      const color = bt > 0.35 ? RED : s.color;
      drawFrame(ctx, s.f, color, 0, 0, s.size);

      // Ink splatter
      if (t > 0.3) {
        ctx.fillStyle = color;
        s.splat.forEach(d => {
          ctx.beginPath();
          ctx.arc(Math.cos(d.a) * s.size * d.r * 0.9, Math.sin(d.a) * s.size * d.r * 0.9,
            d.s * Math.min(1, (t - 0.3) * 3), 0, Math.PI * 2);
          ctx.fill();
        });
      }
      ctx.restore();
    });
    return busy;
  }

  hero.addEventListener('click', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('a, button, h1, p, .hero__label, .hero__meta')) return;
    const r = hero.getBoundingClientRect();
    plant(e.clientX - r.left, e.clientY - r.top);
  });
}

/**
 * Game feel - cards squash when pressed, hero buttons recoil, and the logo
 * easter egg shakes the page at its milestones.
 */
function initGameFeel() {
  if (REDUCED_MOTION) return;

  document.querySelectorAll('.project-card, .featured-card').forEach(card => {
    let press = null;
    const release = () => {
      if (!press) return;
      press.cancel();
      press = null;
      card.animate([
        { transform: 'translate(2px, 3px) scale(.965, .95)' },
        { transform: 'scale(1.025, 1.035)', offset: 0.45 },
        { transform: 'none' }
      ], { duration: 260, easing: 'cubic-bezier(.2, .8, .3, 1)' });
    };
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      press = card.animate([
        { transform: 'none' },
        { transform: 'translate(2px, 3px) scale(.965, .95)' }
      ], { duration: 70, easing: 'ease-out', fill: 'forwards' });
    });
    card.addEventListener('pointerup', () => setTimeout(release, 70));
    card.addEventListener('pointerleave', release);
    card.addEventListener('pointercancel', release);
  });

  document.querySelectorAll('[data-recoil]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.animate([
        { transform: 'none' },
        { transform: 'translate(-7px, 3px) rotate(-2.5deg)', offset: 0.12 },
        { transform: 'translate(2px, -1px) rotate(.6deg)', offset: 0.45 },
        { transform: 'none' }
      ], { duration: 300, easing: 'ease-out' });
    });
  });
}

/** Shake the page content; strength in px */
function shakeWorld(power) {
  const world = document.getElementById('main');
  if (!world || REDUCED_MOTION) return;
  const frames = [];
  for (let i = 0; i <= 8; i++) {
    const k = (1 - i / 8) * power;
    frames.push({ transform: `translate(${(Math.random() * 2 - 1) * k}px, ${(Math.random() * 2 - 1) * k}px)` });
  }
  frames.push({ transform: 'none' });
  world.animate(frames, { duration: 320, easing: 'linear' });
}

/** Burst small red squares and ink crosses out of an element */
function burstFrom(el, count) {
  if (!el || REDUCED_MOTION) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('span');
    bit.className = 'burst-bit' + (Math.random() < 0.4 ? ' burst-bit--cross' : '');
    bit.style.left = `${cx}px`;
    bit.style.top = `${cy}px`;
    document.body.appendChild(bit);
    const a = Math.random() * Math.PI * 2;
    const v = 50 + Math.random() * 90;
    bit.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v + 30}px) rotate(${Math.random() * 360 - 180}deg) scale(.4)`, opacity: 0 }
    ], { duration: 500 + Math.random() * 300, easing: 'cubic-bezier(.2, .7, .3, 1)' }).onfinish = () => bit.remove();
  }
}

/**
 * Touch screens have no hover, so card art turns to colour while the card
 * sits in the middle of the screen instead.
 */
function initCardCentering() {
  const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (!touch) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.target.classList.toggle('is-centered', entry.isIntersecting));
  }, { rootMargin: '-42% 0px -42% 0px' });
  document.querySelectorAll('.featured-card, .project-card').forEach(card => observer.observe(card));
}
