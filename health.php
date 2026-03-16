<?php
// Quick server health check — hit /health.php directly
header('Content-Type: text/plain');
echo "OK\n";
echo "PHP: " . phpversion() . "\n";
echo "Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "Manifest: " . (file_exists(__DIR__ . '/assets/dist/.vite/manifest.json') ? 'EXISTS' : 'MISSING') . "\n";
echo "Config: " . (file_exists(__DIR__ . '/api/config.php') ? 'EXISTS' : 'MISSING') . "\n";
