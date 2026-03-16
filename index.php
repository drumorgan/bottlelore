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
<html lang="<?php echo htmlspecialchars($detectedLocale ?? 'en'); ?>">
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
    <div id="app">
      <!-- Fallback: visible while JS loads (replaced once app renders) -->
      <div id="app-loading" style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Georgia,serif;color:#8a7968;background:#f5efe4;">
        <p>Loading&hellip;</p>
      </div>
    </div>

    <!-- Catch early JS errors before app bundle loads -->
    <script>
      window.__earlyErrors = [];
      window.addEventListener('error', function(e) { window.__earlyErrors.push('ERROR: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')'); });
      window.addEventListener('unhandledrejection', function(e) { window.__earlyErrors.push('PROMISE: ' + (e.reason?.message || e.reason)); });
    </script>

    <!-- Show errors visibly after 5s if app never renders (iPad has no DevTools) -->
    <script>
      setTimeout(function() {
        var app = document.getElementById('app');
        var loading = document.getElementById('app-loading');
        if (loading && app.children.length === 1) {
          var msgs = window.__earlyErrors.length
            ? window.__earlyErrors.join('<br>')
            : 'No JS errors captured. Bundle may have failed to load.';
          var bundleSrc = <?php echo json_encode($bundleFile ?: 'NO BUNDLE (manifest missing)'); ?>;
          loading.innerHTML =
            '<div style="text-align:center;max-width:500px;padding:20px;">' +
            '<p style="color:#c0392b;font-weight:bold;">App failed to start</p>' +
            '<p style="font-size:13px;color:#666;margin-top:12px;">Bundle: ' + bundleSrc + '</p>' +
            '<details style="margin-top:12px;text-align:left;font-size:12px;color:#888;">' +
            '<summary>Error details</summary>' +
            '<pre style="white-space:pre-wrap;margin-top:8px;">' + msgs + '</pre>' +
            '</details></div>';
        }
      }, 5000);
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
