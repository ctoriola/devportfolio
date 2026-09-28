(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 80}ms`;
    io.observe(el);
  });

  // Counters
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.dec || '0', 10);
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const dur = reduce ? 0 : 1800;
      const tick = (now) => {
        const p = dur ? Math.min((now - start) / dur, 1) : 1;
        const v = target * (1 - Math.pow(1 - p, 4));
        el.textContent = v.toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countIO.observe(el));

  // Nav: pill docks beside the CTA, glides to centre on scroll
  const nav = document.querySelector('.nav');
  const pill = nav.querySelector('.nav-pill');
  const cta = nav.querySelector('.nav-cta');
  // Docked beside the CTA at the top; centred once the page scrolls
  const placePill = () => {
    if (innerWidth <= 900) { pill.style.left = ''; return; }
    const docked = cta.offsetLeft - pill.offsetWidth - 8;
    const centred = (innerWidth - pill.offsetWidth) / 2;
    pill.style.left = `${nav.classList.contains('scrolled') ? centred : docked}px`;
  };
  addEventListener('resize', placePill);
  setTimeout(() => nav.classList.add('ready'), 350);

  // Split page titles into animated characters
  document.querySelectorAll('[data-split]').forEach((el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((c, i) =>
      `<span class="ch" aria-hidden="true"><i style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</i></span>`).join('');
  });

  // Page transitions between internal pages
  document.querySelectorAll('a[href$=".html"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || reduce) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(() => { location.href = a.href; }, 320);
    });
  });
  addEventListener('pageshow', () => document.body.classList.remove('leaving'));

  // Big type scroll-driven motion
  const rows = [...document.querySelectorAll('.bigtype-row')];

  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    placePill();

    if (!reduce) {
      rows.forEach((row) => {
        const r = row.parentElement.getBoundingClientRect();
        const progress = (innerHeight - r.top) / (innerHeight + r.height);
        const dir = parseFloat(row.dataset.dir);
        row.style.transform = `translateX(${dir * (progress * 30 - 15) - 20}%)`;
      });
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Card tilt + glow follow
  if (!reduce && matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 4}deg) rotateY(${(x - 0.5) * 4}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  // Background: glowing flowing lines + floating numbers
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
  };
  resize();
  addEventListener('resize', resize);

  const particles = Array.from({ length: 50 }, () => ({
    x: Math.random(), y: Math.random(), s: Math.random() * 1.4 + 0.3, v: Math.random() * 0.0004 + 0.0001,
  }));

  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    const scrollP = scrollY / Math.max(document.body.scrollHeight - innerHeight, 1);

    // flowing lines
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      const amp = h * (0.08 + k * 0.03);
      const off = t * 0.00015 * (k + 1) + scrollP * 6;
      for (let x = 0; x <= w; x += 12 * dpr) {
        const nx = x / w;
        const y = h * (0.55 + k * 0.08 - scrollP * 0.3) + Math.sin(nx * 3.2 + off + k) * amp + Math.sin(nx * 7 - off) * amp * 0.25;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      const a = 0.12 - k * 0.03;
      ctx.strokeStyle = `rgba(92,240,138,${a})`;
      ctx.lineWidth = (2 - k * 0.5) * dpr;
      ctx.shadowColor = 'rgba(92,240,138,.8)';
      ctx.shadowBlur = 18 * dpr;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // dust
    particles.forEach((p) => {
      p.y -= p.v;
      if (p.y < 0) p.y = 1;
      ctx.fillStyle = 'rgba(184,255,204,.35)';
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.s * dpr, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduce) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  // Footer clock (West Africa Time)
  const clocks = document.querySelectorAll('#clock, [data-clock]');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
  const updateClock = () => { clocks.forEach((c) => { c.textContent = fmt.format(new Date()); }); };
  updateClock();
  setInterval(updateClock, 30000);
  document.getElementById('yr').textContent = new Date().getFullYear();
})();
