<?php
/* 
=========================================================
  BRONCO STORE - GLOBAL CONFIGURATION FILE
=========================================================
*/

function loadEnv($path) {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
            continue;
        }
        list($name, $value) = explode('=', $line, 2);
        $value = trim($value);
        if (preg_match('/^"(.*)"$/', $value, $matches)) {
            $value = $matches[1];
        }
        putenv(sprintf('%s=%s', $name, $value));
    }
}

// Load .env into the environment variables
loadEnv(__DIR__ . '/.env');

// Database Configuration
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'bronco_db');

// Base URL for the frontend application (used in emails, etc.)
define('BASE_URL', getenv('BASE_URL') ?: 'http://localhost/bronco_store');

// Email Configuration
define('STORE_EMAIL', getenv('STORE_EMAIL') ?: 'no-reply@broncostore.com');
define('STORE_EMAIL_PASSWORD', getenv('STORE_EMAIL_PASSWORD') ?: '');
define('STORE_EMAIL_NAME', getenv('STORE_EMAIL_NAME') ?: 'BRONCO Store');
?>
