<?php
// Приём заказа из корзины (вызывается со страницы cart.html).
require __DIR__ . '/_app.php';
Orders::handle();
