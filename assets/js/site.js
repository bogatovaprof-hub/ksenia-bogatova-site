(() => {
  'use strict';
  const config = window.SITE_CONFIG || {};
  const configuredText = (value) => typeof value === 'string' && value.trim() && !/[\[\]{}]/.test(value) ? value.trim() : '';

  // Only confirmed HTTPS contact links are eligible for external navigation.
  const safeMaxUrl = (value) => {
    const text = configuredText(value);
    if (!text) return '';
    try {
      const url = new URL(text);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  };
  const safeEmail = (value) => {
    const text = configuredText(value);
    return /^[a-zA-Z0-9.!#$&'*+\/=^_\x60{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(text) ? text : '';
  };
  const maxUrl = safeMaxUrl(config.maxUrl);
  const email = safeEmail(config.email);

  const setExternal = (link, href) => {
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.hidden = false;
  };
  if (maxUrl) {
    document.querySelectorAll('[data-contact-max]').forEach((link) => setExternal(link, maxUrl));
    document.querySelectorAll('[data-max-placeholder]').forEach((element) => { element.hidden = true; });
    document.querySelectorAll('[data-footer-max]').forEach((element) => {
      const link = document.createElement('a');
      link.textContent = 'Написать в MAX';
      setExternal(link, maxUrl);
      element.replaceChildren(link);
    });
  }
  if (email) {
    const mailto = 'mailto:' + encodeURIComponent(email).replace('%40', '@');
    document.querySelectorAll('[data-contact-email]').forEach((link) => { link.href = mailto; link.hidden = false; });
    document.querySelectorAll('[data-email-placeholder]').forEach((element) => { element.hidden = true; });
    document.querySelectorAll('[data-footer-email]').forEach((element) => {
      const link = document.createElement('a');
      link.textContent = email;
      link.href = mailto;
      element.replaceChildren(link);
    });
  }
  document.querySelectorAll('[data-legal]').forEach((element) => {
    const key = element.dataset.legal;
    const value = key === 'email' ? email : configuredText(config[key]);
    if (value) element.textContent = value;
  });

  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    const summary = menu.querySelector('summary');
    summary.setAttribute('aria-expanded', String(menu.open));
    const closeMenu = (returnFocus = false) => {
      menu.open = false;
      summary.setAttribute('aria-expanded', 'false');
      if (returnFocus) summary.focus();
    };
    menu.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(menu.open)));
    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeMenu();
        const target = document.getElementById(link.hash.slice(1));
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        }
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) { event.preventDefault(); closeMenu(true); }
    });
    document.addEventListener('click', (event) => { if (menu.open && !menu.contains(event.target)) closeMenu(); });
    const desktop = window.matchMedia('(min-width: 960px)');
    desktop.addEventListener('change', (event) => { if (event.matches) closeMenu(); });
  }

  const questions = [...document.querySelectorAll('.question-details')];
  questions.forEach((current) => {
    current.addEventListener('toggle', () => {
      if (current.open) questions.forEach((other) => { if (other !== current) other.open = false; });
    });
  });

  const initSystemCycle = () => {
    const cycle = document.querySelector('[data-system-cycle]');
    if (!cycle) return;
    const find = (name) => cycle.querySelector('[data-cycle-' + name + ']');
    const source = [...cycle.querySelectorAll('[data-cycle-source]')].map((item) => ({
      title: item.querySelector('h3')?.textContent,
      body: item.querySelector('[data-stage-body]')?.textContent,
      output: item.querySelector('[data-stage-output]')?.textContent
    }));
    const nodes = [...cycle.querySelectorAll('[data-cycle-step]')];
    const routes = [...cycle.querySelectorAll('[data-cycle-route]')];
    const parts = Object.fromEntries(['interactive', 'fallback', 'signal', 'center', 'center-count', 'count', 'title', 'body', 'output', 'play', 'play-label', 'next', 'reset', 'progress', 'status', 'instruction'].map((name) => [name, find(name)]));
    // Only replace the readable four-step fallback after the whole widget is ready.
    if (source.length !== 4 || nodes.length !== 4 || routes.length !== 4 || Object.values(parts).some((part) => !part) || source.some((step) => !step.title || !step.body || !step.output)) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stageDuration = 4800;
    let selected = 0;
    let elapsed = 0;
    let turns = 0;
    let playing = false;
    let completed = false;
    let frame = 0;
    let previousTime = null;
    let observer;

    const draw = () => {
      const fraction = Math.min(elapsed / stageDuration, 1);
      const angle = turns * 360 + (selected + fraction) * 90;
      parts.signal.style.transform = 'rotate(' + angle + 'deg)';
      routes.forEach((route, index) => {
        route.style.strokeDashoffset = String(completed || index < selected ? 0 : index === selected ? 100 * (1 - fraction) : 100);
      });
      parts.progress.style.transform = 'scaleX(' + (completed ? 1 : (selected + fraction) / 4) + ')';
    };
    const render = () => {
      const step = source[selected];
      const number = String(selected + 1).padStart(2, '0');
      nodes.forEach((node, index) => node.setAttribute('aria-pressed', String(index === selected)));
      parts.center.textContent = completed ? 'Следующий цикл' : step.title;
      parts['center-count'].textContent = completed ? 'Факт → новый вопрос' : number + ' / 04';
      parts.count.textContent = completed ? 'Показ завершён' : 'Этап ' + number + ' из 04';
      parts.title.textContent = completed ? 'Возвращаемся к вопросу' : step.title;
      parts.body.textContent = completed ? 'Фактический результат становится данными следующего цикла.' : step.body;
      parts.output.textContent = completed ? 'Уточняем вопрос собственника с учётом полученного результата.' : step.output;
      cycle.dataset.playing = String(playing);
      parts['play-label'].textContent = playing ? 'Пауза' : completed ? 'Показать ещё раз' : elapsed > 0 ? 'Продолжить' : 'Показать цикл';
      parts.status.textContent = completed ? 'Цикл замкнулся: факт возвращается к вопросу собственника.' : (playing ? 'Показываем' : 'Выбран') + ' этап ' + (selected + 1) + ' из 4: ' + step.title + '.';
    };
    const pause = () => {
      if (!playing) return;
      playing = false;
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = null;
      render();
      parts.status.textContent = 'На паузе. Этап ' + (selected + 1) + ' из 4: ' + source[selected].title + '.';
    };
    const select = (index) => {
      pause();
      if (index < selected) turns++;
      selected = index;
      elapsed = 0;
      completed = false;
      render();
      draw();
    };
    const tick = (time) => {
      if (!playing) return;
      if (previousTime !== null) elapsed += time - previousTime;
      previousTime = time;
      while (elapsed >= stageDuration) {
        elapsed -= stageDuration;
        if (selected === 3) {
          playing = false;
          completed = true;
          selected = 0;
          elapsed = 0;
          turns++;
          frame = 0;
          previousTime = null;
          render();
          draw();
          return;
        }
        selected++;
        render();
      }
      draw();
      frame = requestAnimationFrame(tick);
    };
    parts.play.addEventListener('click', () => {
      if (playing) { pause(); return; }
      if (reducedMotion.matches || document.hidden) return;
      if (completed) { selected = 0; elapsed = 0; completed = false; }
      playing = true;
      previousTime = null;
      render();
      draw();
      frame = requestAnimationFrame(tick);
    });
    parts.next.addEventListener('click', () => select(completed ? 0 : (selected + 1) % 4));
    parts.reset.addEventListener('click', () => select(0));
    nodes.forEach((node, index) => {
      node.addEventListener('click', () => select(index));
      node.addEventListener('keydown', (event) => {
        const target = { ArrowRight: (index + 1) % 4, ArrowDown: (index + 1) % 4, ArrowLeft: (index + 3) % 4, ArrowUp: (index + 3) % 4, Home: 0, End: 3 }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select(target);
        nodes[target].focus({ preventScroll: true });
      });
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    const updateMotion = () => {
      pause();
      observer?.disconnect();
      parts.play.hidden = reducedMotion.matches;
      parts.instruction.textContent = reducedMotion.matches ? 'Выберите этап на круге или нажмите «Дальше».' : 'Выберите этап на круге или запустите весь цикл.';
      if (!reducedMotion.matches && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => !entry.isIntersecting)) pause();
        });
        observer.observe(parts.interactive);
      }
    };
    render();
    draw();
    parts.interactive.hidden = false;
    parts.fallback.hidden = true;
    updateMotion();
    reducedMotion.addEventListener('change', updateMotion);
  };
  initSystemCycle();
  document.documentElement.classList.replace('no-js', 'js');
})();
