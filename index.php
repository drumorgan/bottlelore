<?php
require_once __DIR__ . '/api/config.php';

// Read Vite manifest to get hashed bundle filename
$manifestPath = __DIR__ . '/assets/dist/.vite/manifest.json';
$bundleFile = null;

if (file_exists($manifestPath)) {
  $manifest = json_decode(file_get_contents($manifestPath), true);
  if (isset($manifest['assets/js/app.js']['file'])) {
    $bundleFile = '/assets/dist/' . $manifest['assets/js/app.js']['file'];
  }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BottleLore</title>
    <link rel="stylesheet" href="/assets/css/main.css">
    <link rel="stylesheet" href="/assets/css/bottle-page.css">
    <link rel="stylesheet" href="/assets/css/admin.css">

    <!-- Sentry (load before app) -->
    <?php if (!empty($sentryDsn)): ?>
    <script
      src="https://js.sentry-cdn.com/8b97e74bad26da02c834652de708d5ef.min.js"
      crossorigin="anonymous"
      defer
    ></script>
    <?php endif; ?>

    <!-- App config injected server-side — never hardcode keys in JS -->
    <script>
      window.APP_CONFIG = <?php echo json_encode($appConfig); ?>;
    </script>
</head>
<body>
    <div id="app"></div>

    <!-- Diagnostics (iPad has no DevTools — errors surface here) -->
    <div id="diagnostics" style="display: none; font-family: system-ui, sans-serif; max-width: 480px; margin: 20px auto; padding: 0 20px; font-size: 0.85em; color: #888;">
      <details>
        <summary>Diagnostics</summary>
        <pre style="white-space: pre-wrap; word-break: break-all; background: #1a1a1a; padding: 12px; border-radius: 6px; margin-top: 8px;">
Bundle: <?php echo $bundleFile ? htmlspecialchars($bundleFile) : 'NOT FOUND (using dev fallback)'; ?>

Manifest: <?php echo file_exists($manifestPath) ? 'found' : 'MISSING at ' . htmlspecialchars($manifestPath); ?>

Supabase URL: <?php echo !empty($supabaseUrl) ? 'set (' . substr($supabaseUrl, 0, 30) . '...)' : 'NOT SET'; ?>

Anon Key: <?php echo !empty($supabaseKey) ? 'set (' . substr($supabaseKey, 0, 20) . '...)' : 'NOT SET'; ?>

Sentry: <?php echo !empty($sentryDsn) ? 'set' : 'not set'; ?>
</pre>
        <pre id="js-errors" style="white-space: pre-wrap; word-break: break-all; background: #2a1a1a; padding: 12px; border-radius: 6px; margin-top: 8px; color: #f88;"></pre>
      </details>
    </div>

    <!-- Catch JS errors visibly (iPad has no DevTools) -->
    <script>
      var errBox = null;
      function showErr(msg) {
        if (!errBox) errBox = document.getElementById('js-errors');
        if (errBox) { errBox.textContent += msg + '\n'; }
        var diag = document.getElementById('diagnostics');
        if (diag) diag.style.display = '';
      }
      window.addEventListener('error', function(e) { showErr('ERROR: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')'); });
      window.addEventListener('unhandledrejection', function(e) { showErr('PROMISE: ' + (e.reason?.message || e.reason)); });
    </script>

    <!-- Load bundle (production) or dev modules -->
    <?php if ($bundleFile): ?>
      <script type="module" src="<?php echo htmlspecialchars($bundleFile); ?>"></script>
    <?php else: ?>
      <!-- Import map: resolve bare specifiers via CDN when bundle is missing -->
      <script type="importmap">
      {
        "imports": {
          "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
          "qrcode": "https://esm.sh/qrcode@1"
        }
      }
      </script>
      <script type="module" src="/assets/js/app.js"></script>
    <?php endif; ?>
</body>
</html>
