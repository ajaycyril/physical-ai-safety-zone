(() => {
  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('[data-progress]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Reveal content only as it becomes relevant.
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    revealObserver.observe(el);
  });

  let scrollY = window.scrollY;
  let targetScrollY = scrollY;
  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.5;
  let rafId = 0;

  const parallaxEls = [...document.querySelectorAll('[data-parallax]')];
  const titleLines = [...document.querySelectorAll('.title-line')];
  const hero = document.querySelector('.hero');
  const stackStage = document.querySelector('[data-stack-stage]');
  const stackCards = [...document.querySelectorAll('[data-stack-card]')];
  const roadmap = document.querySelector('[data-roadmap]');
  const roadmapProgress = document.querySelector('[data-roadmap-progress]');

  const updateScroll = () => {
    targetScrollY = window.scrollY;
    header?.classList.toggle('is-scrolled', targetScrollY > 24);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = targetScrollY / maxScroll;
    root.style.setProperty('--progress', p.toFixed(5));
  };

  const render = () => {
    scrollY = reducedMotion ? targetScrollY : lerp(scrollY, targetScrollY, 0.095);

    if (!reducedMotion) {
      parallaxEls.forEach((el) => {
        const speed = Number(el.dataset.parallax || 0);
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height * 0.5 - window.innerHeight * 0.5) * speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });

      if (hero) {
        const heroRect = hero.getBoundingClientRect();
        const heroTravel = Math.max(1, hero.offsetHeight - window.innerHeight);
        const hp = clamp(-heroRect.top / heroTravel);
        root.style.setProperty('--hero-progress', hp.toFixed(4));
        titleLines.forEach((line, i) => {
          const direction = Number(line.dataset.shift || 0);
          const x = direction * hp * Math.min(window.innerWidth * 0.095, 135);
          const y = hp * (i - 1.5) * -7;
          line.style.setProperty('--hero-shift', `${x}px`);
          line.style.setProperty('--hero-y', `${y}px`);
          line.style.setProperty('--hero-opacity', `${1 - hp * 0.67}`);
        });
      }

      if (stackStage && window.innerWidth > 900) {
        const stageRect = stackStage.getBoundingClientRect();
        const stageHeight = stackStage.offsetHeight - window.innerHeight * 0.58;
        const stageP = clamp(-stageRect.top / Math.max(1, stageHeight));
        stackCards.forEach((card, index) => {
          const start = index / Math.max(1, stackCards.length - 1) * 0.75;
          const local = clamp((stageP - start) / 0.35);
          const cardsAbove = Math.max(0, stageP * stackCards.length - index);
          const scale = 1 - clamp(cardsAbove / stackCards.length) * 0.06;
          const y = Math.max(0, index - stageP * stackCards.length) * 10;
          card.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
          card.style.filter = `saturate(${1 - Math.min(cardsAbove * .08, .24)}) brightness(${1 - Math.min(cardsAbove * .05, .16)})`;
          card.style.zIndex = String(10 + index);
          card.style.opacity = String(1 - Math.max(0, cardsAbove - 2.2) * .12);
        });
      }

      if (roadmap && roadmapProgress) {
        const rect = roadmap.getBoundingClientRect();
        const p = clamp((window.innerHeight * .45 - rect.top) / Math.max(1, rect.height - window.innerHeight * .25));
        roadmap.style.setProperty('--roadmap-progress', p.toFixed(4));
      }
    }

    rafId = requestAnimationFrame(render);
  };

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();
  rafId = requestAnimationFrame(render);

  // Custom cursor on precise pointers only.
  const cursor = document.querySelector('.cursor');
  if (cursor && !touch && !reducedMotion) {
    window.addEventListener('pointermove', (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
    }, { passive: true });
    document.querySelectorAll('a, button, [tabindex="0"], .loop-card, .system-card, .contract-card, .raas-layer').forEach((el) => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-active'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
    });
    document.addEventListener('pointerleave', () => { cursor.style.opacity = '0'; });
    document.addEventListener('pointerenter', () => { cursor.style.opacity = '1'; });
  }

  // Living fabric canvas — an original, lightweight spatial network.
  const canvas = document.getElementById('fabric-canvas');
  const ctx = canvas?.getContext('2d', { alpha: true });
  let width = 0;
  let height = 0;
  let dpr = 1;
  let points = [];

  const palette = [
    [242, 168, 216],
    [164, 154, 248],
    [135, 174, 248],
    [255, 255, 255]
  ];

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const targetCount = Math.max(22, Math.min(touch ? 42 : 78, Math.floor(width * height / 21000)));
    points = Array.from({ length: targetCount }, (_, i) => {
      const color = palette[i % palette.length];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .12,
        vy: (Math.random() - .5) * .12,
        r: Math.random() * 1.6 + .45,
        depth: Math.random() * .8 + .2,
        color
      };
    });
  }

  function drawFabric(time = 0) {
    if (!canvas || !ctx || reducedMotion) return;
    ctx.clearRect(0, 0, width, height);
    const mouseRadius = touch ? 0 : 210;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.x += p.vx * p.depth;
      p.y += p.vy * p.depth;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      if (!touch) {
        const dxm = p.x - pointerX;
        const dym = p.y - pointerY;
        const dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < mouseRadius && dm > 0) {
          const force = (1 - dm / mouseRadius) * .055;
          p.x += (dxm / dm) * force;
          p.y += (dym / dm) * force;
        }
      }

      for (let j = i + 1; j < points.length; j++) {
        const q = points[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = touch ? 115 : 145;
        if (dist < maxDist) {
          const opacity = (1 - dist / maxDist) * .105 * Math.min(p.depth, q.depth);
          const gradient = ctx.createLinearGradient(p.x, p.y, q.x, q.y);
          gradient.addColorStop(0, `rgba(${p.color.join(',')},${opacity})`);
          gradient.addColorStop(1, `rgba(${q.color.join(',')},${opacity})`);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = .7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      const pulse = .75 + Math.sin(time * .00065 + i) * .25;
      ctx.fillStyle = `rgba(${p.color.join(',')},${(.28 + p.depth * .45) * pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(drawFabric);
  }

  if (canvas && ctx && !reducedMotion) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    requestAnimationFrame(drawFabric);
  }

  // Keep anchor navigation accessible while accounting for the fixed header.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 68;
      window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  window.addEventListener('pagehide', () => cancelAnimationFrame(rafId), { once: true });
})();
