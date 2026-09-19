<?php
/*
 * docum backend: load a single document by (unique) name.
 * Returns the document object, or null when not found.
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
if (!is_file($file)) {
    echo 'null';
    exit;
}

echo file_get_contents($file);
