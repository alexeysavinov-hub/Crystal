/* Главная: слайдер наверху и подборки, которые собираются из каталога автоматически.
   Какие коллекции показывать в первую очередь — в списках ниже (если их нет в каталоге, берётся что есть). */
(function () {
  'use strict';

  var BANNER_COLLECTIONS = ['Bolle', 'Smoke', 'Pitagora', 'Butterfly', 'Logica'];          // широкое фото с двумя стаканами
  var STORY_COLLECTION = 'Cibi';                                                           // «Стакан из „Бегущего по лезвию“»
  var PAIR_TYPES = ['Вазы', 'Подсвечники', 'Графины и кувшины'];                           // высокое фото слева
  var PAIR_BRANDS = ['Roberto Cavalli', 'Missoni', 'Karl Lagerfeld'];                       // широкое фото справа
  var GLASSES = ['Стаканы для виски', 'Стаканы для воды', 'Стаканы для напитков', 'Коктейльные бокалы',
    'Бокалы для вина', 'Рюмки и стопки', 'Стаканы и бокалы'];
  var MAIN_BRAND = 'Arnolfo di Cambio';

  var esc = Shop.esc, norm = Shop.norm;

  // ------------------------------------------------------------ слайдер
  // Смена фото — по окончании анимации полоски под фото (CSS), поэтому пауза при наведении,
  // фокусе и кнопкой «Остановить» работает сама: полоска замирает — замирает и показ.
  function initSlider(root) {
    var slides = root.querySelectorAll('.slide');
    var dots = root.querySelectorAll('[data-slide]');
    var toggle = root.querySelector('[data-slider-toggle]');
    var live = root.querySelector('.hero-slides');
    var current = 0;
    if (slides.length < 2) { root.querySelector('.slider-bar').hidden = true; return; }

    function go(n) {
      n = (n + slides.length) % slides.length;
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      slides[n].classList.add('is-active');
      slides[n].removeAttribute('aria-hidden');
      dots.forEach(function (d, k) {
        d.classList.toggle('is-done', k < n);
        if (k === n) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
      current = n;
    }
    function setPaused(paused) {
      root.classList.toggle('is-paused', paused);
      toggle.setAttribute('aria-label', paused ? 'Продолжить показ' : 'Остановить показ');
      live.setAttribute('aria-live', paused ? 'polite' : 'off');   // при автопоказе экранный диктор не зачитывает каждое фото
    }

    root.addEventListener('animationend', function (e) { if (e.animationName === 'slide-progress') go(current + 1); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.getAttribute('data-slide')); }); });
    toggle.addEventListener('click', function () { setPaused(!root.classList.contains('is-paused')); });
    document.addEventListener('visibilitychange', function () { root.classList.toggle('is-hidden', document.hidden); });
    // кто попросил систему уменьшить движение — показ стоит, пока не нажмут «Продолжить»
    setPaused(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  var slider = document.querySelector('[data-slider]');
  if (slider) initSlider(slider);

  function photo(p, attrs) {
    var im = p.images[0];
    return '<a href="' + Shop.productUrl(p) + '"><img src="' + esc(im.src || im.thumb) + '" alt="' + esc(p.name) + '" ' + (attrs || 'loading="lazy"') +
      ' decoding="async" width="1000" height="1000"></a>';
  }

  function count(n) { return n + ' ' + Shop.plural(n, 'предмет', 'предмета', 'предметов'); }

  // детерминированное «случайное» число: выбор недели меняется раз в неделю, а не при каждом заходе
  function seeded(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function render(data) {
    var all = data.products.filter(function (p) { return !p.removed; });
    var live = all.filter(function (p) { return p.images.length; });
    var used = {};
    var take = function (list, n) {
      var out = [];
      for (var i = 0; i < list.length && out.length < n; i++) {
        if (!used[list[i].id]) { used[list[i].id] = true; out.push(list[i]); }
      }
      return out;
    };
    var availableFirst = function (list) { return list.slice().sort(function (a, b) { return (b.available ? 1 : 0) - (a.available ? 1 : 0); }); };
    var inCollection = function (p, c) { return norm(p.collection) === norm(c) || norm(p.name_src).indexOf(norm(c)) === 0; };
    var glasses = availableFirst(live.filter(function (p) { return p.brand === MAIN_BRAND && GLASSES.indexOf(p.type) !== -1; }));

    // подпись под заголовком
    var brands = Shop.brandsOf(all);
    var sub = document.querySelector('[data-home-sub]');
    if (sub && brands.length) {
      var names = brands.length > 1 ? brands.slice(0, -1).join(', ') + ' и ' + brands[brands.length - 1] : brands[0];
      sub.textContent = Shop.typo(names + ': ' + count(all.length) + '. Каталог обновляется каждую неделю.');
    }

    // два раздела со сдвигом: высокое фото и широкое
    var pairType = PAIR_TYPES.filter(function (t) { return live.some(function (p) { return p.type === t; }); })[0];
    var pairBrand = PAIR_BRANDS.filter(function (b) { return live.some(function (p) { return p.brand === b; }); })[0];
    fillPair('a', pairType && take(availableFirst(live.filter(function (p) { return p.type === pairType; })), 1)[0],
      pairType, count(all.filter(function (p) { return p.type === pairType; }).length), Shop.catalogUrl({ type: pairType }));
    fillPair('b', pairBrand && take(availableFirst(live.filter(function (p) { return p.brand === pairBrand; })), 1)[0],
      'Фарфор ' + pairBrand, count(all.filter(function (p) { return p.brand === pairBrand; }).length), Shop.catalogUrl({ brand: pairBrand }));

    // витрина «Бегущего по лезвию»
    var story = take(glasses.filter(function (p) { return inCollection(p, STORY_COLLECTION) && p.type === 'Стаканы для виски'; }), 1)[0] ||
      take(live.filter(function (p) { return inCollection(p, STORY_COLLECTION); }), 1)[0] || take(glasses, 1)[0];
    var storyBox = document.querySelector('[data-story]');
    if (story) storyBox.innerHTML = photo(story);

    // широкий баннер: два стакана из разных коллекций, сначала — из списка BANNER_COLLECTIONS
    var banner = [];
    BANNER_COLLECTIONS.forEach(function (c) {
      if (banner.length < 2) banner = banner.concat(take(glasses.filter(function (p) { return inCollection(p, c); }), 1));
    });
    var seen = {};
    banner.forEach(function (p) { seen[norm(p.collection)] = true; });
    seen[norm(STORY_COLLECTION)] = true;
    banner = banner.concat(take(glasses.filter(function (p) {
      var c = norm(p.collection);
      if (!c || seen[c]) return false;
      seen[c] = true;
      return true;
    }), 2 - banner.length));
    banner = banner.concat(take(glasses, 2 - banner.length));
    var bannerBox = document.querySelector('[data-banner]');
    if (banner.length) {
      bannerBox.innerHTML = banner.map(function (p) { return photo(p); }).join('');
      document.querySelector('[data-banner-caption]').innerHTML = banner.map(function (p) {
        return '<a href="' + Shop.productUrl(p) + '">' + esc(Shop.typo(p.name)) + '</a>';
      }).join(' и ');
    } else {
      bannerBox.closest('section').hidden = true;
    }

    // полоса «как мы работаем»: четыре правила магазина (строка о цене зависит от настройки курса)
    var perksBox = document.querySelector('[data-perks]');
    if (perksBox) perksBox.innerHTML = Shop.perks(data).map(function (r) {
      return '<li><span class="ico">' + Shop.icon(r[0]) + '</span><span><b>' + esc(r[1]) + '</b><span class="t">' + esc(r[2]) + '</span></span></li>';
    }).join('');

    // выбор недели: четыре предмета разных брендов
    var now = new Date();
    var week = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5 + 3) / 7);
    var rnd = seeded(week);
    var pool = live.filter(function (p) { return p.available && !used[p.id]; })
      .map(function (p) { return { p: p, r: rnd() }; })
      .sort(function (a, b) { return a.r - b.r; })
      .map(function (x) { return x.p; });
    var picks = [], brandSeen = {};
    pool.forEach(function (p) { if (picks.length < 4 && !brandSeen[p.brand]) { brandSeen[p.brand] = true; picks.push(p); } });
    pool.forEach(function (p) { if (picks.length < 4 && picks.indexOf(p) === -1) picks.push(p); });
    document.querySelector('[data-picks]').innerHTML = picks.map(Shop.card).join('');
  }

  function fillPair(key, p, title, meta, href) {
    var box = document.querySelector('[data-pair="' + key + '"]');
    if (!p) { box.hidden = true; return; }
    box.href = href;
    var im = p.images[0];
    box.querySelector('.frame').outerHTML = '<span class="frame"><img src="' + esc(im.src || im.thumb) + '" alt="" loading="lazy" decoding="async" width="1000" height="1000"></span>';
    box.querySelector('.pair-title').textContent = Shop.typo(title);
    box.querySelector('.pair-meta').textContent = meta;
  }

  Shop.catalog().then(render).catch(function (err) {
    document.querySelector('[data-picks]').innerHTML = '<div class="notice" style="grid-column:1/-1;margin:0 auto;text-align:center">' +
      '<h2>Каталог ещё не загружен</h2><p>' + (err && err.missing
        ? 'Запустите синхронизацию: <code>python3 app/sync.py</code> — после первого запуска здесь появятся предметы.'
        : 'Не удалось загрузить каталог. Обновите страницу через минуту.') + '</p></div>';
    ['.pair', '.story', '.banner', '.perks'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.hidden = true;
    });
  });
})();
