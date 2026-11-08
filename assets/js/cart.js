/* Корзина и оформление заказа: заказ уходит в api/order.php, оттуда — письмом. */
(function () {
  'use strict';

  var root = document.getElementById('cart-root');
  var CUSTOMER_KEY = 'cristallo-customer-v1';
  var openedAt = Date.now();
  var catalog = null;

  function savedCustomer() {
    try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function lines() {
    return Shop.cart.items().map(function (i) {
      var p = catalog.byId[i.id];
      return { id: i.id, qty: i.qty, p: p, ok: !!(p && p.available) };
    });
  }

  function render() {
    var list = lines();
    if (!list.length) {
      root.innerHTML = '<div class="notice"><h2>Корзина пуста</h2><p>Выберите что-нибудь в каталоге — товары появятся здесь.</p>' +
        '<a class="btn" href="catalog.html">Перейти в каталог</a></div>';
      return;
    }
    var total = 0, count = 0, bad = 0;
    var html = '<ul class="lines">' + list.map(function (l) {
      if (!l.p) {
        bad++;
        return '<li class="line"><div class="line-media"></div><div><span class="line-name">Товар больше не продаётся</span>' +
          '<div class="line-meta"><span class="warn">Уберите его из корзины, чтобы оформить заказ.</span></div>' +
          '<div class="line-actions"><button type="button" class="link-button" data-remove="' + Shop.esc(l.id) + '">Убрать</button></div></div><div></div></li>';
      }
      var p = l.p, sum = p.price * l.qty, img = p.images[0];
      if (l.ok) { total += sum; count += l.qty; } else { bad++; }
      var meta = 'Арт. ' + Shop.esc(p.sku);
      if (!l.ok) meta += '<br><span class="warn">Сейчас нет в наличии — уберите из корзины, чтобы оформить заказ.</span>';
      else if (p.preorder) meta += '<br><span class="pre">' + Shop.esc(p.preorder) + '</span>';
      return '<li class="line">' +
        '<a class="line-media" href="' + Shop.productUrl(p) + '" tabindex="-1" aria-hidden="true">' + (img ? '<img src="' + Shop.esc(img.thumb || img.src) + '" alt="">' : '') + '</a>' +
        '<div><a class="line-name" href="' + Shop.productUrl(p) + '">' + Shop.esc(Shop.typo(p.name)) + '</a>' +
          '<div class="line-meta">' + meta + '</div>' +
          '<div class="line-actions">' +
            (l.ok ? '<div class="qty qty--small"><button type="button" data-step="-1" data-id="' + Shop.esc(l.id) + '" aria-label="Меньше"' + (l.qty <= 1 ? ' disabled' : '') + '>−</button>' +
              '<input type="number" min="1" max="99" value="' + l.qty + '" data-qty="' + Shop.esc(l.id) + '" inputmode="numeric" aria-label="Количество">' +
              '<button type="button" data-step="1" data-id="' + Shop.esc(l.id) + '" aria-label="Больше"' + (l.qty >= 99 ? ' disabled' : '') + '>+</button></div>' : '') +
            '<button type="button" class="link-button" data-remove="' + Shop.esc(l.id) + '">Убрать</button>' +
          '</div></div>' +
        '<div class="line-sum">' + Shop.money(sum) + (l.qty > 1 ? '<div class="line-unit">' + Shop.money(p.price) + ' за шт.</div>' : '') + '</div>' +
      '</li>';
    }).join('') + '</ul>';

    var c = savedCustomer();
    var field = function (name, label, type, extra, optional) {
      return '<div class="field" data-field="' + name + '"><label for="f-' + name + '">' + label + (optional ? ' <span class="opt">(необязательно)</span>' : '') + '</label>' +
        (type === 'textarea'
          ? '<textarea class="input" id="f-' + name + '" name="' + name + '" rows="3" maxlength="1000">' + Shop.esc(c[name] || '') + '</textarea>'
          : '<input class="input" id="f-' + name + '" name="' + name + '" type="' + type + '" value="' + Shop.esc(c[name] || '') + '" ' + extra + '>') +
        '<div class="error" id="e-' + name + '" aria-live="polite"></div></div>';
    };

    html = '<div class="cart"><div class="cart-box">' + html + '</div>' +
      '<aside class="summary" aria-label="Оформление заказа">' +
        '<p class="summary-total"><span>' + count + ' ' + Shop.plural(count, 'товар', 'товара', 'товаров') + '</span><strong>' + Shop.money(total) + '</strong></p>' +
        '<p class="summary-note">Оплата и доставка — после того как мы подтвердим заказ по телефону.</p>' +
        '<form class="form" id="order-form" novalidate>' +
          '<h2>Контакты</h2>' +
          field('name', 'Имя', 'text', 'autocomplete="name" maxlength="100" required') +
          field('phone', 'Телефон', 'tel', 'autocomplete="tel" maxlength="40" required') +
          field('email', 'Электронная почта', 'email', 'autocomplete="email" maxlength="120" required') +
          field('address', 'Город и адрес доставки', 'text', 'autocomplete="street-address" maxlength="300"', true) +
          field('comment', 'Комментарий к заказу', 'textarea', '', true) +
          '<div class="hp" aria-hidden="true"><label>Сайт <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
          '<div class="form-error" id="form-error" role="alert" hidden></div>' +
          '<button class="btn btn--block" type="submit"' + (bad ? ' disabled' : '') + '>Отправить заказ</button>' +
          (bad ? '<p class="form-legal">Сначала уберите из корзины товары, которых нет в наличии.</p>'
               : '<p class="form-legal">Заказ придёт нам на почту, копия — вам.</p>') +
        '</form>' +
      '</aside></div>';
    root.innerHTML = html;
    bind();
  }

  function bind() {
    root.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () { Shop.cart.remove(b.getAttribute('data-remove')); render(); });
    });
    root.querySelectorAll('[data-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id');
        var q = Math.min(99, Math.max(1, Shop.cart.qty(id) + +b.getAttribute('data-step')));
        Shop.cart.set(id, q);
        keepFormAndRender();
      });
    });
    root.querySelectorAll('[data-qty]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        Shop.cart.set(inp.getAttribute('data-qty'), Math.min(99, Math.max(1, parseInt(inp.value, 10) || 1)));
        keepFormAndRender();
      });
    });
    var form = document.getElementById('order-form');
    if (form) form.addEventListener('submit', submit);
  }

  // при смене количества не теряем то, что человек уже ввёл в форму
  function keepFormAndRender() {
    var form = document.getElementById('order-form');
    if (form) saveCustomer(readForm(form));
    render();
  }

  function readForm(form) {
    var get = function (n) { return form.elements[n] ? form.elements[n].value.trim() : ''; };
    return { name: get('name'), phone: get('phone'), email: get('email'), address: get('address'), comment: get('comment') };
  }

  function saveCustomer(c) {
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)); } catch (e) {}
  }

  function setError(name, text) {
    var f = root.querySelector('[data-field="' + name + '"]');
    if (!f) return;
    f.classList.toggle('has-error', !!text);
    var input = f.querySelector('.input');
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    if (text) input.setAttribute('aria-describedby', 'e-' + name); else input.removeAttribute('aria-describedby');
    f.querySelector('.error').textContent = text || '';
  }

  function validate(c) {
    var errors = {};
    if (c.name.length < 2) errors.name = 'Укажите имя';
    var digits = c.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) errors.phone = 'Укажите телефон — по нему мы подтвердим заказ';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errors.email = 'Проверьте адрес почты — на него придёт подтверждение';
    ['name', 'phone', 'email'].forEach(function (n) { setError(n, errors[n]); });
    return errors;
  }

  function submit(e) {
    e.preventDefault();
    var form = e.target;
    var c = readForm(form);
    var errors = validate(c);
    var first = Object.keys(errors)[0];
    if (first) { form.elements[first].focus(); return; }
    saveCustomer(c);

    var list = lines().filter(function (l) { return l.ok; });
    var total = list.reduce(function (s, l) { return s + l.p.price * l.qty; }, 0);
    var btn = form.querySelector('button[type="submit"]');
    var errBox = document.getElementById('form-error');
    errBox.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    fetch('api/order.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: list.map(function (l) { return { id: l.id, qty: l.qty }; }),
        customer: c, total: total, website: form.elements.website.value, elapsed: Date.now() - openedAt
      })
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'Сервер ответил с ошибкой (' + r.status + ').' }; });
    }).then(function (res) {
      if (!res.ok) throw new Error(res.error || 'Не удалось отправить заказ.');
      Shop.cart.clear();
      done(res, c);
    }).catch(function (err) {
      errBox.textContent = err && err.message && err.message !== 'Failed to fetch'
        ? err.message
        : 'Нет связи с сервером. Проверьте интернет и отправьте заказ ещё раз.';
      errBox.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Отправить заказ';
    });
  }

  function done(res, c) {
    document.querySelector('.page-title').textContent = 'Заказ отправлен';
    root.innerHTML = '<div class="done">' +
      '<p>Номер заказа — ' + Shop.esc(res.order) + ', сумма ' + Shop.money(res.total, res.currency) + '. ' +
      (res.mailed && res.mailed.customer ? 'Подтверждение отправлено на ' + Shop.esc(c.email) + '. ' : '') +
      'Мы свяжемся с вами по телефону ' + Shop.esc(c.phone) + ', чтобы подтвердить заказ.</p>' +
      (res.note ? '<p>' + Shop.esc(res.note) + '</p>' : '') +
      '<a class="btn" href="catalog.html">Вернуться в каталог</a></div>';
    window.scrollTo(0, 0);
  }

  Shop.catalog().then(function (data) {
    catalog = data;
    render();
  }).catch(function () {
    root.innerHTML = '<div class="notice"><h2>Не удалось загрузить каталог</h2><p>Обновите страницу через минуту — корзина сохранится.</p></div>';
  });

  window.addEventListener('storage', function () { if (catalog && !document.querySelector('.done')) keepFormAndRender(); });
})();
