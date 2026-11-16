'use strict';
(() => {
  const root = document.documentElement;
  const header = document.querySelector('body > header:has(> .header-actions)');
  const promo = document.querySelector('body > .welcome-bar');
  const hero = document.querySelector('main > .atelier-hero');
  if (!header || !hero) return;
  const syncHeaderHeight = () => {
    const height = Math.ceil(header.getBoundingClientRect().height);
    if (height) root.style.setProperty('--camicat-header-height', height + 'px');
  };
  syncHeaderHeight();
  if ('ResizeObserver' in window) new ResizeObserver(syncHeaderHeight).observe(header);
  else window.addEventListener('resize', syncHeaderHeight, {passive: true});
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const canAnimate = () => !motion?.matches && !root.classList.contains('ambient-static');
  if (!location.hash && canAnimate()) hero.classList.add('atelier-opening');
  if (!('IntersectionObserver' in window)) return;
  if (promo) new IntersectionObserver(([entry]) => {
    header.classList.toggle('shop-header-raised', !entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
  }).observe(promo);
  const headings = document.querySelectorAll(
    '#catalogTitle,#customTitle,#threeInviteTitle,#fairTitle,#heartStoryTitle,#featureTitle,#styleStudioTitle,#guideTitle'
  );
  const chapters = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.target.closest('[hidden]')) continue;
      if (canAnimate() && !entry.target.contains(document.activeElement)) entry.target.classList.add('atelier-heading-arrival');
      chapters.unobserve(entry.target);
    }
  }, {threshold: .15, rootMargin:'0px 0px -20px'});
  headings.forEach(heading => chapters.observe(heading));
})();
