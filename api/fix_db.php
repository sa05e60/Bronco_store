<?php
require_once __DIR__ . '/config.php';
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$queries = [
    "ALTER TABLE orders MODIFY COLUMN uid INT(11) NULL;",
    "CREATE INDEX idx_orders_uid ON orders(uid);",
    "ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (uid) REFERENCES users(id) ON DELETE SET NULL;"
];

$success = true;
foreach ($queries as $sql) {
    if (!$conn->query($sql)) {
        echo "Error executing query ($sql): " . $conn->error . "<br>";
        $success = false;
    } else {
        echo "Successfully executed: $sql<br>";
    }
}

if ($success) {
    echo "Database successfully upgraded!";
} else {
    echo "Upgrade completed with some errors (maybe constraints already exist?).";
}
?>
