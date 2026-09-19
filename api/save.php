<?php
/*
 * docum backend: save a document to the filesystem.
 * Expects a JSON body: { name, mode, content }.
 * Returns { ok, meta } where meta = { name, mode, updatedAt, size }.
 */
header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['name'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'name is required']);
    exit;
}

$name = $input['name'];
if (!preg_match('/^[A-Za-z0-9._-]+$/', $name)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid name']);
    exit;
}

$mode = isset($input['mode']) ? $input['mode'] : 'txt';
$content = isset($input['content']) ? $input['content'] : '';
$updatedAt = gmdate('c');

$doc = [
    'name'      => $name,
    'mode'      => $mode,
    'content'   => $content,
    'updatedAt' => $updatedAt
];

file_put_contents($dataDir . '/' . $name . '.json', json_encode($doc, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

echo json_encode([
    'ok'   => true,
    'meta' => [
        'name'      => $name,
        'mode'      => $mode,
        'updatedAt' => $updatedAt,
        'size'      => strlen($content)
    ]
]);
