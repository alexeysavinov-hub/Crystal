/* Подарки: подборки из каталога. Сначала — предметы, которые производитель выпускает в подарочной
   упаковке (так сказано в названии), затем — по бюджету: до 15, 30, 50 тысяч рублей и дороже
   (если цены в евро — до 150, 300, 500 €). В подборки попадают только предметы в наличии; ссылка
   «Все …» открывает каталог с тем же фильтром. Цены — те же, что в каталоге. */
(function () {
  'use strict';

  var esc = Shop.esc;
  var box = document.querySelector('[data-gifts]');
  var nav = document.querySelector('[data-gift-nav]');
  if (!box) return;

  var TAGS = ['Знак внимания', 'Подарок к празднику', 'Для близких', 'Особенный подарок'];
  var byPriceDown = function (a, b) { return b.price - a.price || a.name.localeCompare(b.name, 'ru'); };
  var byPriceUp = function (a, b) { return a.price - b.price || a.name.localeCompare(b.name, 'ru'); };

  function count(n) { return n + ' ' + Shop.plural(n, 'предмет', 'предмета', 'предметов'); }

  // «Кружки, стаканы для воды и пепельницы» — каких вещей в подборке больше всего
  function kinds(list) {
    var c = {};
    list.forEach(function (p) { if (p.type && !/^для /i.test(p.type)) c[p.type] = (c[p.type] || 0) + 1; });
    var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b, 'ru'); }).slice(0, 3)
      .map(function (t) { return t.charAt(0).toLowerCase() + t.slice(1); });
    if (!top.length) return '';
    return top.length === 1 ? top[0] : top.slice(0, -1).join(', ') + ' и ' + top[top.length - 1];
  }

  // восемь предметов (или четыре — ровно ряд): сначала по одному каждого вида, чтобы подборка
  // не состояла из одних кружек, потом остальные; показываем в том же порядке цен
  function pick(list, cmp) {
    var sorted = list.slice().sort(cmp);
    var n = sorted.length >= 8 ? 8 : sorted.length >= 4 ? 4 : sorted.length;
    var seen = {}, first = [], rest = [];
    sorted.forEach(function (p) {
      var k = p.type || p.id;
      if (seen[k]) rest.push(p); else { seen[k] = true; first.push(p); }
    });
    return first.concat(rest).slice(0, n).sort(cmp);
  }

  function sectionHtml(s, i) {
    var shown = pick(s.items, s.cmp);
    return '<section class="gift-sec' + (i % 2 ? ' sand' : '') + '" id="' + s.id + '" aria-labelledby="' + s.id + '-t">' +
      '<div class="wrap">' +
        '<div class="gift-head">' +
          '<div><p class="eyebrow">' + esc(s.tag) + '</p><h2 id="' + s.id + '-t">' + esc(s.title) + '</h2>' +
            (s.lead ? '<p>' + esc(s.lead) + '</p>' : '') + '</div>' +
          '<a class="arrow-link" href="' + esc(s.url) + '">' +
            (s.items.length > shown.length ? 'Все ' + esc(count(s.items.length)) : 'Смотреть в каталоге') +
            Shop.icon('arrow', '', 1.5) + '</a>' +
        '</div>' +
        '<div class="gift-grid' + (shown.length === 4 ? ' gift-grid--4' : '') + '">' + shown.map(Shop.card).join('') + '</div>' +
      '</div>' +
    '</section>';
  }

  function fail(text) {
    box.innerHTML = '<div class="wrap"><div class="notice" style="margin:0 auto;text-align:center"><h2>Подборки пока пусты</h2><p>' + text + '</p></div></div>';
    if (nav) nav.hidden = true;
  }

  Shop.catalog().then(function (data) {
    var all = data.products.filter(function (p) { return !p.removed && p.available && p.price > 0; });
    if (!all.length) return fail('Сейчас в каталоге нет предметов в наличии. Загляните после ближайшего обновления.');

    var eur = data.currency === 'EUR';
    var sym = eur ? ' €' : ' ₽';
    var num = function (v) { return Number(v).toLocaleString('ru-RU'); };
    var edges = eur ? [0, 150, 300, 500, Infinity] : [0, 15000, 30000, 50000, Infinity];

    var sections = [];
    var wrapped = all.filter(function (p) { return /подарочн/i.test(p.name); });
    if (wrapped.length) {
      sections.push({
        id: 'g-wrap', tag: 'Упаковка производителя', title: 'В подарочной упаковке', nav: 'В подарочной упаковке',
        lead: 'Эти предметы производитель выпускает в подарочной коробке — так сказано в их названии.',
        items: wrapped, cmp: byPriceUp, url: Shop.catalogUrl({ q: 'подарочной', stock: 1 })
      });
    }
    for (var b = 0; b < 4; b++) {
      var lo = edges[b], hi = edges[b + 1];
      var items = all.filter(function (p) { return p.price > lo && p.price <= hi; });
      if (!items.length) continue;
      var title = !lo ? 'До ' + num(hi) + sym : hi === Infinity ? 'Дороже ' + num(lo) + sym : num(lo) + '–' + num(hi) + sym;
      var what = kinds(items);
      sections.push({
        id: 'g-' + (b + 1), tag: TAGS[b], title: title, nav: title,
        lead: what ? 'Чаще всего здесь ' + what + '.' : '',
        items: items, cmp: hi === Infinity ? byPriceUp : byPriceDown,
        url: Shop.catalogUrl({ min: lo ? lo + 1 : 0, max: hi === Infinity ? 0 : hi, stock: 1, sort: hi === Infinity ? 'cheap' : 'expensive' })
      });
    }

    box.innerHTML = sections.map(sectionHtml).join('');
    if (nav) {
      nav.innerHTML = sections.map(function (s) {
        return '<a href="#' + s.id + '">' + esc(s.nav) + ' <small>' + s.items.length + '</small></a>';
      }).join('');
    }
  }).catch(function (err) {
    fail(err && err.missing
      ? 'Запустите синхронизацию: <code>python3 app/sync.py</code> — после первого запуска здесь появятся подборки.'
      : 'Не удалось загрузить каталог. Обновите страницу через минуту.');
  });
})();
