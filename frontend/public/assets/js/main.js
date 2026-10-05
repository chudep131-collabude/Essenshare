/**
 * main.js — Global Surplus Redistribution Platform
 * Shared JS loaded on every page.
 * Handles: mobile nav toggle, active nav link, cookie notice, smooth scroll,
 *          keyboard trap for mobile menu.
 * No framework dependencies.
 */

'use strict';

/* ── Mobile Nav Toggle ──────────────────────────────────────────────────────── */

(function initMobileNav() {
  const toggle = document.getElementById('menu-toggle');
  const nav    = document.getElementById('site-nav');

  if (!toggle || !nav) return;

  function openMenu() {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    // Move focus to first nav link
    const firstLink = nav.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  function closeMenu() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  }

  function isOpen() {
    return nav.classList.contains('is-open');
  }

  toggle.addEventListener('click', function () {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      closeMenu();
      toggle.focus();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', function (e) {
    if (isOpen() && !nav.contains(e.target) && e.target !== toggle) {
      closeMenu();
    }
  });

  // Keyboard trap — keep focus inside mobile menu when open
  nav.addEventListener('keydown', function (e) {
    if (!isOpen() || e.key !== 'Tab') return;

    const focusableSelectors = 'a[href], button:not([disabled])';
    const focusable = Array.from(nav.querySelectorAll(focusableSelectors));
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if on first, wrap to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if on last, wrap to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
})();

/* ── Active Nav Link ────────────────────────────────────────────────────────── */

(function highlightActiveLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(function (link) {
    const href = link.getAttribute('href');
    if (!href) return;

    // Normalise — strip leading slash and trailing slash
    const normalHref    = href.replace(/^\//, '').replace(/\/$/, '') || 'index.html';
    const normalCurrent = currentPath.replace(/^\//, '').replace(/\/$/, '') || 'index.html';

    if (
      normalCurrent === normalHref ||
      (normalCurrent === '' && normalHref === 'index.html')
    ) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
})();

/* ── Cookie Notice ──────────────────────────────────────────────────────────── */

(function initCookieNotice() {
  var STORAGE_KEY = 'cookie_notice_dismissed';
  var notice = document.getElementById('cookie-notice');
  if (!notice) return;

  // Show only if not previously dismissed
  if (!localStorage.getItem(STORAGE_KEY)) {
    notice.classList.remove('is-hidden');
  }

  var dismissBtn = document.getElementById('cookie-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, '1');
      notice.classList.add('is-hidden');
    });
  }
})();

/* ── Smooth Scroll for anchor links ─────────────────────────────────────────── */

(function initSmoothScroll() {
  document.addEventListener('click', function (e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    var targetId = anchor.getAttribute('href').slice(1);
    if (!targetId) return;

    var target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Move focus for accessibility
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  });
})();
