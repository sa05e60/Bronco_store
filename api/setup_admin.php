<?php
require_once __DIR__ . '/config.php';
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) die("Connection failed");

$conn->query("ALTER TABLE users ADD COLUMN isAdmin TINYINT(1) DEFAULT 0");

$password = password_hash('admin', PASSWORD_DEFAULT);
$conn->query("INSERT IGNORE INTO users (name, email, password, isAdmin) VALUES ('Admin', 'admin@bronco.com', '$password', 1)");

$conn->query("CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50),
    value INT,
    label VARCHAR(255),
    minSubtotalCents INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)");

echo "Admin DB Setup Complete";
?>
