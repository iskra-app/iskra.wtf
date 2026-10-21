// Общее для всех страниц: язык, фон шапки и (по желанию) появление блоков при прокрутке.
//
// Русский текст лежит прямо в разметке, у каждого переводимого места — ключ `data-i18n`
// (или `data-i18n-aria` для aria-label). Английский страница передаёт в `Site.init({ en })`.
// Язык: ?lang=… → выбор в подвале → язык браузера. Русский для ru, английский для остальных.
window.Site = (() => {
  // Адрес страницы — без .html, как в её canonical: /privacy.html → /privacy.
  // GitHub Pages отдаёт один файл по обоим адресам, поэтому настоящего редиректа нет —
  // меняем только строку адреса, без перезагрузки. Поисковикам хватает canonical.
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && location.pathname.endsWith('.html')) {
    const clean = new URL(canonical.href).pathname;
    if (!clean.endsWith('.html') && location.pathname.slice(0, -5) === clean) {
      history.replaceState(history.state, '', clean + location.search + location.hash);
    }
  }

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

  // Блоки проявляются при прокрутке (включается `reveal: true`): у каждого `[data-reveal]`
  // части — заголовок, текст, пункты списка — поднимаются по очереди, с шагом 70 мс.
  // Без JS и при «уменьшить движение» всё видно сразу. После появления классы снимаются,
  // чтобы вернуть блокам их собственные переходы.
  function watchReveal() {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = document.querySelectorAll('main [data-reveal]');

    const show = (el) => {
      const parts = el.matches('ul, ol, dl, .platforms, .split__text') ? [...el.children] : [el];
      parts.forEach((part, i) => {
        part.style.transitionDelay = `${i * 70}ms`;
        part.classList.add('is-shown');
        part.addEventListener('transitionend', function done(e) {
          if (e.target !== part || e.propertyName !== 'opacity') return;
          part.removeEventListener('transitionend', done);
          part.classList.remove('reveal', 'is-shown');
          part.style.transitionDelay = '';
        });
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Выше экрана (например, страницу открыли с середины) — показываем сразу.
        if (!entry.isIntersecting && entry.boundingClientRect.bottom >= 0) return;
        observer.unobserve(entry.target);
        show(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    targets.forEach((el) => {
      const parts = el.matches('ul, ol, dl, .platforms, .split__text') ? [...el.children] : [el];
      parts.forEach((part) => part.classList.add('reveal'));
      observer.observe(el);
    });
  }

  // Общие для всех страниц строки: подвал.
  const COMMON_EN = {
    'footer.top': 'Back to&nbsp;top',
    'footer.links': 'Links',
    'footer.home': 'Home',
    'footer.matrix': 'What is&nbsp;Matrix',
    'footer.server': 'Your own server',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
  };

  function init({ en, onLanguage: callback, reveal = false }) {
    TEXT.en = { ...COMMON_EN, ...en };
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
