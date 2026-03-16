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
    <div id="app"></div>


    <!-- Catch early JS errors before app bundle loads -->
    <script>
      window.__earlyErrors = [];
      window.addEventListener('error', function(e) { window.__earlyErrors.push('ERROR: ' + e.message + ' (' + e.filename + ':' + e.lineno + ')'); });
      window.addEventListener('unhandledrejection', function(e) { window.__earlyErrors.push('PROMISE: ' + (e.reason?.message || e.reason)); });
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
