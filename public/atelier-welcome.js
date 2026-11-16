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
  const headings = document.querySelectorAll(
    '#catalogTitle,#customTitle,#threeInviteTitle,#fairTitle,#heartStoryTitle,#featureTitle,#styleStudioTitle,#guideTitle'
  );
  const ns = 'http://www.w3.org/2000/svg';
  const wireShapes = [
    'M2 8h20c12 0 17-2 17-5 0-2-6-2-6 2 0 5 8 7 15 4l10-2',
    'M2 8h20c10 0 11-6 15-6 7 0 2 11 9 11 3 0 6-3 12-5',
    'M2 8h18c8 0 10-7 17-7 5 0 7 11 2 12-4 2-5-7 1-7l18 2'
  ];
  headings.forEach((heading,index) => {
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 84 15');
    svg.setAttribute('class','atelier-wire-detail');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    for (const [i,d] of [wireShapes[index % wireShapes.length],'M58 8h23'].entries()) {
      const path = document.createElementNS(ns,'path');
      path.setAttribute('d',d);
      path.setAttribute('pathLength','1');
      if (i) path.setAttribute('class','wire-tail');
      svg.append(path);
    }
    heading.append(svg);
    heading.classList.add('atelier-wire-heading');
  });
  if (!('IntersectionObserver' in window)) return;
  if (promo) new IntersectionObserver(([entry]) => {
    header.classList.toggle('shop-header-raised', !entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
  }).observe(promo);
  const chapters = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.target.closest('[hidden]')) continue;
      if (canAnimate() && !entry.target.contains(document.activeElement)) entry.target.classList.add('atelier-heading-arrival');
      chapters.unobserve(entry.target);
    }
  }, {threshold: .15, rootMargin:'0px 0px -20px'});
  headings.forEach(heading => chapters.observe(heading));

  const isInteractive = node => node.contains(document.activeElement) || node.matches(':hover') ||
    node.closest('dialog[open]');
  const reveal = (node,delay=0) => {
    if (!canAnimate() || isInteractive(node)) return;
    node.style.setProperty('--camicat-visual-delay',delay+'ms');
    node.classList.add('atelier-visual-arrival');
    node.addEventListener('animationend',event => {
      if (event.target === node) node.classList.remove('atelier-visual-arrival');
    });
  };
  const pieces = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const node = entry.target;
      if (!entry.isIntersecting || node.closest('[hidden]')) continue;
      if (node.matches('#products,#featureProducts')) {
        const cards = [...node.children].slice(0,4);
        if (!cards.length) continue;
        cards.forEach((card,index) => reveal(card,index * 40));
      } else reveal(node);
      pieces.unobserve(node);
    }
  }, {threshold: 0, rootMargin:'0px 0px -42px'});
  document.querySelectorAll('#products,.custom-figure,.three-launch,.agenda-cards,.heart-story-body,#featureProducts,.studio-art,.atelier-folds,.mix-board,.guide-accordion')
    .forEach(node => pieces.observe(node));
})();
