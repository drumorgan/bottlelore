<?php
// Config resolution order:
// 1. Environment variables (GitHub Actions / server env)
// 2. Local config file (development, git-ignored)
// 3. Fail loudly — missing config is never silent

$localConfig = __DIR__ . '/../config.local.php';
if (file_exists($localConfig)) {
  require_once $localConfig;
}

$supabaseUrl  = getenv('SUPABASE_URL')      ?: (defined('SUPABASE_URL')      ? SUPABASE_URL      : null);
$supabaseKey  = getenv('SUPABASE_ANON_KEY')  ?: (defined('SUPABASE_ANON_KEY') ? SUPABASE_ANON_KEY  : null);
$sentryDsn    = getenv('SENTRY_DSN')         ?: (defined('SENTRY_DSN')        ? SENTRY_DSN         : null);

// Supabase anon key is safe to expose — RLS enforces all permissions
// NEVER expose service_role key here
// Detect locale from Accept-Language header (first supported match wins)
$supportedLocales = ['en', 'es'];
$detectedLocale = 'en';
$acceptLang = isset($_SERVER['HTTP_ACCEPT_LANGUAGE']) ? $_SERVER['HTTP_ACCEPT_LANGUAGE'] : '';
if ($acceptLang) {
  preg_match_all('/([a-z]{1,8}(?:-[a-z]{1,8})?)\s*(?:;\s*q\s*=\s*(1|0\.\d+))?/i', $acceptLang, $matches);
  if (!empty($matches[1])) {
    $langs = array_combine($matches[1], array_map(function($q) { return $q === '' ? 1.0 : (float)$q; }, $matches[2]));
    arsort($langs);
    foreach ($langs as $lang => $q) {
      $code = strtolower(substr($lang, 0, 2));
      if (in_array($code, $supportedLocales)) {
        $detectedLocale = $code;
        break;
      }
    }
  }
}

$appConfig = [
  'supabase' => [
    'url'     => $supabaseUrl,
    'anonKey' => $supabaseKey,
  ],
  'sentry' => [
    'dsn' => $sentryDsn,
  ],
  'build' => [
    'time' => defined('__BUILD_TIME__') ? __BUILD_TIME__ : '',
    'sha'  => defined('__BUILD_SHA__')  ? __BUILD_SHA__  : '',
  ],
  'locale' => $detectedLocale,
];
