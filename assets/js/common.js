/* Общее для всех страниц: каталог, корзина, шапка и подвал, выдвижные панели, карточка товара. */
(function () {
  'use strict';

  var CART_KEY = 'cristallo-cart-v1';
  var OTHER_BRAND = 'Другие бренды';
  var memoryCart = [];
  var catalogPromise = null;

  // ------------------------------------------------------------ helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var currency = 'RUB';
  function money(v, cur) {
    cur = cur || currency;
    try {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: cur,
        minimumFractionDigits: cur === 'RUB' ? 0 : 2, maximumFractionDigits: cur === 'RUB' ? 0 : 2
      }).format(v);
    } catch (e) {
      return Math.round(v) + (cur === 'RUB' ? ' ₽' : ' €');
    }
  }

  // plural(5, 'предмет', 'предмета', 'предметов') → «предметов»
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function dateLong(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  function productUrl(p) { return 'product.html?p=' + encodeURIComponent(p.slug); }

  // catalogUrl({brand: 'Missoni'}) → «catalog.html?brand=Missoni»
  function catalogUrl(params) {
    var q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) { if (params[k]) q.set(k, params[k]); });
    var s = q.toString();
    return 'catalog.html' + (s ? '?' + s : '');
  }

  // короткие предлоги и союзы не остаются в конце строки: «хрусталь и фарфор» → «и фарфор»
  function typo(s) {
    return String(s == null ? '' : s).replace(/(^|[\s(«])([а-яёa-z]{1,2}) /gi, '$1$2 ');
  }

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }

  // ------------------------------------------------------------ каталог
  function prepare(data) {
    var byId = {}, bySlug = {};
    (data.products || []).forEach(function (p) {
      p.id = String(p.id);
      p.images = p.images || [];
      p.specs = p.specs || [];
      p._search = norm([p.name, p.name_src, p.brand, p.type, p.collection, p.designer, p.designer_lat, p.sku].join(' '));
      byId[p.id] = p;
      bySlug[p.slug] = p;
    });
    data.byId = byId;
    data.bySlug = bySlug;
    currency = data.currency || 'RUB';
    return data;
  }

  function catalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('data/products.json', { cache: 'no-cache' })
        .then(function (r) {
          if (r.status === 404) { var e = new Error('missing'); e.missing = true; throw e; }
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(prepare);
      catalogPromise.then(fillChrome, function () {});
    }
    return catalogPromise;
  }

  // бренды каталога, самые большие первыми; «Другие бренды» — не бренд, в списки не попадает
  function brandsOf(products) {
    var c = {};
    products.forEach(function (p) { if (p.brand && p.brand !== OTHER_BRAND && !p.removed) c[p.brand] = (c[p.brand] || 0) + 1; });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); });
  }

  // ------------------------------------------------------------ корзина
  function sanitize(list) {
    if (!Array.isArray(list)) return [];
    var seen = {};
    return list.filter(function (i) {
      if (!i || typeof i.id !== 'string' || seen[i.id]) return false;
      seen[i.id] = true;
      return true;
    }).map(function (i) {
      return { id: i.id, qty: Math.min(99, Math.max(1, Math.floor(Number(i.qty) || 1))) };
    });
  }

  function readCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      if (raw !== null) return sanitize(JSON.parse(raw));
    } catch (e) { /* хранилище недоступно — работаем в памяти */ }
    return memoryCart.slice();
  }

  function writeCart(list, bump) {
    memoryCart = sanitize(list);
    try { localStorage.setItem(CART_KEY, JSON.stringify(memoryCart)); } catch (e) {}
    renderCount(bump);
  }

  var cart = {
    items: readCart,
    count: function () { return readCart().reduce(function (s, i) { return s + i.qty; }, 0); },
    qty: function (id) { var it = readCart().filter(function (i) { return i.id === id; })[0]; return it ? it.qty : 0; },
    add: function (id, qty) {
      var list = readCart(), found = false;
      list.forEach(function (i) { if (i.id === id) { i.qty = Math.min(99, i.qty + (qty || 1)); found = true; } });
      if (!found) list.push({ id: id, qty: qty || 1 });
      writeCart(list, true);
    },
    set: function (id, qty) {
      writeCart(readCart().map(function (i) { if (i.id === id) i.qty = qty; return i; }), false);
    },
    remove: function (id) { writeCart(readCart().filter(function (i) { return i.id !== id; }), false); },
    clear: function () { writeCart([], false); }
  };

  function renderCount(bump) {
    var n = cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.setAttribute('data-empty', n ? 'false' : 'true');
      el.setAttribute('aria-label', n + ' ' + plural(n, 'товар', 'товара', 'товаров') + ' в корзине');
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
  }

  // ------------------------------------------------------------ шапка, подвал, всплывашка
  function markCurrentPage() {
    var page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-group a, .drawer-links a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
      if (href && href === page) a.setAttribute('aria-current', 'page');
    });
  }

  function fillChrome(data) {
    var shop = data.shop || {};
    if (shop.name) {
      document.querySelectorAll('[data-shop-name]').forEach(function (el) { el.textContent = shop.name; });
      document.querySelectorAll('[data-shop-mark]').forEach(function (el) { el.textContent = shop.name.toUpperCase(); });   // контур имени в подвале
      document.title = document.title.replace(/—[^—]*$/, '— ' + shop.name);
    }
    var contacts = document.querySelector('[data-contacts]');
    if (contacts) {
      var html = '';
      if (shop.email) html += '<p><a href="mailto:' + esc(shop.email) + '">' + esc(shop.email) + '</a></p>';
      if (shop.phone) html += '<p><a href="tel:' + esc(shop.phone.replace(/[^\d+]/g, '')) + '">' + esc(shop.phone) + '</a></p>';
      contacts.innerHTML = html;
    }
    var brands = document.querySelector('[data-footer-brands]');
    var list = brandsOf(data.products || []);
    if (brands && list.length) {
      brands.innerHTML = list.map(function (b) {
        return '<li><a href="' + esc(catalogUrl({ brand: b })) + '">' + esc(b) + '</a></li>';
      }).join('');
    }
  }

  var toastTimer = null;
  function toast(text, href, linkText) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = '<span>' + esc(text) + '</span>' + (href ? '<a href="' + esc(href) + '">' + esc(linkText) + '</a>' : '');
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3800);
  }

  // ------------------------------------------------------------ выдвижная панель
  // Панель — popover="manual" в верхнем слое; внутри горизонтальная прокрутка с двумя точками
  // привязки («открыто» и «закрыто»), так что её можно смахнуть пальцем. Состояние определяет
  // IntersectionObserver: панель полностью видна — открыта, совсем ушла — закрыта.
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupDrawer(drawer) {
    var scroller = drawer.querySelector('.drawer-scroller');
    var sheet = drawer.querySelector('.drawer-sheet');
    if (!scroller || !sheet || typeof drawer.showPopover !== 'function' || !('IntersectionObserver' in window)) return null;
    var triggers = document.querySelectorAll('[aria-controls="' + drawer.id + '"]');
    var inerted = [];
    var opened = false;
    var lastTrigger = null;

    function isShown() { try { return drawer.matches(':popover-open'); } catch (e) { return false; } }

    function inertOutside() {
      for (var node = drawer; node && node !== document.body; node = node.parentElement) {
        var parent = node.parentElement;
        if (!parent) break;
        Array.prototype.forEach.call(parent.children, function (el) {
          if (el !== node && !el.inert && !/^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) { el.inert = true; inerted.push(el); }
        });
      }
    }

    function restore() {
      inerted.forEach(function (el) { el.inert = false; });
      inerted = [];
    }

    function onOpened() {
      if (opened) return;
      opened = true;
      inertOutside();
      triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'true'); });
      sheet.focus({ preventScroll: true });
    }

    function onClosed() {
      if (!opened) return;
      opened = false;
      if (isShown()) drawer.hidePopover();
      restore();
      triggers.forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
      drawer.style.removeProperty('--drawer-backdrop');
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    }

    function open(trigger) {
      lastTrigger = trigger || null;
      drawer.showPopover();
      if (!CSS.supports('scroll-initial-target', 'nearest')) {
        // без scroll-initial-target панель сначала встала бы сразу открытой — уводим её за край
        scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'instant' });
        requestAnimationFrame(function () { requestAnimationFrame(function () { scroller.scrollTo({ left: 0, behavior: 'auto' }); }); });
      } else {
        scroller.scrollTo({ left: 0, behavior: 'auto' });
      }
      if (reducedMotion.matches) drawer.style.setProperty('--drawer-backdrop', '1');
    }

    function close() {
      if (!isShown()) return;
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'auto' });   // скрыть popover — когда панель уйдёт
    }

    var threshold = 1 / Math.max(320, window.innerWidth);
    new IntersectionObserver(function (entries) {
      if (!isShown()) return;                       // на компьютере панель фильтров — обычная колонка
      var e = entries[entries.length - 1];
      if (e.intersectionRatio < threshold) onClosed();
      if (e.intersectionRatio >= 0.999) onOpened();
    }, { root: drawer, threshold: [threshold, 1] }).observe(sheet);

    if (!CSS.supports('animation-timeline: scroll()')) {
      scroller.addEventListener('scroll', function () {
        if (!isShown()) return;
        var ratio = 1 - scroller.scrollLeft / Math.max(1, sheet.offsetWidth);
        drawer.style.setProperty('--drawer-backdrop', String(Math.max(0, Math.min(1, ratio))));
      }, { passive: true });
    }

    triggers.forEach(function (t) { t.addEventListener('click', function () { open(t); }); });
    drawer.addEventListener('click', function (e) {
      if (!isShown()) return;
      if (!sheet.contains(e.target) || e.target.closest('[data-drawer-close]') || e.target.closest('a[href]')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isShown()) close(); });
    // панель фильтров открыта на телефоне, а окно расширили до компьютерного — закрываем сразу
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (m) {
      if (m.matches && isShown()) { opened = true; onClosed(); }
    });
    return { open: open, close: close, isOpen: function () { return opened; } };
  }

  // ------------------------------------------------------------ значки: тонкая линия, 24×24
  var ICONS = {
    check: '<path d="M7 12.4l3.2 3.2L17 8.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ext: '<path d="M7 17 17 7M9 7h8v8"/>',
    phone: '<path d="M7.2 3.5h2.6l1.4 3.9-1.9 1.3a11.2 11.2 0 0 0 6 6l1.3-1.9 3.9 1.4v2.6a1.8 1.8 0 0 1-1.9 1.8C11.6 18.2 5.8 12.4 5.4 5.4a1.8 1.8 0 0 1 1.8-1.9z"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 14.5h4"/>',
    ruble: '<path d="M8.5 20V4.5h5a3.8 3.8 0 0 1 0 7.6H6.5M6.5 15.8h8"/>',
    tag: '<path d="M3.5 12.6V4.5h8.1l8.9 8.9-8.1 8.1z"/><circle cx="8" cy="9" r="1.4"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>'
  };
  function icon(name, cls, sw) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.4) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  var GEM = '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11.5 8h13l5.5 6.5L18 29.5 6 14.5z"/><path d="M6 14.5h24M11.5 8l3 6.5L18 8l3.5 6.5 3-6.5M14.5 14.5 18 29.5l3.5-15"/></svg>';

  // как считаются цены: 'eur' — в евро, 'cbr' — рубли по курсу ЦБ, 'fixed' — рубли по курсу магазина
  function rateKind(data) {
    if (data && data.currency === 'EUR') return 'eur';
    var src = data && data.rate && data.rate.source;
    return src === 'cbr' || src === 'last' ? 'cbr' : 'fixed';
  }

  // четыре правила магазина — для полосы на главной (значок, заголовок, пояснение)
  function perks(data) {
    var kind = rateKind(data);
    return [
      ['phone', 'Подтвердим звонком', 'После заказа перезвоним и уточним наличие у производителя и сроки'],
      ['card', 'Оплата после подтверждения', 'Предоплаты при оформлении на сайте нет'],
      kind === 'eur'
        ? ['tag', 'Цены в евро', 'Как у производителя — обновляются раз в неделю']
        : ['ruble', 'Цены в рублях', kind === 'cbr' ? 'По курсу ЦБ, пересчитываем раз в неделю' : 'По курсу магазина, пересчитываем раз в неделю'],
      ['refresh', 'Каталог каждую неделю', 'Новинки, цены и наличие — по данным производителя']
    ];
  }

  // ------------------------------------------------------------ карточка товара в сетке
  // мягкая карточка: фото на светлой подложке, метки-пилюли, внизу цена и круглая «+»
  function card(p) {
    var img = p.images[0];
    var url = productUrl(p);
    var badges = '';
    if (p.set && !/набор/i.test(p.name)) badges += '<span class="badge">Набор из ' + p.set + ' шт.</span>';
    if (p.available && p.preorder) badges += '<span class="badge badge--pre">Предзаказ</span>';
    if (!p.available) badges += '<span class="badge badge--out">Нет в наличии</span>';
    var old = p.old_price && p.old_price > p.price ? '<s class="price-old">' + money(p.old_price) + '</s>' : '';
    return '<article class="card' + (p.available ? '' : ' is-out') + '">' +
      '<a class="card-media" href="' + url + '" tabindex="-1" aria-hidden="true">' +
        (badges ? '<span class="badges">' + badges + '</span>' : '') +
        (img ? '<img src="' + esc(img.thumb || img.src) + '" alt="" loading="lazy" decoding="async" width="450" height="450">' : GEM) +
      '</a>' +
      '<div class="card-body">' +
        '<div class="card-label">' + esc(p.designer || p.brand) + '</div>' +
        '<a class="card-name" href="' + url + '">' + esc(typo(p.name)) + '</a>' +
        '<div class="card-foot"><span class="card-price">' + money(p.price) + old + '</span>' +
          (p.available
            ? '<button class="add-round" type="button" data-add="' + esc(p.id) + '" aria-label="В корзину: ' + esc(p.name) + '">' +
              icon('plus', 'i-plus', 1.8) + icon('check', 'i-ok', 2) + '</button>'
            : '') +
        '</div>' +
      '</div>' +
    '</article>';
  }

  // круглые «+» в сетках: предмет в корзину, на мгновение — галочка
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-add]');
    if (!btn) return;
    cart.add(btn.getAttribute('data-add'), 1);
    btn.classList.add('is-added');
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.classList.remove('is-added'); }, 1600);
    toast('Добавлено в корзину', 'cart.html', 'Открыть корзину');
  });

  window.addEventListener('storage', function (e) { if (e.key === CART_KEY) renderCount(false); });

  var drawers = {};
  function init() {
    renderCount(false);
    markCurrentPage();
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
    document.querySelectorAll('.drawer[popover]').forEach(function (d) { drawers[d.id] = setupDrawer(d); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.Shop = {
    catalog: catalog, cart: cart, card: card, money: money, plural: plural, esc: esc, brandsOf: brandsOf,
    dateLong: dateLong, productUrl: productUrl, catalogUrl: catalogUrl, norm: norm, toast: toast, typo: typo,
    icon: icon, GEM: GEM, rateKind: rateKind, perks: perks,
    drawer: function (id) { return drawers[id] || null; }, OTHER_BRAND: OTHER_BRAND
  };
})();
