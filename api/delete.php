<?php
/*
 * docum backend: delete a document by (unique) name.
 * Returns { ok: true }.
 */
header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/data';
$name = isset($_GET['name']) ? $_GET['name'] : '';

if ($name === '' || !preg_match('/^[A-Za-z0-9._-]+$/', $name)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid name']);
    exit;
}

$file = $dataDir . '/' . $name . '.json';
if (is_file($file)) {
    unlink($file);
}

echo json_encode(['ok' => true]);
