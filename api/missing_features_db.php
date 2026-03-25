<?php
require_once __DIR__ . '/config.php';
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) { die("DB Connection Error"); }

$conn->query("ALTER TABLE products ADD COLUMN stock INT DEFAULT 10");
$conn->query("ALTER TABLE users ADD COLUMN token_expires DATETIME DEFAULT NULL");

$q3 = "CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uid INT NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  qty INT DEFAULT 1,
  size VARCHAR(50) DEFAULT NULL,
  FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE
)";
if($conn->query($q3)) {
    echo "Successfully updated database features!";
} else {
    echo "Error creating table: " . $conn->error;
}
?>
