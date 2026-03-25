<?php
require_once __DIR__ . '/config.php';
ob_start();
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) { die("DB Connection Error: " . $conn->connect_error); }
$conn->set_charset('utf8mb4');

echo "Starting DB check and fix...\n";

// 1. messages table
$q_msgs = "CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
)";
$conn->query($q_msgs) ? print("messages table ready\n") : print("Error: " . $conn->error . "\n");

// 2. cart_items table
$q_cart = "CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid INT NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  qty INT DEFAULT 1,
  size VARCHAR(50) DEFAULT NULL,
  FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE
)";
$conn->query($q_cart) ? print("cart_items table ready\n") : print("Error: " . $conn->error . "\n");

// 3. users columns
$userCols = [
    'phone' => "VARCHAR(50) DEFAULT NULL",
    'address' => "TEXT DEFAULT NULL",
    'auth_token' => "VARCHAR(255) DEFAULT NULL",
    'token_expires' => "DATETIME DEFAULT NULL",
    'reset_token' => "VARCHAR(255) DEFAULT NULL",
    'reset_expires' => "DATETIME DEFAULT NULL",
    'isAdmin' => "TINYINT(1) DEFAULT 0"
];

foreach ($userCols as $col => $def) {
    if (!$conn->query("SHOW COLUMNS FROM users LIKE '$col'")->num_rows) {
        $conn->query("ALTER TABLE users ADD COLUMN $col $def") ? print("Added $col to users\n") : print("Error adding $col: " . $conn->error . "\n");
    } else {
        echo "users.$col already exists\n";
    }
}

// 4. products columns
$prodCols = [
    'stock' => "INT DEFAULT 10",
    'createdAt' => "DATETIME DEFAULT CURRENT_TIMESTAMP"
];
foreach ($prodCols as $col => $def) {
    if (!$conn->query("SHOW COLUMNS FROM products LIKE '$col'")->num_rows) {
        $conn->query("ALTER TABLE products ADD COLUMN $col $def") ? print("Added $col to products\n") : print("Error adding $col: " . $conn->error . "\n");
    } else {
        echo "products.$col already exists\n";
    }
}

echo "Database fix completed.\n";
ob_end_flush();
?>
