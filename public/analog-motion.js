(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const main = document.querySelector('.an-main');
  const progress = document.createElement('div');
  progress.className = 'an-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  if (main) {
    const orbit = document.createElement('div');
    orbit.className = 'an-orbit';
    orbit.setAttribute('aria-hidden', 'true');
    main.prepend(orbit);
  }
  let queued = false;
  function paint() {
    queued = false;
    const range = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--read-progress', String(range > 0 ? scrollY / range : 0));
    if (main) main.style.setProperty('--orbit-y', `${reduced.matches ? 0 : Math.min(scrollY * .16, 180)}px`);
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, {passive:true});
  addEventListener('resize', paint);
  paint();
  if (!reduced.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.removeAttribute('data-pending'); observer.unobserve(entry.target); }
    }), {threshold:.05});
    document.querySelectorAll('.an-card,.an-row,.an-table,.partner-stack-card').forEach(el => {
      el.classList.add('an-reveal');
      if (el.getBoundingClientRect().top > innerHeight) { el.setAttribute('data-pending',''); observer.observe(el); }
    });
    reduced.addEventListener('change', () => { if (reduced.matches) { observer.disconnect(); document.querySelectorAll('[data-pending]').forEach(el => el.removeAttribute('data-pending')); } paint(); });
  }
  const tabs = [...document.querySelectorAll('[data-architecture-tab]')];
  const select = (name, updateURL = true) => {
    tabs.forEach(tab => {
      const active = tab.dataset.architectureTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
    if (updateURL) { const url = new URL(location.href); if (name === 'eand') url.searchParams.set('view','eand'); else url.searchParams.delete('view'); history.replaceState(null,'',url); }
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.architectureTab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus(); select(tabs[next].dataset.architectureTab);
    });
  });
  if (tabs.length) select(new URL(location.href).searchParams.get('view') === 'eand' ? 'eand' : 'architecture', false);
})();
