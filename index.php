<?php
// BottleLore — Server-side config injection
// Supabase credentials injected here so JS never hardcodes keys

$supabaseUrl = getenv('VITE_SUPABASE_URL') ?: 'https://okfplzjguiyxzybcxkzn.supabase.co';
$supabaseAnonKey = getenv('VITE_SUPABASE_ANON_KEY') ?: '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BottleLore</title>
    <script>
        window.APP_CONFIG = {
            SUPABASE_URL: <?= json_encode($supabaseUrl) ?>,
            SUPABASE_ANON_KEY: <?= json_encode($supabaseAnonKey) ?>
        };
    </script>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="/assets/dist/main.js"></script>
</body>
</html>
