<?php
/**
 * Где лежит папка app. По умолчанию — рядом с папкой сайта:
 *   /home/user/app          ← настройки, скрипт, заказы
 *   /home/user/public_html  ← сайт
 * Если вы положили app в другое место, поправьте путь ниже.
 */
define('APP_DIR', realpath(__DIR__ . '/../../app') ?: __DIR__ . '/../../app');

if (!is_file(APP_DIR . '/lib/bootstrap.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Сайт настроен не до конца: не найдена папка app (см. public_html/api/_app.php)'], JSON_UNESCAPED_UNICODE);
    exit;
}
require APP_DIR . '/lib/bootstrap.php';
