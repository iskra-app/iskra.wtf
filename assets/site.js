// Общее для всех страниц: язык и фон шапки.
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

  function init({ en, onLanguage: callback }) {
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
  }

  return { init, get lang() { return lang; } };
})();
