<?php
require_once __DIR__ . '/config.php';
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS);
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

$conn->query("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "`");
$conn->select_db(DB_NAME);

// Users Table
$conn->query("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    honorPoints INT DEFAULT 0,
    bounty INT DEFAULT 0,
    profilePic LONGTEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)");

// Add missing columns to users
$cols = [
    'isAdmin' => "INT DEFAULT 0",
    'auth_token' => "VARCHAR(255)",
    'token_expires' => "DATETIME",
    'reset_token' => "VARCHAR(255)",
    'reset_expires' => "DATETIME",
    'phone' => "VARCHAR(50)",
    'address' => "TEXT"
];
foreach($cols as $col => $def) {
    if($conn->query("SHOW COLUMNS FROM users LIKE '$col'")->num_rows == 0) {
        $conn->query("ALTER TABLE users ADD COLUMN $col $def");
    }
}

// Products Table
$conn->query("CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255),
    priceCents INT,
    img TEXT,
    category VARCHAR(50),
    details JSON,
    stock INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)");

// Add missing columns to products
if($conn->query("SHOW COLUMNS FROM products LIKE 'stock'")->num_rows == 0) {
    $conn->query("ALTER TABLE products ADD COLUMN stock INT DEFAULT 0");
}
if($conn->query("SHOW COLUMNS FROM products LIKE 'createdAt'")->num_rows == 0) {
    $conn->query("ALTER TABLE products ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP");
}

// Orders Table
$conn->query("CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    uid INT,
    items JSON,
    totals JSON,
    customer JSON,
    status VARCHAR(50),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)");

// Coupons Table
$conn->query("CREATE TABLE IF NOT EXISTS coupons (
    code VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50),
    value INT,
    label VARCHAR(255),
    minSubtotalCents INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)");

// Messages Table
$conn->query("CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)");

// Initial Admin (if not exists)
$adminEmail = 'admin@bronco.com';
$checkAdmin = $conn->prepare("SELECT id FROM users WHERE email=?");
$checkAdmin->bind_param("s", $adminEmail);
$checkAdmin->execute();
if ($checkAdmin->get_result()->num_rows == 0) {
    $pass = password_hash('admin', PASSWORD_DEFAULT);
    $ins = $conn->prepare("INSERT INTO users (name, email, password, isAdmin) VALUES ('Admin', ?, ?, 1)");
    $ins->bind_param("ss", $adminEmail, $pass);
    $ins->execute();
    echo "Default Admin created (admin@bronco.com / admin). <br>";
}

echo "Database schema updated successfully.";
?>
