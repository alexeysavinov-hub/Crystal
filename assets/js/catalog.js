/* Каталог: фильтры слева (бренды, предметы, дизайнеры, цена), поиск, сортировка, страницы.
   Состояние хранится в адресе страницы — ссылку с фильтрами можно отправить, «Назад» работает. */
(function () {
  'use strict';

  var PER_PAGE = 12;
  var GROUPS = ['brand', 'type', 'designer'];
  var form = document.getElementById('filters');
  var grid = document.getElementById('grid');
  var pager = document.getElementById('pagination');
  var countEl = document.getElementById('result-count');
  var sortSel = document.querySelector('select[name="sort"]');
  var resetBtn = form.querySelector('[data-reset]');
  var filterCount = document.querySelector('[data-filter-count]');
  var showBtn = document.querySelector('[data-show-results]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var all = [];
  var lists = {};                 // группа → значение → {input, label, small}
  var state = readUrl();

  function readUrl() {
    var q = new URLSearchParams(location.search);
    var num = function (k) { var v = parseInt(q.get(k), 10); return isFinite(v) && v >= 0 ? v : null; };
    return {
      brand: q.getAll('brand'), type: q.getAll('type'), designer: q.getAll('designer'),
      q: q.get('q') || '', sort: q.get('sort') || 'new', stock: q.get('stock') === '1',
      min: num('min'), max: num('max'), page: Math.max(1, parseInt(q.get('page'), 10) || 1)
    };
  }

  function writeUrl(push) {
    var q = new URLSearchParams();
    GROUPS.forEach(function (g) { state[g].forEach(function (v) { q.append(g, v); }); });
    if (state.q) q.set('q', state.q);
    if (state.min != null) q.set('min', state.min);
    if (state.max != null) q.set('max', state.max);
    if (state.stock) q.set('stock', '1');
    if (state.sort !== 'new') q.set('sort', state.sort);
    if (state.page > 1) q.set('page', state.page);
    var s = q.toString();
    var url = s ? '?' + s : location.pathname;
    if (push) history.pushState(null, '', url); else history.replaceState(null, '', url);
  }

  function matches(p, skip) {
    for (var i = 0; i < GROUPS.length; i++) {
      var g = GROUPS[i];
      if (g !== skip && state[g].length && state[g].indexOf(p[g]) === -1) return false;
    }
    if (state.stock && !p.available) return false;
    if (state.min != null && p.price < state.min) return false;
    if (state.max != null && p.price > state.max) return false;
    if (state.q) {
      var words = Shop.norm(state.q).split(/\s+/).filter(Boolean);
      for (var j = 0; j < words.length; j++) if (p._search.indexOf(words[j]) === -1) return false;
    }
    return true;
  }

  // ------------------------------------------------------------ списки фильтров
  function buildFacets() {
    GROUPS.forEach(function (g) {
      var values = {};
      all.forEach(function (p) { if (p[g]) values[p[g]] = true; });
      state[g].forEach(function (v) { values[v] = true; });      // выбранное в ссылке, даже если такого уже нет
      var keys = Object.keys(values).sort(function (a, b) {
        if (a === Shop.OTHER_BRAND) return 1;
        if (b === Shop.OTHER_BRAND) return -1;
        return a.localeCompare(b, 'ru');
      });
      var box = form.querySelector('[data-facet="' + g + '"]');
      box.innerHTML = keys.map(function (v) {
        return '<label class="check"><input type="checkbox" name="' + g + '" value="' + Shop.esc(v) + '">' +
          '<span>' + Shop.esc(v) + ' <small></small></span></label>';
      }).join('');
      box.closest('fieldset').hidden = !keys.length;
      lists[g] = {};
      box.querySelectorAll('input').forEach(function (inp) {
        var label = inp.closest('label');
        lists[g][inp.value] = { input: inp, label: label, small: label.querySelector('small') };
      });
    });
    var prices = all.map(function (p) { return p.price; }).filter(function (v) { return v > 0; });
    if (prices.length) {
      form.elements.min.placeholder = 'от ' + Math.floor(Math.min.apply(null, prices)).toLocaleString('ru-RU');
      form.elements.max.placeholder = 'до ' + Math.ceil(Math.max.apply(null, prices)).toLocaleString('ru-RU');
    }
  }

  // сколько предметов даст каждый вариант при остальных выбранных фильтрах
  function updateFacets() {
    GROUPS.forEach(function (g) {
      var c = {};
      all.forEach(function (p) { if (p[g] && matches(p, g)) c[p[g]] = (c[p[g]] || 0) + 1; });
      Object.keys(lists[g]).forEach(function (v) {
        var it = lists[g][v], n = c[v] || 0, on = state[g].indexOf(v) !== -1;
        it.input.checked = on;
        it.small.textContent = n;
        it.label.classList.toggle('is-empty', !n && !on);
      });
    });
  }

  function syncForm() {
    form.elements.q.value = state.q;
    form.elements.min.value = state.min != null ? state.min : '';
    form.elements.max.value = state.max != null ? state.max : '';
    form.elements.stock.checked = state.stock;
    sortSel.value = state.sort;
    if (!sortSel.value) { state.sort = 'new'; sortSel.value = 'new'; }
  }

  function activeCount() {
    return GROUPS.reduce(function (s, g) { return s + state[g].length; }, 0) +
      (state.q ? 1 : 0) + (state.min != null || state.max != null ? 1 : 0) + (state.stock ? 1 : 0);
  }

  // ------------------------------------------------------------ результаты
  function sorted(list) {
    var out = list.slice();
    var avail = function (p) { return p.available ? 0 : 1; };
    if (state.sort === 'cheap') out.sort(function (a, b) { return avail(a) - avail(b) || a.price - b.price; });
    if (state.sort === 'expensive') out.sort(function (a, b) { return avail(a) - avail(b) || b.price - a.price; });
    if (state.sort === 'name') out.sort(function (a, b) { return a.name.localeCompare(b.name, 'ru'); });
    return out;
  }

  var ARROW_PREV = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>';
  var ARROW_NEXT = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>';

  function renderPager(page, total) {
    if (total < 2) { pager.hidden = true; pager.innerHTML = ''; return; }
    var html = '';
    if (page > 1) html += '<li><button type="button" data-page="' + (page - 1) + '" aria-label="Предыдущая страница">' + ARROW_PREV + '</button></li>';
    var prev = 0;
    for (var n = 1; n <= total; n++) {
      if (n !== 1 && n !== total && Math.abs(n - page) > 2) continue;
      if (n - prev > 1) html += '<li><span class="gap" aria-hidden="true">…</span></li>';
      html += '<li><button type="button" data-page="' + n + '"' + (n === page ? ' aria-current="page"' : '') +
        ' aria-label="Страница ' + n + '">' + n + '</button></li>';
      prev = n;
    }
    if (page < total) html += '<li><button type="button" data-page="' + (page + 1) + '" aria-label="Следующая страница">' + ARROW_NEXT + '</button></li>';
    pager.innerHTML = '<ul>' + html + '</ul>';
    pager.hidden = false;
  }

  function render(push) {
    updateFacets();
    var list = sorted(all.filter(function (p) { return matches(p); }));
    var total = list.length;
    var totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (state.page > totalPages) state.page = totalPages;
    var from = (state.page - 1) * PER_PAGE;
    var shown = list.slice(from, from + PER_PAGE);

    grid.innerHTML = shown.length ? shown.map(Shop.card).join('')
      : '<div class="notice"><h2>Ничего не нашлось</h2><p>Попробуйте другое слово или уберите часть фильтров.</p>' +
        '<button type="button" class="btn btn--outline" data-reset>Сбросить фильтры</button></div>';
    countEl.textContent = !total ? 'Ничего не найдено'
      : total > PER_PAGE ? 'Показано ' + (from + 1) + '–' + (from + shown.length) + ' из ' + total
      : 'Найдено ' + total + ' ' + Shop.plural(total, 'предмет', 'предмета', 'предметов');
    renderPager(state.page, totalPages);

    var active = activeCount();
    resetBtn.hidden = !active;
    if (filterCount) filterCount.textContent = active ? ' (' + active + ')' : '';
    if (showBtn) showBtn.textContent = total ? 'Показать ' + total + ' ' + Shop.plural(total, 'предмет', 'предмета', 'предметов') : 'Ничего не найдено';
    writeUrl(push);
  }

  function reset() {
    state = { brand: [], type: [], designer: [], q: '', sort: state.sort, stock: false, min: null, max: null, page: 1 };
    syncForm();
    render(true);
  }

  // ------------------------------------------------------------ события
  var timer = null;
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.name !== 'q' && t.name !== 'min' && t.name !== 'max') return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (t.name === 'q') state.q = t.value.trim();
      else { var v = parseInt(t.value, 10); state[t.name] = isFinite(v) && v >= 0 ? v : null; }
      state.page = 1;
      render(false);
    }, t.name === 'q' ? 250 : 500);
  });
  form.addEventListener('change', function (e) {
    var t = e.target;
    if (GROUPS.indexOf(t.name) !== -1) {
      var list = state[t.name].filter(function (v) { return v !== t.value; });
      if (t.checked) list.push(t.value);
      state[t.name] = list;
    } else if (t.name === 'stock') {
      state.stock = t.checked;
    } else {
      return;
    }
    state.page = 1;
    render(true);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(timer);
    state.q = form.elements.q.value.trim();
    state.page = 1;
    render(true);
  });
  sortSel.addEventListener('change', function () { state.sort = sortSel.value; state.page = 1; render(true); });
  resetBtn.addEventListener('click', reset);
  grid.addEventListener('click', function (e) { if (e.target.closest('[data-reset]')) reset(); });
  pager.addEventListener('click', function (e) {
    var b = e.target.closest('[data-page]');
    if (!b || b.getAttribute('aria-current')) return;
    state.page = +b.getAttribute('data-page');
    render(true);
    document.querySelector('.results').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
  });
  window.addEventListener('popstate', function () {
    if (!all.length) return;
    state = readUrl();
    syncForm();
    render(false);
  });

  syncForm();
  grid.innerHTML = new Array(7).join('<div class="card"><div class="card-media skeleton"></div></div>');

  Shop.catalog().then(function (data) {
    all = data.products.filter(function (p) { return !p.removed || p.available; });
    buildFacets();
    render(false);
  }).catch(function (err) {
    grid.innerHTML = '<div class="notice"><h2>Каталог ещё не загружен</h2><p>' +
      (err && err.missing
        ? 'Запустите синхронизацию: <code>python3 app/sync.py</code>. После первого запуска здесь появятся товары.'
        : 'Не удалось загрузить каталог. Обновите страницу через минуту.') + '</p></div>';
    countEl.textContent = '';
  });
})();
