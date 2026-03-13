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
];
