/* Дизайнеры: отдельная страница. Каждый дизайнер — мягкая карточка с оттиском печати:
   монограмма, имя латиницей по верхней дуге, годы жизни по нижней; ниже — имя, главная коллекция,
   число предметов и ссылка на его работы в каталоге. */
(function () {
  'use strict';

  var esc = Shop.esc, norm = Shop.norm;

  // Годы жизни — здесь (в каталоге их нет); ключ — имя латиницей, как его пишет производитель.
  // Кого в списке нет, тот получает печать без годов (ромб на нижней дуге). Порядок — по году рождения,
  // от миланских классиков к современникам; без годов — в конце, у кого больше предметов — раньше.
  var YEARS = {
    'marco zanuso': '1916–2001', 'ettore sottsass': '1917–2007', 'cini boeri': '1924–2020', 'sergio asti': '1926–2021',
    'joe colombo': '1930–1971', 'enzo mari': '1932–2020', 'oscar tusquets blanca': '1941', 'toshiyuki kita': '1942',
    'michele de lucchi': '1951', 'alfredo haberli': '1964', 'alfredo häberli': '1964', 'konstantin grcic': '1965'
  };

  function count(n) { return n + ' ' + Shop.plural(n, 'предмет', 'предмета', 'предметов'); }

  function designerSeals(products) {
    var map = {};
    products.forEach(function (p) {
      if (!p.designer) return;
      var d = map[p.designer] || (map[p.designer] = { name: p.designer, latin: '', count: 0, collections: {} });
      d.count++;
      if (p.designer_lat && !d.latin) d.latin = p.designer_lat;
      if (p.collection) d.collections[p.collection] = (d.collections[p.collection] || 0) + 1;
    });
    return Object.keys(map).map(function (k, i) {
      var d = map[k];
      var latin = d.latin.replace(/\s*,?\s*jr\.?$/i, '').trim();
      var years = YEARS[norm(latin)] || '';
      var words = (latin || d.name).split(/\s+/).filter(Boolean);
      var top = Object.keys(d.collections).sort(function (a, b) { return d.collections[b] - d.collections[a] || a.localeCompare(b); })[0];
      return {
        key: 'd' + i, name: d.name, latin: latin, years: years, born: parseInt(years, 10) || 0, count: d.count,
        initials: words.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(''),
        collection: top || ''
      };
    }).sort(function (a, b) {
      if (a.born && b.born) return a.born - b.born;
      if (a.born !== b.born) return a.born ? -1 : 1;
      return b.count - a.count || a.name.localeCompare(b.name, 'ru');
    });
  }

  function sealHtml(d) {
    var hidden = (d.years ? ', ' + d.years : '');
    return '<li><a class="seal-cell dz-card" href="' + esc(Shop.catalogUrl({ designer: d.name })) + '">' +
      '<span class="seal"><svg viewBox="0 0 140 140" aria-hidden="true">' +
        '<path id="st-' + d.key + '" d="M16 70A54 54 0 0 1 124 70" fill="none"/><path id="sb-' + d.key + '" d="M10 70A60 60 0 0 0 130 70" fill="none"/>' +
        '<circle class="seal-hi" cx="70.6" cy="70.8" r="66"/><circle class="seal-ring" cx="70" cy="70" r="66"/>' +
        '<circle class="seal-hi" cx="70.6" cy="70.8" r="47"/><circle class="seal-ring" cx="70" cy="70" r="47"/>' +
        '<circle class="seal-trace" cx="70" cy="70" r="66" transform="rotate(-90 70 70)"/>' +
        '<text class="seal-legend" text-anchor="middle"><textPath href="#st-' + d.key + '" startOffset="50%">' + esc((d.latin || d.name).toUpperCase()) + '</textPath></text>' +
        '<text class="seal-legend" text-anchor="middle"><textPath href="#sb-' + d.key + '" startOffset="50%">' + esc(d.years || '◆') + '</textPath></text>' +
        '<path class="seal-orn" d="M13 66.5l3.5 3.5-3.5 3.5-3.5-3.5z"/><path class="seal-orn" d="M127 66.5l3.5 3.5-3.5 3.5-3.5-3.5z"/>' +
      '</svg><span class="seal-mono" aria-hidden="true">' + esc(d.initials) + '</span></span>' +
      '<span class="seal-name">' + esc(Shop.typo(d.name)) + '</span>' +
      '<span class="visually-hidden">' + esc(hidden) + '</span>' +
      '<span class="dz-meta">' + (d.collection ? '<span class="chip">' + esc(d.collection) + '</span>' : '') + '<span>' + esc(count(d.count)) + '</span></span>' +
      '<span class="dz-more">Смотреть работы' + Shop.icon('arrow', '', 1.5) + '</span>' +
    '</a></li>';
  }

  var box = document.querySelector('[data-designers]');
  var sum = document.querySelector('[data-designers-sum]');

  function fail(text) {
    box.innerHTML = '<li class="notice" style="grid-column:1/-1;margin:0 auto;text-align:center"><h2>Каталог ещё не загружен</h2><p>' + text + '</p></li>';
  }

  Shop.catalog().then(function (data) {
    var all = data.products.filter(function (p) { return !p.removed; });
    var list = designerSeals(all);
    if (!list.length) return fail('Пока в каталоге нет предметов с указанным дизайнером.');
    var works = list.reduce(function (s, d) { return s + d.count; }, 0);
    if (sum) sum.innerHTML = '<span class="chip">' + list.length + ' ' + Shop.plural(list.length, 'дизайнер', 'дизайнера', 'дизайнеров') + '</span>' +
      '<span class="chip">' + esc(count(works)) + ' в каталоге</span>';
    box.innerHTML = list.map(sealHtml).join('');
  }).catch(function (err) {
    fail(err && err.missing
      ? 'Запустите синхронизацию: <code>python3 app/sync.py</code> — после первого запуска здесь появятся дизайнеры.'
      : 'Не удалось загрузить каталог. Обновите страницу через минуту.');
  });
})();
