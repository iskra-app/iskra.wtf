// Общее для всех страниц: язык, фон шапки и (по желанию) появление блоков при прокрутке.
//
// Русский текст лежит прямо в разметке, у каждого переводимого места — ключ `data-i18n`
// (или `data-i18n-aria` для aria-label). Английский страница передаёт в `Site.init({ en })`.
// Язык: ?lang=… → выбор в подвале → язык браузера. Русский для ru, английский для остальных.
window.Site = (() => {
  let lang = 'ru';
  let onLanguage = () => {};
  const TEXT = { ru: {}, en: {} };

  function pickLanguage() {
    const forced = new URLSearchParams(location.search).get('lang');
    if (forced === 'ru' || forced === 'en') return forced;
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'ru' || saved === 'en') return saved;
    } catch {}
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^ru\b/i.test(first) ? 'ru' : 'en';
  }

  function apply(next) {
    lang = next;
    const t = TEXT[lang];
    document.documentElement.lang = lang;
    document.title = t['meta.title'];
    document.querySelector('meta[name="description"]').content = t['meta.description'];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = t[el.dataset.i18n];
      if (value !== undefined) el.innerHTML = value;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const value = t[el.dataset.i18nAria];
      if (value !== undefined) el.setAttribute('aria-label', value);
    });
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    onLanguage(lang);
  }

  // Фон шапки появляется, когда до неё доходит первый раздел (`data-nav-solid`).
  function watchNav() {
    const nav = document.getElementById('nav');
    const mark = document.querySelector('[data-nav-solid]');
    if (!nav || !mark) return;
    const update = () => nav.classList.toggle('is-solid', mark.getBoundingClientRect().top <= nav.offsetHeight);
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  }

  // Блоки разделов проявляются из размытия, когда доходят до экрана (включается `reveal: true`). Сетки и списки —
  // по элементу, лесенкой. После появления класс снимается, чтобы вернуть блокам свои переходы.
  function watchReveal() {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const groups = '.cards, .rules, .platforms, .steps';
    const targets = [];
    document.querySelectorAll('main .section > .wrap').forEach((wrap) => {
      [...wrap.children].forEach((el) => {
        if (el.matches(groups)) targets.push(...el.children);
        else targets.push(el);
      });
    });

    const show = (el, delay) => {
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      el.classList.add('is-shown');
      el.addEventListener('transitionend', function done(e) {
        if (e.target !== el || e.propertyName !== 'opacity') return;
        el.removeEventListener('transitionend', done);
        el.classList.remove('reveal', 'is-shown');
        el.style.removeProperty('--reveal-delay');
      });
    };

    const observer = new IntersectionObserver((entries) => {
      let step = 0;
      entries.forEach((entry) => {
        // Выше экрана (например, страницу открыли с середины) — показываем сразу.
        const above = entry.boundingClientRect.bottom < 0;
        if (!entry.isIntersecting && !above) return;
        observer.unobserve(entry.target);
        show(entry.target, above ? 0 : Math.min(step++, 5) * 90);
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    targets.forEach((el) => { el.classList.add('reveal'); observer.observe(el); });
  }

  function init({ en, onLanguage: callback, reveal = false }) {
    TEXT.en = en;
    TEXT.ru = {
      'meta.title': document.title,
      'meta.description': document.querySelector('meta[name="description"]').content,
    };
    document.querySelectorAll('[data-i18n]').forEach((el) => { TEXT.ru[el.dataset.i18n] = el.innerHTML; });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => { TEXT.ru[el.dataset.i18nAria] = el.getAttribute('aria-label'); });
    if (callback) onLanguage = callback;

    document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => {
      try { localStorage.setItem('lang', b.dataset.lang); } catch {}
      apply(b.dataset.lang);
    }));

    apply(pickLanguage());
    watchNav();
    if (reveal) watchReveal();
  }

  return { init, get lang() { return lang; } };
})();
