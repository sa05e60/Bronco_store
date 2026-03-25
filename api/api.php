<?php
require_once __DIR__ . '/config.php';
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (isset($_SERVER["HTTP_ORIGIN"])) { header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}"); }
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { exit; }
header('Content-Type: application/json; charset=utf-8');
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    echo json_encode(["error" => "DB Connection Failed"]);
    exit;
}
$conn->set_charset('utf8mb4');

$action = $_GET['action'] ?? '';
header('Content-Type: application/json; charset=utf-8');

if ($action === 'login') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    if (!$email || !$password) {
        echo json_encode(["success" => false, "message" => "Email and password are required."]);
        exit;
    }
    $stmt = $conn->prepare("SELECT * FROM users WHERE email=?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        if (password_verify($password, $row['password'])) {
            $token = bin2hex(random_bytes(16));
            $upd = $conn->prepare("UPDATE users SET auth_token=?, token_expires=DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id=?");
            $upd->bind_param("si", $token, $row['id']);
            $upd->execute();
            $row['auth_token'] = $token;
            unset($row['password']);
            echo json_encode(["success" => true, "user" => $row]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid password."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "User not found."]);
    }
}
elseif ($action === 'register') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $name  = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $rawPass = $data['password'] ?? '';
    if (!$email || !$rawPass) {
        echo json_encode(["success" => false, "message" => "Email and password are required."]);
        exit;
    }
    if (strlen($rawPass) < 6) {
        echo json_encode(["success" => false, "message" => "Password must be at least 6 characters."]);
        exit;
    }
    $password = password_hash($rawPass, PASSWORD_DEFAULT);
    
    $check = $conn->prepare("SELECT id FROM users WHERE email=?");
    $check->bind_param("s", $email);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Email already exists."]);
    } else {
        $token = bin2hex(random_bytes(16));
        $ins = $conn->prepare("INSERT INTO users (name, email, phone, password, auth_token, token_expires) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))");
        $ins->bind_param("sssss", $name, $email, $phone, $password, $token);
        $ins->execute();
        $id = $conn->insert_id;
        
        $sel = $conn->prepare("SELECT * FROM users WHERE id=?");
        $sel->bind_param("i", $id);
        $sel->execute();
        $row = $sel->get_result()->fetch_assoc();
        unset($row['password']);
        echo json_encode(["success" => true, "user" => $row]);
    }
}
elseif ($action === 'order') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $uid = (int)($data['customer']['uid'] ?? 0);
    $token = $conn->real_escape_string($data['auth_token'] ?? '');
    
    if ($uid > 0) {
        if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
        $authCheck = $conn->query("SELECT id FROM users WHERE id=$uid AND auth_token='$token' AND token_expires > NOW()");
        if ($authCheck->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    }
    
    $subtotal = 0;
    $totalQty = 0;
    $safeItems = [];
    $rawItems = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
    foreach ($rawItems as $item) {
        $prodId = $conn->real_escape_string($item['id'] ?? '');
        $qty = (int)($item['qty'] ?? 1);
        if ($qty <= 0) continue;
        
        $price = 0;
        $title = 'Unknown Item';
        $img = '';
        
        // SECURITY FIX: Never trust frontend pricing/details. Fetch directly from DB.
        $pStmt = $conn->prepare("SELECT title, priceCents, img, stock FROM products WHERE id=?");
        $pStmt->bind_param("s", $prodId);
        $pStmt->execute();
        $pRes = $pStmt->get_result();
        if ($pRes && $pRow = $pRes->fetch_assoc()) {
            if ((int)$pRow['stock'] < $qty) {
                echo json_encode(["success"=>false, "message"=>"عذراً، المنتج '{$pRow['title']}' غير متوفر بالكمية المطلوبة."]); exit;
            }
            $price = (int)$pRow['priceCents'];
            $title = $pRow['title'];
            $img = $pRow['img'];
        } else {
            // Product missing or deleted from database, skip it
            continue;
        }
        
        $subtotal += $price * $qty;
        $totalQty += $qty;
        
        $safeItem = [
            'id' => $prodId,
            'title' => $title,
            'priceCents' => $price,
            'qty' => $qty,
            'img' => $img,
            'size' => isset($item['size']) ? $conn->real_escape_string($item['size']) : null
        ];
        $safeItems[] = $safeItem;
    }
    
    $discount = 0;
    $shipping = ($subtotal >= 10000 || $subtotal === 0) ? 0 : 700;
    $couponCode = $conn->real_escape_string($data['coupon'] ?? '');
    
    // Default HONOR- max coupon bypass (since client auto-generates it)
    if (strpos($couponCode, 'HONOR-') === 0 && $totalQty >= 10) {
        $discount = (int)round($subtotal * 0.20);
    } elseif ($couponCode !== '') {
        $cStmt = $conn->prepare("SELECT type, value, minSubtotalCents FROM coupons WHERE code=?");
        $cStmt->bind_param("s", $couponCode);
        $cStmt->execute();
        $cRes = $cStmt->get_result();
        if ($cRes && $cRow = $cRes->fetch_assoc()) {
            if (empty($cRow['minSubtotalCents']) || $subtotal >= (int)$cRow['minSubtotalCents']) {
                if ($cRow['type'] === 'percent') {
                    $discount = (int)round($subtotal * ((int)$cRow['value'] / 100));
                } elseif ($cRow['type'] === 'shipping') {
                    $shipping = 0;
                }
            }
        }
    }
    
    $taxableBase = max(0, $subtotal - $discount);
    $tax = (int)round($taxableBase * 0.05); // 5% tax
    $total = $taxableBase + $tax + $shipping;
    
    $safeTotals = [
        'subtotal' => $subtotal,
        'discount' => $discount,
        'honorDiscount' => 0,
        'tax' => $tax,
        'shipping' => $shipping,
        'total' => $total
    ];

    $honorPoints = min(100, (int)round(($totalQty / 10) * 100));

    $id = strtoupper(uniqid('ORD-'));
    $itemsJson = json_encode($safeItems);
    $totalsJson = json_encode($safeTotals);
    $customerJson = json_encode($data['customer']);
    $status = $data['status'] ?? 'placed';
    
    foreach ($safeItems as $it) {
        $stUpdate = $conn->prepare("UPDATE products SET stock = stock - ? WHERE id=?");
        $stUpdate->bind_param("is", $it['qty'], $it['id']);
        $stUpdate->execute();
    }
    
    $ins = $conn->prepare("INSERT INTO orders (id, uid, items, totals, customer, status) VALUES (?, ?, ?, ?, ?, ?)");
    $ins->bind_param("sissss", $id, $uid, $itemsJson, $totalsJson, $customerJson, $status);
    $ins->execute();
    
    if ($uid > 0) {
        $addedBounty = count($safeItems) * 500;
        $updH = $conn->prepare("UPDATE users SET honorPoints = LEAST(100, honorPoints + ?), bounty = bounty + ? WHERE id=?");
        $updH->bind_param("iii", $honorPoints, $addedBounty, $uid);
        $updH->execute();
    } else {
        $addedBounty = 0;
    }
    
    // --- SEND EMAIL RECEIPT ---
    if (defined('STORE_EMAIL') && STORE_EMAIL !== 'your_gmail_here@gmail.com') {
        require_once __DIR__ . '/PHPMailer/Exception.php';
        require_once __DIR__ . '/PHPMailer/PHPMailer.php';
        require_once __DIR__ . '/PHPMailer/SMTP.php';
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = STORE_EMAIL;
            // Remove spaces from app password if user pasted it with spaces
            $mail->Password   = str_replace(' ', '', STORE_EMAIL_PASSWORD); 
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            $mail->setFrom(STORE_EMAIL, STORE_EMAIL_NAME);
            $custEmail = trim($data['customer']['email'] ?? '');
            if ($custEmail !== '') {
                $mail->addAddress($custEmail, $data['customer']['name'] ?? 'Partner');
                $mail->isHTML(true);
                $mail->Subject = "تأكيد طلبك من BRONCO Store (رقم الطلب: $id)";
                
                // Build email body
                $body = "<div dir='rtl' style='font-family: Arial, sans-serif; font-size:16px; color:#333;'>
                            <h2 style='color:#C4A484;'>مرحباً " . htmlspecialchars($data['customer']['name'] ?? 'شريكنا العزيز') . "! 🤠</h2>
                            <p>لقد استلمنا طلبك رقم <b>$id</b> بنجاح، ونشكرك لاختيارك متجرنا.</p>
                            <p>إجمالي قيمة الطلب: <b>$" . number_format($total / 100, 2) . "</b></p>
                            <hr style='border:1px dashed #C4A484;'>
                            <h3>تفاصيل المنتجات:</h3><ul>";
                foreach ($safeItems as $it) {
                    $body .= "<li>" . htmlspecialchars($it['title']) . " (الكمية: {$it['qty']})</li>";
                }
                $body .= "</ul>";
                
                if ($uid > 0) {
                    $body .= "<p><b>البونتي (Bounty) المُكتسَب:</b> +$$addedBounty 💰</p>";
                }
                
                $body .= "  <br><p>سنقوم بالتواصل معك قريباً لتأكيد الشحن.</p>
                            <p>مع تحيات،<br>فريق BRONCO</p>
                         </div>";
                
                $mail->Body = $body;
                $mail->send();
            }
        } catch (Exception $e) {
            // Silently ignore mail errors so checkout succeeds regardless
            error_log("Mail Error: " . $e->getMessage());
        }
    }
    
    echo json_encode(["success" => true, "addedBounty" => $addedBounty, "orderId" => $id]);
}
elseif ($action === 'get_user') {
    $uid = (int)$_GET['uid'];
    $token = $conn->real_escape_string($_GET['auth_token'] ?? '');
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $authCheck = $conn->query("SELECT id FROM users WHERE id=$uid AND auth_token='$token' AND token_expires > NOW()");
    if ($authCheck->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $result = $conn->query("SELECT id, name, email, phone, honorPoints, bounty, profilePic, address FROM users WHERE id=$uid");
    if ($row = $result->fetch_assoc()) {
        echo json_encode(["success" => true, "user" => $row]);
    } else {
        echo json_encode(["success" => false]);
    }
}
elseif ($action === 'update_pic') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $uid = (int)$data['uid'];
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW()");
    $stmt->bind_param("is", $uid, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $pic = $data['profilePic'] ?? '';
    $size_in_bytes = (int) (strlen($pic) * (3/4));
    if ($size_in_bytes > 2000000) { 
        echo json_encode(["success" => false, "message" => "حجم الصورة كبير جداً. الحد الأقصى هو 2MB"]); 
        exit; 
    }
    if (preg_match('/^data:image\/(\w+);base64,/', $pic, $type)) {
        $decoded = base64_decode(substr($pic, strpos($pic, ',') + 1));
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer($decoded);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
            echo json_encode(["success" => false, "message" => "Invalid image format."]); exit;
        }
    }
    
    $upd = $conn->prepare("UPDATE users SET profilePic=? WHERE id=?");
    $upd->bind_param("si", $pic, $uid);
    $upd->execute();
    echo json_encode(["success" => true]);
}
elseif ($action === 'update_name') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $uid  = (int)($data['uid'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW()");
    $stmt->bind_param("is", $uid, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $name = $data['name'] ?? '';
    $upd = $conn->prepare("UPDATE users SET name=? WHERE id=?");
    $upd->bind_param("si", $name, $uid);
    $upd->execute();
    echo json_encode(["success" => true]);
}
elseif ($action === 'update_address') {
    $data    = json_decode(file_get_contents("php://input"), true) ?? [];
    $uid     = (int)($data['uid'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW()");
    $stmt->bind_param("is", $uid, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $address = $data['address'] ?? '';
    $upd = $conn->prepare("UPDATE users SET address=? WHERE id=?");
    $upd->bind_param("si", $address, $uid);
    $upd->execute();
    echo json_encode(["success" => true]);
}
elseif ($action === 'update_phone') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $uid  = (int)($data['uid'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW()");
    $stmt->bind_param("is", $uid, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $phone = $data['phone'] ?? '';
    $upd = $conn->prepare("UPDATE users SET phone=? WHERE id=?");
    $upd->bind_param("si", $phone, $uid);
    $upd->execute();
    echo json_encode(["success" => true]);
}
elseif ($action === 'update_password') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $uid  = (int)($data['uid'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id, password FROM users WHERE id=? AND auth_token=? AND token_expires > NOW()");
    $stmt->bind_param("is", $uid, $token);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $row = $res->fetch_assoc();
    $oldPass = $data['old_password'] ?? '';
    $newPass = $data['new_password'] ?? '';
    
    if (password_verify($oldPass, $row['password'])) {
        $newHash = password_hash($newPass, PASSWORD_DEFAULT);
        $upd = $conn->prepare("UPDATE users SET password=? WHERE id=?");
        $upd->bind_param("si", $newHash, $uid);
        $upd->execute();
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Incorrect current password."]);
    }
}
elseif ($action === 'get_user_orders') {
    $uid = (int)$_GET['uid'];
    $token = $_GET['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "orders"=>[]]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW()");
    $stmt->bind_param("is", $uid, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "orders"=>[]]); exit; }
    
    $sel = $conn->prepare("SELECT id, status, totals, createdAt FROM orders WHERE uid=? ORDER BY createdAt DESC LIMIT 10");
    $sel->bind_param("i", $uid);
    $sel->execute();
    $res = $sel->get_result();
    $arr = [];
    while($r = $res->fetch_assoc()) {
        $r['totals'] = json_decode($r['totals'], true);
        $arr[] = $r;
    }
    echo json_encode(["success" => true, "orders" => $arr]);
}
elseif ($action === 'get_products') {
    $page = (int)($_GET['page'] ?? 1);
    if($page < 1) $page = 1;
    $limit = 50;
    $offset = ($page - 1) * $limit;

    $cRes = $conn->query("SELECT COUNT(*) as c FROM products");
    $total = $cRes->fetch_assoc()['c'];
    $maxPages = ceil($total / $limit);

    $result = $conn->query("SELECT * FROM products ORDER BY createdAt DESC LIMIT $limit OFFSET $offset");
    $prods = [];
    while($row = $result->fetch_assoc()){
        $row['details'] = json_decode($row['details'], true);
        $prods[] = $row;
    }
    echo json_encode([
        "success" => true,
        "products" => $prods,
        "page" => $page,
        "maxPages" => $maxPages,
        "total" => $total
    ]);
}
elseif ($action === 'get_coupons') {
    $res = $conn->query("SELECT * FROM coupons");
    $arr = [];
    while($r = $res->fetch_assoc()){ $arr[] = $r; }
    echo json_encode(["success" => true, "coupons" => $arr]);
}
elseif ($action === 'admin_login') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $email = $data['email'];
    $pass = $data['password'];
    $stmt = $conn->prepare("SELECT * FROM users WHERE email=? AND isAdmin=1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        if (password_verify($pass, $row['password'])) {
            $token = bin2hex(random_bytes(16));
            $upd = $conn->prepare("UPDATE users SET auth_token=?, token_expires=DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id=?");
            $upd->bind_param("si", $token, $row['id']);
            $upd->execute();
            $row['auth_token'] = $token;
            unset($row['password']);
            echo json_encode(["success" => true, "user" => $row]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid password."]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Access denied. Admin only."]);
    }
}
elseif ($action === 'admin_save_product') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $admin_id = (int)($data['admin_id'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW() AND isAdmin=1");
    $stmt->bind_param("is", $admin_id, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }

    $id = $data['id'];
    $title = $data['title'];
    $priceCents = (int)$data['priceCents'];
    $img = $data['img'];
    $category = $data['category'];
    $stock = (int)($data['stock'] ?? 0);
    $details = json_encode($data['details']);
    $createdAt = isset($data['createdAt']) ? trim($data['createdAt']) : date('Y-m-d H:i:s');
    
    $check = $conn->prepare("SELECT id FROM products WHERE id=?");
    $check->bind_param("s", $id);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        $q = $conn->prepare("UPDATE products SET title=?, priceCents=?, img=?, category=?, details=?, stock=? WHERE id=?");
        $q->bind_param("sisssis", $title, $priceCents, $img, $category, $details, $stock, $id);
        if (!$q->execute()) { echo json_encode(["success"=>false, "message"=>"DB Error: " . $conn->error]); exit; }
    } else {
        $q = $conn->prepare("INSERT INTO products (id, title, priceCents, img, category, details, createdAt, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $q->bind_param("ssissssi", $id, $title, $priceCents, $img, $category, $details, $createdAt, $stock);
        if (!$q->execute()) { echo json_encode(["success"=>false, "message"=>"DB Error: " . $conn->error]); exit; }
    }
    echo json_encode(["success" => true]);
}
elseif ($action === 'admin_delete_product') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $admin_id = (int)($data['admin_id'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW() AND isAdmin=1");
    $stmt->bind_param("is", $admin_id, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $id = $data['id'] ?? '';
    $del = $conn->prepare("DELETE FROM products WHERE id=?");
    $del->bind_param("s", $id);
    $del->execute();
    echo json_encode(["success" => true]);
}
elseif ($action === 'admin_save_coupon') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $admin_id = (int)($data['admin_id'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW() AND isAdmin=1");
    $stmt->bind_param("is", $admin_id, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }

    $code = $data['code'];
    $type = $data['type'];
    $value = (int)$data['value'];
    $label = $data['label'];
    $minSubtotalCents = isset($data['minSubtotalCents']) ? (int)$data['minSubtotalCents'] : 0;
    $createdAt = isset($data['createdAt']) ? trim($data['createdAt']) : date('Y-m-d H:i:s');
    
    $check = $conn->prepare("SELECT code FROM coupons WHERE code=?");
    $check->bind_param("s", $code);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        $upd = $conn->prepare("UPDATE coupons SET type=?, value=?, label=?, minSubtotalCents=? WHERE code=?");
        $upd->bind_param("sisis", $type, $value, $label, $minSubtotalCents, $code);
        $upd->execute();
    } else {
        $ins = $conn->prepare("INSERT INTO coupons (code, type, value, label, minSubtotalCents, createdAt) VALUES (?, ?, ?, ?, ?, ?)");
        $ins->bind_param("ssisis", $code, $type, $value, $label, $minSubtotalCents, $createdAt);
        $ins->execute();
    }
    echo json_encode(["success" => true]);
}
elseif ($action === 'admin_delete_coupon') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $admin_id = (int)($data['admin_id'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW() AND isAdmin=1");
    $stmt->bind_param("is", $admin_id, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $code = $data['code'] ?? '';
    $del = $conn->prepare("DELETE FROM coupons WHERE code=?");
    $del->bind_param("s", $code);
    $del->execute();
    echo json_encode(["success" => true]);
}
elseif ($action === 'admin_get_orders') {
    $admin_id = (int)($_GET['admin_id'] ?? 0);
    $token = $_GET['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW() AND isAdmin=1");
    $stmt->bind_param("is", $admin_id, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    
    $page = (int)($_GET['page'] ?? 1);
    if($page < 1) $page = 1;
    $limit = 50;
    $offset = ($page - 1) * $limit;

    $cRes = $conn->query("SELECT COUNT(*) as c FROM orders");
    $total = $cRes->fetch_assoc()['c'];
    $maxPages = ceil($total / $limit);

    $res = $conn->query("SELECT * FROM orders ORDER BY createdAt DESC LIMIT $limit OFFSET $offset");
    $arr = [];
    while($r = $res->fetch_assoc()){ 
        $r['customer'] = json_decode($r['customer'], true);
        $r['items'] = json_decode($r['items'], true);
        $r['totals'] = json_decode($r['totals'], true);
        $arr[] = $r; 
    }
    echo json_encode([
        "success" => true,
        "orders" => $arr,
        "page" => $page,
        "maxPages" => $maxPages,
        "total" => $total
    ]);
}
elseif ($action === 'admin_update_order_status') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $admin_id = (int)($data['admin_id'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW() AND isAdmin=1");
    $stmt->bind_param("is", $admin_id, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }

    $id = $data['id'];
    $status = $data['status'];
    
    $updS = $conn->prepare("UPDATE orders SET status=? WHERE id=?");
    $updS->bind_param("ss", $status, $id);
    $updS->execute();
    
    $selC = $conn->prepare("SELECT customer FROM orders WHERE id=?");
    $selC->bind_param("s", $id);
    
    // --- SEND SHIPPED EMAIL NOTIFICATION ---
    if ($status === 'shipped') {
        $selC->execute();
        $oRes = $selC->get_result();
        if ($oRes && $oRow = $oRes->fetch_assoc()) {
            $custData = json_decode($oRow['customer'], true);
            $custEmail = trim($custData['email'] ?? '');
            if ($custEmail !== '') {
                if (defined('STORE_EMAIL') && STORE_EMAIL !== 'your_gmail_here@gmail.com') {
                    require_once __DIR__ . '/PHPMailer/Exception.php';
                    require_once __DIR__ . '/PHPMailer/PHPMailer.php';
                    require_once __DIR__ . '/PHPMailer/SMTP.php';
                    try {
                        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                        $mail->CharSet = 'UTF-8';
                        $mail->isSMTP();
                        $mail->Host       = 'smtp.gmail.com';
                        $mail->SMTPAuth   = true;
                        $mail->Username   = STORE_EMAIL;
                        $mail->Password   = str_replace(' ', '', STORE_EMAIL_PASSWORD); 
                        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                        $mail->Port       = 587;

                        $mail->setFrom(STORE_EMAIL, STORE_EMAIL_NAME);
                        $mail->addAddress($custEmail, $custData['name'] ?? 'Partner');
                        $mail->isHTML(true);
                        $mail->Subject = "تم شحن طلبك من BRONCO Store 📦 (رقم: $id)";
                        
                        $body = "<div dir='rtl' style='font-family: Arial, sans-serif; font-size:16px; color:#333;'>
                                    <h2 style='color:#C4A484;'>مرحباً " . htmlspecialchars($custData['name'] ?? 'شريكنا') . "! 🤠</h2>
                                    <p>نود إعلامك أن طلبك <b>$id</b> قد تم تجهيزه وتسليمه لشركة الشحن، وهو الآن في طريقه إليك! 🚚💨</p>
                                    <p>يرجى إبقاء هاتفك مفتوحاً للتواصل معك عند وصول المندوب.</p>
                                    <br>
                                    <p>نتمنى لك تجربة ممتعة مع منتجاتنا!</p>
                                    <p>مع تحيات،<br>فريق BRONCO</p>
                                 </div>";
                        
                        $mail->Body = $body;
                        $mail->send();
                    } catch (Exception $e) {
                        error_log("Mail Error on Shipping: " . $e->getMessage());
                    }
                }
            }
        }
    }
    
    // --- SEND DELIVERED EMAIL (REQUEST REVIEW) ---
    if ($status === 'delivered') {
        $selC->execute();
        $oRes = $selC->get_result();
        if ($oRes && $oRow = $oRes->fetch_assoc()) {
            $custData = json_decode($oRow['customer'], true);
            $custEmail = trim($custData['email'] ?? '');
            if ($custEmail !== '') {
                if (defined('STORE_EMAIL') && STORE_EMAIL !== 'your_gmail_here@gmail.com') {
                    require_once __DIR__ . '/PHPMailer/Exception.php';
                    require_once __DIR__ . '/PHPMailer/PHPMailer.php';
                    require_once __DIR__ . '/PHPMailer/SMTP.php';
                    try {
                        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                        $mail->CharSet = 'UTF-8';
                        $mail->isSMTP();
                        $mail->Host       = 'smtp.gmail.com';
                        $mail->SMTPAuth   = true;
                        $mail->Username   = STORE_EMAIL;
                        $mail->Password   = str_replace(' ', '', STORE_EMAIL_PASSWORD); 
                        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                        $mail->Port       = 587;

                        $mail->setFrom(STORE_EMAIL, STORE_EMAIL_NAME);
                        $mail->addAddress($custEmail, $custData['name'] ?? 'Partner');
                        $mail->isHTML(true);
                        $mail->Subject = "تم تسليم طلبك بنجاح! شاركنا تقييمك 🌟 (رقم: $id)";
                        
                        $body = "<div dir='rtl' style='font-family: Arial, sans-serif; font-size:16px; color:#333;'>
                                    <h2 style='color:#C4A484;'>مرحباً " . htmlspecialchars($custData['name'] ?? 'شريكنا') . "! 🤠</h2>
                                    <p>يسعدنا إخبارك أن طلبك <b>$id</b> قد وصل إليك بسلام وتم تسجيله كمُستلم بنجاح! 🎉</p>
                                    <p>نأمل أن تكون منتجاتنا قد لبت توقعاتك. رأيك يهمنا جداً، وسنكون سعداء لو تكرمت بمشاركتنا تقييمك وتجربتك.</p>
                                    <br>
                                    <p>شكراً لكونك جزءاً من عائلة BRONCO، وننتظر زيارتك القادمة!</p>
                                    <p>مع تحيات،<br>فريق الغرب الجامح 🐎</p>
                                 </div>";
                        
                        $mail->Body = $body;
                        $mail->send();
                    } catch (Exception $e) {
                        error_log("Mail Error on Delivery: " . $e->getMessage());
                    }
                }
            }
        }
    }

    echo json_encode(["success" => true]);
}
elseif ($action === 'admin_delete_order') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $admin_id = (int)($data['admin_id'] ?? 0);
    $token = $data['auth_token'] ?? '';
    if ($token === '') { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }
    $stmt = $conn->prepare("SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > NOW() AND isAdmin=1");
    $stmt->bind_param("is", $admin_id, $token);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) { echo json_encode(["success"=>false, "message"=>"Unauthorized"]); exit; }

    $id = $data['id'] ?? '';
    $del = $conn->prepare("DELETE FROM orders WHERE id=?");
    $del->bind_param("s", $id);
    $del->execute();
    
    echo json_encode(["success" => true]);
}
elseif ($action === 'request_password_reset') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $email = trim($data['email'] ?? '');
    if ($email === '') { echo json_encode(["success"=>false, "message"=>"Email required"]); exit; }
    
    $check = $conn->prepare("SELECT id, name, reset_expires FROM users WHERE email=?");
    $check->bind_param("s", $email);
    $check->execute();
    $cRes = $check->get_result();
    if ($cRes->num_rows > 0) {
        $row = $cRes->fetch_assoc();
        
        if ($row['reset_expires'] && strtotime($row['reset_expires']) > (time() + 2700)) {
            echo json_encode(["success"=>true]);
            exit;
        }

        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', time() + 3600); // 1 hour expiration
        
        $upd = $conn->prepare("UPDATE users SET reset_token=?, reset_expires=? WHERE id=?");
        $upd->bind_param("ssi", $token, $expires, $row['id']);
        $upd->execute();
        
        require_once __DIR__ . '/PHPMailer/Exception.php';
        require_once __DIR__ . '/PHPMailer/PHPMailer.php';
        require_once __DIR__ . '/PHPMailer/SMTP.php';
        try {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = STORE_EMAIL;
            $mail->Password   = str_replace(' ', '', STORE_EMAIL_PASSWORD);
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;
            $mail->setFrom(STORE_EMAIL, STORE_EMAIL_NAME);
            $mail->addAddress($email, $row['name']);
            $mail->isHTML(true);
            $mail->Subject = "إعادة تعيين كلمة المرور - BRONCO Store";
            
            $resetLink = BASE_URL . "/store/reset.html?token=" . $token;
            
            $body = "<div dir='rtl' style='font-family: Arial, sans-serif; font-size:16px; color:#333; line-height:1.6;'>
                        <h2 style='color:#5C3A21; border-bottom:2px dashed #C4A484; padding-bottom:10px;'>مرحباً " . htmlspecialchars($row['name']) . "! 🤠</h2>
                        <p>لقد استلمنا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في متجرنا.</p>
                        <p>اضغط على الزر أدناه لاختيار كلمة مرور جديدة:</p>
                        <div style='margin:20px 0;'>
                            <a href='$resetLink' style='display:inline-block; padding:12px 24px; background:#A16B43; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold; letter-spacing:1px; box-shadow:0 4px 10px rgba(0,0,0,.2);'>إعادة التعيين الآن</a>
                        </div>
                        <p style='color:#666; font-size:14px;'><br>هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب هذا التغيير، يُرجى تجاهل هذه الرسالة بأمان.</p>
                     </div>";
            $mail->Body = $body;
            $mail->send();
        } catch (Exception $e) {
            error_log("Reset Mail Error: " . $e->getMessage());
        }
    }
    // Always return true to prevent malicious email discovery scanning
    echo json_encode(["success"=>true]);
}
elseif ($action === 'execute_password_reset') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $token = trim($data['token'] ?? '');
    $newPass = trim($data['new_password'] ?? '');
    
    if ($token === '' || strlen($newPass) < 6) {
        echo json_encode(["success"=>false, "message"=>"Invalid data or password too short (min 6 chars)"]); exit;
    }
    
    // Check if token exists and hasn't expired
    $check = $conn->prepare("SELECT id FROM users WHERE reset_token=? AND reset_expires > NOW()");
    $check->bind_param("s", $token);
    $check->execute();
    $cRes = $check->get_result();
    if ($cRes->num_rows > 0) {
        $row = $cRes->fetch_assoc();
        $hash = password_hash($newPass, PASSWORD_DEFAULT);
        
        $upd = $conn->prepare("UPDATE users SET password=?, reset_token=NULL, reset_expires=NULL WHERE id=?");
        $upd->bind_param("si", $hash, $row['id']);
        $upd->execute();
        
        echo json_encode(["success"=>true]);
    } else {
        echo json_encode(["success"=>false, "message"=>"Invalid or expired reset token"]);
    }
}
elseif ($action === 'send_message') {
    $data = json_decode(file_get_contents("php://input"), true) ?? [];
    $name = htmlspecialchars(trim($data['name'] ?? ''));
    $email = filter_var(trim($data['email'] ?? ''), FILTER_SANITIZE_EMAIL);
    $message = htmlspecialchars(trim($data['message'] ?? ''));
    
    if(!$name || !$email || !$message){
        echo json_encode(["success"=>false, "message"=>"جميع الحقول مطلوبة"]); exit;
    }
    
    $stmt = $conn->prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param("sss", $name, $email, $message);
        $stmt->execute();
        echo json_encode(["success"=>true, "message"=>"تم إرسال رسالتك بنجاح!"]);
    } else {
        echo json_encode(["success"=>false, "message"=>"DB Error"]);
    }
}
else {
    echo json_encode(["error" => "Invalid action"]);
}
?>
