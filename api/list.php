<?php
/*
 * docum backend: list documents (filesystem persistence).
 * Returns a JSON array of { name, mode, updatedAt, size }.
 */
header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/data';
$result = [];

if (is_dir($dataDir)) {
    foreach (glob($dataDir . '/*.json') as $file) {
        $raw = file_get_contents($file);
        $doc = json_decode($raw, true);
        if ($doc && !empty($doc['name'])) {
            $result[] = [
                'name'      => $doc['name'],
                'mode'      => isset($doc['mode']) ? $doc['mode'] : 'txt',
                'updatedAt' => isset($doc['updatedAt']) ? $doc['updatedAt'] : null,
                'size'      => isset($doc['content']) ? strlen($doc['content']) : 0
            ];
        }
    }
}

echo json_encode($result);
