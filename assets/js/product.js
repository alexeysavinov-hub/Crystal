/* Карточка товара: галерея, покупка, «О предмете», бренд, «Соберите комплект», вопросы, рекомендации.
   Всё собирается из каталога. Отзывов, рейтингов и скидок «для вида» здесь нет — только то, что есть в данных:
   старая цена и плашка «−N %» появляются, только если у товара есть old_price. */
(function () {
  'use strict';

  var root = document.getElementById('product-root');
  var key = new URLSearchParams(location.search).get('p') || '';
  var esc = Shop.esc, money = Shop.money, plural = Shop.plural, norm = Shop.norm;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ------------------------------------------------------------ бренды
  // Короткая история и факты — только проверенное. Бренду без записи блок «О бренде» не выводится.
  // handmade — на карточках хрусталя этого бренда пишем «Хрусталь ручной работы из Тосканы».
  var BRANDS = {
    'Arnolfo di Cambio': {
      year: 1963, region: ['Тоскана', 'Колле-ди-Валь-д’Эльса'], place: 'Колле-ди-Валь-д’Эльса, Тоскана', handmade: true,
      text: 'Бренд основан в 1963 году в Колле-ди-Валь-д’Эльса — тосканском городе хрусталя — и назван в честь уроженца этих мест, архитектора Арнольфо ди Камбио, начавшего строительство флорентийского собора.'
    },
    'Missoni': {
      year: 1953, region: ['Ломбардия', 'Италия'], place: 'Ломбардия, Италия',
      text: 'Семейный дом моды, который Оттавио и Розита Миссони основали в 1953 году. Его узнают по зигзагам и полосам — те же узоры перешли на фарфор и вещи для дома.'
    },
    'Roberto Cavalli': {
      region: ['Флоренция', 'Италия'], place: 'Флоренция, Италия',
      text: 'Флорентийский дом моды, известный анималистичными принтами. В коллекциях для дома — те же мотивы: хищные кошки, кожа рептилий, тропические цветы.'
    },
    'Karl Lagerfeld': {
      text: 'Бренд, основанный Карлом Лагерфельдом, — со строгой чёрно-белой эстетикой его дома.'
    }
  };

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
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>',
    glass: '<path d="M8 3.5h8l-.5 6.2a3.5 3.5 0 0 1-7 0z"/><path d="M12 13.2v7M8.8 20.2h6.4"/>',
    height: '<path d="M12 4v16M9 7l3-3 3 3M9 17l3 3 3-3"/>',
    diameter: '<circle cx="12" cy="12" r="7.5"/><path d="M6.7 17.3 17.3 6.7"/>',
    size: '<rect x="3.5" y="6.5" width="17" height="11" rx="1.5"/><path d="M7.5 6.5v3M11.5 6.5v4.5M15.5 6.5v3"/>',
    weight: '<path d="M6.5 9.5h11l2 10h-15z"/><circle cx="12" cy="6.5" r="2"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    set: '<path d="M4.5 4h5l-.4 4.6a2.1 2.1 0 0 1-4.2 0zM7 10.8V19M5.3 19h3.4"/><path d="M14.5 4h5l-.4 4.6a2.1 2.1 0 0 1-4.2 0zM17 10.8V19M15.3 19h3.4"/>',
    drop: '<path d="M12 3.8c3.1 3.7 5.4 6.6 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-3 2.3-5.9 5.4-9.6z"/>',
    sponge: '<rect x="4" y="7.5" width="16" height="9" rx="3"/><path d="M8.5 11h.01M12 13.2h.01M15.5 11h.01"/>',
    temp: '<path d="M10 13.8V5.5a2 2 0 0 1 4 0v8.3a3.8 3.8 0 1 1-4 0z"/><path d="M12 9.5v6.3"/>',
    cloth: '<path d="M4 8.5c2.7-2 5.3-2 8 0s5.3 2 8 0M4 15.5c2.7-2 5.3-2 8 0s5.3 2 8 0"/>',
    spark: '<path d="M12 3.5l1.9 6.6 6.6 1.9-6.6 1.9L12 20.5l-1.9-6.6-6.6-1.9 6.6-1.9z"/>',
    flame: '<path d="M12 3.5c2.8 3.5 5 6.1 5 9.8a5 5 0 0 1-10 0c0-2 1-3.6 2.4-5 .2 1.6.9 2.7 2 3.2-.6-2.8 0-5.3.6-8z"/>',
    eye: '<path d="M2.8 12S6.2 6 12 6s9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6z"/><circle cx="12" cy="12" r="2.6"/>',
    wind: '<path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h14a2.5 2.5 0 1 1-2.5 2.5M3.5 17h6"/>',
    reeds: '<path d="M8.5 13h7v6.5a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M11 13V4M13 13l2.5-9M10 13 7.5 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'
  };
  function icon(name, cls, sw) {
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.4) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }
  var GEM = '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M11.5 8h13l5.5 6.5L18 29.5 6 14.5z"/><path d="M6 14.5h24M11.5 8l3 6.5L18 8l3.5 6.5 3-6.5M14.5 14.5 18 29.5l3.5-15"/></svg>';
  var LUX = '<span class="lux" aria-hidden="true"><span class="lux-beam"></span><span class="lux-c lux-c1"></span><span class="lux-c lux-c2"></span>' +
    '<span class="lux-c lux-c3"></span><span class="lux-floor"></span><span class="lux-arc"></span><span class="lux-arc lux-arc2"></span>' +
    '<span class="lux-line lux-l1"></span><span class="lux-line lux-l2"></span><span class="lux-line lux-l3"></span><span class="lux-grain"></span></span>';

  // ------------------------------------------------------------ данные
  function spec(p, label) {
    for (var i = 0; i < p.specs.length; i++) if (p.specs[i][0] === label) return p.specs[i][1];
    return '';
  }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function live(list) { return list.filter(function (x) { return !x.removed; }); }
  function availFirst(a, b) { return (b.available ? 1 : 0) - (a.available ? 1 : 0); }
  function joinRu(arr) { return arr.length > 1 ? arr.slice(0, -1).join(', ') + ' и ' + arr[arr.length - 1] : (arr[0] || ''); }
  function shortName(p) {   // «Degustazione — графин для воды» → «Графин для воды»
    var n = p.name;
    if (p.collection && n.indexOf(p.collection + ' — ') === 0) n = n.slice(p.collection.length + 3);
    return cap(n);
  }
  function isCrystal(p) { return /хрустал/.test(norm(spec(p, 'Материал'))); }
  function handmade(p) { var b = BRANDS[p.brand]; return !!(b && b.handmade && isCrystal(p)); }
  function img(im, cls) {
    return im ? '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="' + esc(im.thumb || im.src) + '" alt="" loading="lazy" decoding="async">' : GEM;
  }

  // ------------------------------------------------------------ первый экран
  function galleryHtml(p) {
    var imgs = p.images;
    var chips = [];
    if (p.set) chips.push('<span class="chip">Набор из ' + p.set + ' шт.</span>');
    if (handmade(p)) chips.push('<span class="chip">Ручная работа</span>');
    if (p.available && p.preorder) chips.push('<span class="chip chip--pre">Предзаказ</span>');
    if (!p.available) chips.push('<span class="chip chip--out">Нет в наличии</span>');
    var main = imgs[0]
      ? '<img id="main-img" src="' + esc(imgs[0].src) + '" alt="' + esc(p.name) + '" fetchpriority="high" decoding="async">'
      : '<span class="pdp-ph">' + GEM + '<span>Фото скоро появится</span></span>';
    var thumbs = imgs.length > 1
      ? '<div class="pdp-thumbs" role="group" aria-label="Фотографии товара">' + imgs.map(function (im, i) {
          return '<button type="button" class="pdp-thumb" data-i="' + i + '" aria-label="Фото ' + (i + 1) + ' из ' + imgs.length + '"' +
            (i === 0 ? ' aria-current="true"' : '') + '>' + img(im) + '</button>';
        }).join('') + '</div>'
      : '';
    return '<div class="pdp-gallery"><div class="pdp-main">' + (chips.length ? '<span class="pdp-chips">' + chips.join('') + '</span>' : '') + main + '</div>' + thumbs + '</div>';
  }

  function priceHtml(p) {
    var old = p.old_price && p.old_price > p.price ? p.old_price : 0;
    var off = old ? Math.round((1 - p.price / old) * 100) : 0;
    return '<div class="pdp-price"><strong>' + money(p.price) + '</strong>' +
      (old ? '<s>' + money(old) + '</s>' + (off >= 1 ? '<span class="pdp-off">−' + off + '%</span>' : '') : '') +
      (p.set ? '<span class="note">за набор из ' + p.set + ' шт.</span>' : '') + '</div>';
  }

  function statusHtml(p) {
    if (!p.available) return '<p class="pdp-status pdp-status--out"><span class="dot" aria-hidden="true"></span>Нет в наличии</p>';
    if (p.preorder) return '<p class="pdp-status pdp-status--pre"><span class="dot" aria-hidden="true"></span>' + esc(p.preorder) + ' — срок уточним при звонке</p>';
    return '<p class="pdp-status"><span class="dot" aria-hidden="true"></span>В наличии у производителя</p>';
  }

  // чек-лист: только факты из данных товара
  function checklist(p) {
    var out = [];
    var mat = spec(p, 'Материал');
    if (handmade(p)) out.push('Хрусталь ручной работы из Тосканы');
    else if (mat) out.push('Материал — ' + mat);
    if (p.set) out.push('Набор из ' + p.set + ' шт.');
    var dims = [['Объём', 'объём'], ['Высота', 'высота'], ['Диаметр', 'диаметр'], ['Размеры', 'размеры']]
      .filter(function (d) { return spec(p, d[0]); }).slice(0, 2)
      .map(function (d) { return d[1] + ' ' + spec(p, d[0]); });
    if (dims.length) out.push(cap(dims.join(', ')));
    if (p.designer) out.push('Дизайн — ' + p.designer);
    if (/подарочн/.test(norm(p.name))) out.push('В подарочной упаковке');
    return out.slice(0, 4);
  }

  // предметы той же коллекции — как выбор вкуса
  function collectionHtml(p, list) {
    if (!p.collection) return '';
    var same = live(list).filter(function (x) { return x.collection === p.collection && x.id !== p.id; }).sort(availFirst);
    if (!same.length) return '';
    var shown = [p].concat(same.slice(0, 3));
    var total = same.length + 1;
    return '<div class="pdp-coll"><div class="pdp-coll-head"><span>Предметы коллекции</span>' +
      '<a href="' + esc(Shop.catalogUrl({ q: p.collection })) + '">Вся коллекция' + (total > shown.length ? ' · ' + total : '') + '</a></div>' +
      '<div class="pdp-vars">' + shown.map(function (x) {
        var inner = '<span class="var-i">' + img(x.images[0]) + '</span><span class="var-n">' + esc(Shop.typo(shortName(x))) + '</span>';
        return x.id === p.id
          ? '<span class="var" aria-current="page">' + inner + '</span>'
          : '<a class="var" href="' + Shop.productUrl(x) + '">' + inner + '</a>';
      }).join('') + '</div></div>';
  }

  function buyHtml(p) {
    if (!p.available) {
      return '<a class="pbtn pbtn--line pbtn--block" href="' + esc(Shop.catalogUrl({ type: p.type })) + '">Похожие предметы в каталоге</a>';
    }
    return '<div class="pdp-buy">' +
        '<div class="step"><button type="button" data-step="-1" aria-label="Меньше" disabled>−</button>' +
        '<input id="qty" type="number" min="1" max="99" value="1" inputmode="numeric" aria-label="Количество">' +
        '<button type="button" data-step="1" aria-label="Больше">+</button></div>' +
        '<button type="button" class="pbtn pbtn--dark pdp-add" id="add"><span class="lbl"><span class="long">Добавить в корзину</span><span class="short">В корзину</span></span>' +
        '<span class="div" aria-hidden="true"></span><span class="sum" id="add-sum">' + money(p.price) + '</span></button>' +
      '</div>' +
      '<button type="button" class="pbtn pbtn--line pbtn--block" id="buy-now">Купить сейчас</button>';
  }

  var rateKind = Shop.rateKind;   // 'eur' | 'cbr' | 'fixed'

  function trustHtml(data) {
    var kind = rateKind(data);
    var rows = [
      ['phone', 'Подтвердим заказ звонком'],
      ['card', 'Оплата после подтверждения'],
      kind === 'eur' ? ['tag', 'Цены в евро, как у производителя'] : ['ruble', kind === 'cbr' ? 'Цены в рублях по курсу ЦБ' : 'Цены в рублях'],
      ['refresh', 'Каталог обновляется каждую неделю']
    ];
    return '<ul class="pdp-trust sand">' + rows.map(function (r) {
      return '<li><span class="ico">' + icon(r[0]) + '</span>' + esc(r[1]) + '</li>';
    }).join('') + '</ul>';
  }

  // ------------------------------------------------------------ «О предмете»
  var FACTS = [['Объём', 'glass'], ['Высота', 'height'], ['Диаметр', 'diameter'], ['Размеры', 'size'], ['Вес', 'weight'], ['Время горения', 'clock'], ['В наборе', 'set']];

  // уход — по материалу и типу предмета; общие правила, без обещаний сверх них
  function careFor(p) {
    var mat = norm(spec(p, 'Материал'));
    var type = norm(p.type);
    var metal = /gold|platin|silver|золот|платин|серебр/.test(norm(p.name + ' ' + (p.collection || '')));
    if (/свеч/.test(type)) return { title: 'Как пользоваться', items: [
      ['flame', 'Перед каждым зажиганием подрезайте фитиль до 5 мм'],
      ['clock', 'В первый раз дайте воску расплавиться до краёв'],
      ['eye', 'Не оставляйте горящую свечу без присмотра'],
      ['wind', 'Держите подальше от сквозняков и штор']] };
    if (/диффузор/.test(type)) return { title: 'Как пользоваться', items: [
      ['reeds', 'Вставьте палочки и через пару часов переверните их'],
      ['refresh', 'Переворачивайте палочки раз в несколько дней — аромат станет ярче'],
      ['sun', 'Держите вдали от солнца и батарей'],
      ['drop', 'Не ставьте флакон на лакированную мебель: масло может испортить лак']] };
    if (/хрустал|стекл/.test(mat)) {
      var stem = /бокал/.test(norm(p.type + ' ' + p.name));
      return { title: /хрустал/.test(mat) ? 'Уход за хрусталём' : 'Уход за стеклом', items: [
        ['drop', 'Мойте вручную в тёплой воде с мягким средством'],
        ['sponge', 'Без абразивов и жёстких губок'],
        ['temp', 'Берегите от резких перепадов температуры'],
        ['cloth', stem ? 'Вытирайте мягкой тканью, держа бокал за чашу' : 'Вытирайте мягкой безворсовой тканью']] };
    }
    if (/фарфор|керамик|фаянс/.test(mat)) return { title: 'Уход за фарфором', items: [
      ['drop', 'Мойте мягким средством, без абразивов'],
      ['temp', 'Берегите от резких перепадов температуры'],
      metal ? ['spark', 'Золото и платина в декоре — только ручная мойка и не в микроволновку'] : ['cloth', 'Храните, перекладывая мягкой тканью или бумагой']] };
    if (/стал|металл/.test(mat)) return { title: 'Уход', items: [
      ['drop', 'Мойте тёплой водой с мягким средством'],
      ['cloth', 'Сразу вытирайте насухо мягкой тканью'],
      ['sponge', 'Без абразивов и жёстких губок']] };
    return null;
  }

  function aboutHtml(p, data) {
    var facts = FACTS.filter(function (f) { return spec(p, f[0]); }).slice(0, 4);
    if (facts.length < 2) facts = [];
    var inFacts = facts.map(function (f) { return f[0]; });
    var rows = [];
    p.specs.forEach(function (s) { if (inFacts.indexOf(s[0]) === -1) rows.push([s[0], esc(s[1])]); });
    if (p.collection) rows.push(['Коллекция', '<a href="' + esc(Shop.catalogUrl({ q: p.collection })) + '">' + esc(p.collection) + '</a>']);
    rows.push(['Бренд', '<a href="' + esc(Shop.catalogUrl({ brand: p.brand })) + '">' + esc(p.brand) + '</a>']);
    if (p.designer) rows.push(['Дизайн', '<a href="' + esc(Shop.catalogUrl({ designer: p.designer })) + '">' + esc(p.designer) + '</a>' +
      (p.designer_lat ? ' <span class="lat">(' + esc(p.designer_lat) + ')</span>' : '')]);
    if (p.sku) rows.push(['Артикул', esc(p.sku)]);
    var showSource = data.shop && data.shop.show_source_link && p.source_url;
    var care = careFor(p);

    return '<section class="pdp-about sand" aria-labelledby="about-title"><div class="wrap">' +
      '<div class="pdp-head reveal"><p class="eyebrow">Подробности</p><h2 id="about-title" class="pdp-h2">О предмете</h2></div>' +
      (facts.length ? '<div class="facts reveal" style="--n:' + facts.length + '">' + facts.map(function (f) {
        return '<div class="fact soft-card"><span class="ico">' + icon(f[1], '', 1.3) + '</span><div class="fact-v">' + esc(spec(p, f[0])) + '</div><div class="fact-l">' + esc(f[0]) + '</div></div>';
      }).join('') + '</div>' : '') +
      '<div class="about-grid reveal' + (care ? '' : ' about-grid--one') + '">' +
        '<div class="about-card soft-card"><h3>Описание</h3>' +
          (p.description ? '<div class="description">' + p.description + '</div>' : '') +
          (p.description_kind === 'original' ? '<p class="about-note">Описание производителя на итальянском.</p>' : '') +
          '<dl class="about-specs">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>' +
          (showSource ? '<a class="ext" href="' + esc(p.source_url) + '" target="_blank" rel="noopener">Этот товар на сайте производителя' + icon('ext', '', 1.6) + '</a>' : '') +
        '</div>' +
        (care ? '<div class="about-card soft-card"><h3>' + esc(care.title) + '</h3><ul class="care">' + care.items.map(function (c) {
          return '<li><span class="ico">' + icon(c[0]) + '</span>' + esc(c[1]) + '</li>';
        }).join('') + '</ul></div>' : '') +
      '</div></div></section>';
  }

  // ------------------------------------------------------------ «О бренде»
  function brandHtml(p, list) {
    var b = BRANDS[p.brand];
    if (!b) return '';
    var mine = live(list).filter(function (x) { return x.brand === p.brand; });
    var colls = {}, designers = {};
    mine.forEach(function (x) {
      if (x.collection) colls[x.collection] = 1;
      if (x.designer) designers[x.designer] = (designers[x.designer] || 0) + 1;
    });
    var nColl = Object.keys(colls).length;
    var top = Object.keys(designers).sort(function (a, c) { return designers[c] - designers[a] || a.localeCompare(c); }).slice(0, 4);
    var stats = [];
    if (b.year) stats.push([String(b.year), 'год основания']);
    if (b.region) stats.push(b.region);
    stats.push([String(mine.length), plural(mine.length, 'предмет', 'предмета', 'предметов') + ' в каталоге']);
    if (nColl > 1) stats.push([String(nColl), plural(nColl, 'коллекция', 'коллекции', 'коллекций') + ' в каталоге']);
    stats = stats.slice(0, 3);
    return '<section class="pdp-brand" aria-labelledby="brand-title"><div class="wrap brand-grid">' +
      '<div class="brand-art reveal">' + LUX + (b.place ? '<span class="chip chip--glass">' + esc(b.place) + '</span>' : '') + '</div>' +
      '<div class="brand-text reveal"><p class="eyebrow">О бренде</p><h2 id="brand-title" class="pdp-h2">' + esc(Shop.typo(p.brand)) + '</h2>' +
        '<p>' + esc(b.text) + '</p>' +
        (top.length >= 2 ? '<p class="muted">Предметы для бренда придумывали ' + esc(joinRu(top)) + '.</p>' : '') +
        '<dl class="brand-stats" style="--n:' + stats.length + '">' + stats.map(function (s) {
          return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>';
        }).join('') + '</dl>' +
        '<a class="arrow-link" href="' + esc(Shop.catalogUrl({ brand: p.brand })) + '">Все предметы ' + esc(p.brand) + icon('arrow', '', 1.5) + '</a>' +
      '</div></div></section>';
  }

  // ------------------------------------------------------------ «Соберите комплект»
  // К текущему предмету — до двух доступных: сначала из той же коллекции (другие типы, затем тот же),
  // потом того же бренда (сначала того же дизайнера). Типы не повторяются; цены — как в каталоге.
  function bundleItems(p, list) {
    if (!p.available) return [];
    var pool = live(list).filter(function (x) { return x.id !== p.id && x.available; });
    var near = function (a, b) { return Math.abs(a.price - p.price) - Math.abs(b.price - p.price); };
    var sameColl = function (x) { return p.collection && x.collection === p.collection; };
    var ownBrand = p.brand && p.brand !== Shop.OTHER_BRAND;
    var groups = [
      pool.filter(function (x) { return sameColl(x) && x.type !== p.type; }),
      pool.filter(function (x) { return sameColl(x) && x.type === p.type; }),
      ownBrand ? pool.filter(function (x) { return x.brand === p.brand && x.type !== p.type && p.designer && x.designer === p.designer; }) : [],
      ownBrand ? pool.filter(function (x) { return x.brand === p.brand && x.type !== p.type; }) : []
    ];
    var out = [], types = {};
    groups.forEach(function (g) {
      g.sort(near).forEach(function (x) {
        if (out.length < 2 && out.indexOf(x) === -1 && !types[x.type]) { out.push(x); types[x.type] = true; }
      });
    });
    return out;
  }

  function bundleHtml(p, extra) {
    if (!extra.length) return '';
    var items = [p].concat(extra);
    return '<section class="pdp-set" aria-labelledby="set-title"><div class="wrap"><div class="set-panel soft-card reveal">' +
      '<div class="set-head"><div><p class="eyebrow">Дополните сервировку</p><h2 id="set-title">Соберите комплект</h2></div>' +
        '<p>Отметьте предметы — добавим их в корзину вместе. Цены те же, что в каталоге.</p></div>' +
      '<div class="set-grid" style="--n:' + items.length + '">' + items.map(function (x, i) {
        var url = Shop.productUrl(x);
        return '<div class="set-item" data-id="' + esc(x.id) + '" data-price="' + x.price + '">' +
          '<div class="set-media">' + (i ? '<span class="set-plus" aria-hidden="true">' + icon('plus', '', 1.8) + '</span>' : '') +
            '<a class="set-photo set-dim" href="' + url + '" tabindex="-1" aria-hidden="true">' + img(x.images[0]) + '</a>' +
            '<label class="set-check"><input type="checkbox" checked><span class="visually-hidden">' + esc(x.name) + '</span></label>' +
          '</div>' +
          '<div class="set-text set-dim"><div class="set-label">' + esc(i ? (x.designer || x.brand) : 'Этот предмет') + '</div>' +
            (i ? '<a class="set-name" href="' + url + '">' : '<span class="set-name">') + esc(Shop.typo(x.name)) + (i ? '</a>' : '</span>') +
            (x.set && !/набор/i.test(x.name) ? '<div class="set-note">Набор из ' + x.set + ' шт.</div>' : '') +
            '<div class="set-price">' + money(x.price) + '</div></div>' +
        '</div>';
      }).join('') +
        '<div class="set-sum"><p class="count" id="set-count"></p><p class="total" id="set-total"></p>' +
          '<button type="button" class="pbtn pbtn--dark" id="set-add">Добавить в корзину</button>' +
          '<p class="hint">Количество каждого предмета можно изменить в корзине.</p></div>' +
      '</div></div></div></section>';
  }

  // ------------------------------------------------------------ вопросы
  function faqHtml(data, sand) {
    var shop = data.shop || {};
    var kind = rateKind(data);
    var priceAnswer = kind === 'eur'
      ? 'Цены указаны в евро, как у производителя. Каталог обновляется раз в неделю: если производитель изменит цену, она поменяется и здесь. Итоговую сумму назовём при подтверждении заказа.'
      : kind === 'cbr'
        ? 'Производитель указывает цены в евро. Мы пересчитываем их в рубли по курсу ЦБ РФ при еженедельном обновлении каталога, поэтому цена может немного меняться от недели к неделе. Итоговую сумму назовём при подтверждении заказа.'
        : 'Производитель указывает цены в евро, мы пересчитываем их в рубли по курсу магазина. Каталог обновляется раз в неделю: если производитель изменит цену, она поменяется и здесь. Итоговую сумму назовём при подтверждении заказа.';
    var qa = [
      ['Как оформить заказ?', 'Добавьте предметы в корзину и отправьте заявку с именем и телефоном. Мы позвоним, уточним наличие у производителя и сроки — после этого заказ будет подтверждён.'],
      ['Когда нужно платить?', 'Оплата и доставка — после того как мы подтвердим заказ по телефону. Предоплаты при оформлении на сайте нет.'],
      ['Почему цена может измениться?', priceAnswer],
      ['Что значит «Предзаказ»?', 'Предмет поставляется под заказ. Срок поставки уточним у производителя и назовём при звонке — до того, как подтвердить заказ.'],
      ['Цена указана за штуку или за набор?', 'Если предмет продаётся набором, цена указана за весь набор — состав написан рядом с ценой, например «за набор из 2 шт.».']
    ];
    var contacts = (shop.email ? '<a class="pbtn pbtn--line pbtn--sm" href="mailto:' + esc(shop.email) + '">' + esc(shop.email) + '</a>' : '') +
      (shop.phone ? '<a class="pbtn pbtn--line pbtn--sm" href="tel:' + esc(shop.phone.replace(/[^\d+]/g, '')) + '">' + esc(shop.phone) + '</a>' : '');
    return '<section class="pdp-faq' + (sand ? ' sand' : '') + '" aria-labelledby="faq-title"><div class="wrap faq-grid">' +
      '<div class="faq-intro reveal"><p class="eyebrow">Покупателю</p><h2 id="faq-title" class="pdp-h2">Вопросы о&nbsp;заказе</h2>' +
        '<p>' + (contacts ? 'Не нашли ответа — напишите или позвоните, расскажем о предмете подробнее.' : 'Остальное расскажем, когда позвоним подтвердить заказ.') + '</p>' +
        (contacts ? '<div class="faq-contacts">' + contacts + '</div>' : '') + '</div>' +
      '<div class="faq reveal">' + qa.map(function (q, i) {
        return '<details name="faq"' + (i === 0 ? ' open' : '') + '><summary>' + esc(q[0]) + '<span class="faq-x" aria-hidden="true"></span></summary>' +
          '<p class="faq-a">' + esc(q[1]) + '</p></details>';
      }).join('') + '</div></div></section>';
  }

  // ------------------------------------------------------------ «Вам может понравиться»
  // Того же типа из других коллекций, затем той же коллекции, того же бренда; без предметов из комплекта.
  function relatedHtml(p, list, exclude) {
    var pool = live(list).filter(function (x) { return x.id !== p.id && exclude.indexOf(x.id) === -1; });
    var ownBrand = p.brand && p.brand !== Shop.OTHER_BRAND;
    var groups = [
      pool.filter(function (x) { return x.type === p.type && (!p.collection || x.collection !== p.collection); }),
      pool.filter(function (x) { return p.collection && x.collection === p.collection; }),
      ownBrand ? pool.filter(function (x) { return x.brand === p.brand; }) : [],
      pool.filter(function (x) { return x.type === p.type; })
    ];
    var out = [];
    groups.forEach(function (g) {
      g.sort(availFirst).forEach(function (x) { if (out.length < 4 && out.indexOf(x) === -1) out.push(x); });
    });
    if (!out.length) return '';
    return '<section class="pdp-related" aria-labelledby="related-title"><div class="wrap">' +
      '<div class="rel-head reveal"><div>' + (p.type ? '<p class="eyebrow"><a href="' + esc(Shop.catalogUrl({ type: p.type })) + '">' + esc(p.type) + '</a></p>' : '') +
        '<h2 id="related-title" class="pdp-h2">Вам может понравиться</h2></div>' +
        '<a class="arrow-link" href="catalog.html">Весь каталог' + icon('arrow', '', 1.5) + '</a></div>' +
      '<div class="rel-grid reveal">' + out.map(Shop.card).join('') + '</div></div></section>';
  }

  // ------------------------------------------------------------ сборка и поведение
  function notFound(text) {
    root.innerHTML = '<div class="wrap"><div class="notice" style="padding-top:72px"><h2>Товар не найден</h2><p>' + esc(text) +
      '</p><a class="btn" href="catalog.html">Перейти в каталог</a></div></div>';
  }

  function render(p, data) {
    document.title = p.name + ' — ' + ((data.shop && data.shop.name) || 'Магазин');
    var list = data.products;
    var extra = bundleItems(p, list);
    var ck = checklist(p);
    var brand = brandHtml(p, list);
    var set = bundleHtml(p, extra);

    var info = '<div class="pdp-info">' +
      '<div class="pdp-eyebrow"><a class="eyebrow" href="' + esc(Shop.catalogUrl({ brand: p.brand })) + '">' + esc(p.brand) + '</a>' +
        (p.collection ? '<span class="sep" aria-hidden="true"></span><a class="coll" href="' + esc(Shop.catalogUrl({ q: p.collection })) + '">Коллекция ' + esc(p.collection) + '</a>' : '') +
      '</div>' +
      '<h1>' + esc(Shop.typo(p.name)) + '</h1>' +
      (p.name_src && p.name_src !== p.name ? '<p class="pdp-src">Оригинальное название: ' + esc(p.name_src) + '</p>' : '') +
      priceHtml(p) + statusHtml(p) +
      (ck.length ? '<ul class="ck">' + ck.map(function (t) {
        return '<li><span class="ck-i" aria-hidden="true">' + icon('check', '', 2.4) + '</span><span>' + esc(t) + '</span></li>';
      }).join('') + '</ul>' : '') +
      collectionHtml(p, list) + buyHtml(p) + trustHtml(data) +
    '</div>';

    root.innerHTML =
      '<div class="wrap">' +
        '<nav class="crumbs" aria-label="Навигация"><a href="index.html">Главная</a> / <a href="catalog.html">Каталог</a>' +
          (p.type ? ' / <a href="' + esc(Shop.catalogUrl({ type: p.type })) + '">' + esc(p.type) + '</a>' : '') + '</nav>' +
        '<div class="pdp-hero">' + galleryHtml(p) + info + '</div>' +
      '</div>' +
      aboutHtml(p, data) + brand + set + faqHtml(data, !!(brand || set)) +
      relatedHtml(p, list, extra.map(function (x) { return x.id; }));

    bindGallery(p);
    bindBuy(p);
    bindSet();
  }

  function bindGallery(p) {
    var main = document.getElementById('main-img');
    var thumbs = root.querySelectorAll('.pdp-thumb');
    thumbs.forEach(function (b) {
      b.addEventListener('click', function () {
        var im = p.images[+b.getAttribute('data-i')];
        thumbs.forEach(function (x) { x.removeAttribute('aria-current'); });
        b.setAttribute('aria-current', 'true');
        if (!main || main.getAttribute('src') === im.src) return;
        if (reduced.matches) { main.src = im.src; return; }
        // мягкая смена фото: старое гаснет, новое проявляется, когда загрузится
        main.classList.add('is-swapping');
        setTimeout(function () {
          var done = function () { main.classList.remove('is-swapping'); };
          main.addEventListener('load', done, { once: true });
          main.src = im.src;
          if (main.complete) done();
          setTimeout(done, 1200);
        }, 180);
      });
    });
  }

  function flash(btn, label) {
    var lbl = btn.querySelector('.lbl') || btn;
    if (!btn._orig) btn._orig = lbl.innerHTML;
    lbl.textContent = label;
    btn.classList.add('is-added');
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { lbl.innerHTML = btn._orig; btn.classList.remove('is-added'); }, 1800);
  }

  function bindBuy(p) {
    var qty = document.getElementById('qty');
    if (!qty) return;
    var minus = root.querySelector('[data-step="-1"]');
    var plusBtn = root.querySelector('[data-step="1"]');
    var sum = document.getElementById('add-sum');
    var add = document.getElementById('add');
    var clamp = function (v) { return Math.min(99, Math.max(1, parseInt(v, 10) || 1)); };
    var sync = function () {
      var n = clamp(qty.value);
      qty.value = n;
      sum.textContent = money(p.price * n);
      minus.disabled = n <= 1;
      plusBtn.disabled = n >= 99;
    };
    root.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () { qty.value = clamp(+qty.value + +b.getAttribute('data-step')); sync(); });
    });
    qty.addEventListener('change', sync);
    qty.addEventListener('input', function () { if (qty.value !== '') sum.textContent = money(p.price * clamp(qty.value)); });
    add.addEventListener('click', function () {
      Shop.cart.add(p.id, clamp(qty.value));
      flash(add, 'Добавлено');
      Shop.toast('Добавлено в корзину', 'cart.html', 'Открыть корзину');
    });
    document.getElementById('buy-now').addEventListener('click', function () {
      Shop.cart.add(p.id, clamp(qty.value));
      location.href = 'cart.html';
    });
    sync();
  }

  function bindSet() {
    var grid = root.querySelector('.set-grid');
    if (!grid) return;
    var items = Array.prototype.slice.call(grid.querySelectorAll('.set-item'));
    var btn = document.getElementById('set-add');
    var countEl = document.getElementById('set-count');
    var totalEl = document.getElementById('set-total');
    var picked = function () { return items.filter(function (it) { return it.querySelector('input').checked; }); };
    var update = function () {
      var on = picked(), sum = 0;
      items.forEach(function (it) { it.classList.toggle('is-off', on.indexOf(it) === -1); });
      on.forEach(function (it) { sum += +it.getAttribute('data-price'); });
      countEl.textContent = on.length ? 'Выбрано: ' + on.length + ' ' + plural(on.length, 'предмет', 'предмета', 'предметов') : 'Ничего не выбрано';
      totalEl.textContent = money(sum);
      btn.disabled = !on.length;
    };
    grid.addEventListener('change', update);
    btn.addEventListener('click', function () {
      var on = picked();
      if (!on.length) return;
      on.forEach(function (it) { Shop.cart.add(it.getAttribute('data-id'), 1); });
      flash(btn, 'Добавлено');
      Shop.toast(on.length === 1 ? 'Добавлено в корзину' : 'Добавлено в корзину: ' + on.length + ' ' + plural(on.length, 'предмет', 'предмета', 'предметов'),
        'cart.html', 'Открыть корзину');
    });
    update();
  }

  Shop.catalog().then(function (data) {
    var p = data.bySlug[key] || data.byId[key];
    if (!p) return notFound('Возможно, его убрали из каталога. Посмотрите другие предметы.');
    render(p, data);
  }).catch(function () {
    notFound('Не удалось загрузить каталог. Обновите страницу через минуту.');
  });
})();
