<?php
require_once __DIR__ . '/api/email_config.php';
require_once __DIR__ . '/api/PHPMailer/Exception.php';
require_once __DIR__ . '/api/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/api/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$mail = new PHPMailer(true);

try {
    $mail->SMTPDebug = 2; // Enable verbose debug output
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = STORE_EMAIL;
    $mail->Password   = str_replace(' ', '', STORE_EMAIL_PASSWORD);
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;
    $mail->Timeout    = 10;

    $mail->setFrom(STORE_EMAIL, STORE_EMAIL_NAME);
    $mail->addAddress(STORE_EMAIL, 'Test User'); // Send to self
    $mail->Subject = 'Test Email From localhost';
    $mail->Body    = 'This is a test email!';

    $mail->send();
    echo "\n\n---> Message has been sent successfully!\n";
} catch (Exception $e) {
    echo "\n\n---> Message could not be sent. Mailer Error: {$mail->ErrorInfo}\n";
}
?>
