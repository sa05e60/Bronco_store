const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sqlite = require('../sqlite_async');

// ─── helpers ────────────────────────────────────────────────────────
function ok(data = {}) { return { success: true, ...data }; }
function fail(message) { return { success: false, message }; }

function getMailTransporter() {
  const email = process.env.STORE_EMAIL;
  const pass = process.env.STORE_EMAIL_PASSWORD;
  if (!email || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: email, pass: pass.replace(/ /g, '') },
  });
}

// All actions are served via GET/POST on /api?action=<name>
router.all('/', async (req, res) => {
  const action = req.query.action || '';
  const data = req.body || {};

  try {
    switch (action) {

      // ═══════════════════════ AUTH ═══════════════════════════════
      case 'login': {
        const { email, password } = data;
        if (!email || !password) return res.json(fail('Email and password are required.'));
        const row = await sqlite.getAsync('SELECT * FROM users WHERE email=?', [email]);
        if (!row) return res.json(fail('User not found.'));
        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.json(fail('Invalid password.'));
        const token = crypto.randomBytes(16).toString('hex');
        await sqlite.runAsync('UPDATE users SET auth_token=?, token_expires=datetime("now", "+30 days") WHERE id=?', [token, row.id]);
        row.auth_token = token;
        delete row.password;
        return res.json(ok({ user: row }));
      }

      case 'register': {
        const { name, email, phone, password: rawPass } = data;
        if (!email || !rawPass) return res.json(fail('Email and password are required.'));
        if (rawPass.length < 6) return res.json(fail('Password must be at least 6 characters.'));
        const hash = await bcrypt.hash(rawPass, 10);
        const existing = await sqlite.getAsync('SELECT id FROM users WHERE email=?', [email]);
        if (existing) return res.json(fail('Email already exists.'));
        const token = crypto.randomBytes(16).toString('hex');
        await sqlite.runAsync(
          'INSERT INTO users (name, email, phone, password, auth_token, token_expires) VALUES (?, ?, ?, ?, ?, datetime("now", "+30 days"))',
          [name || '', email, phone || '', hash, token]
        );
        const row = await sqlite.getAsync('SELECT * FROM users WHERE email=?', [email]);
        delete row.password;
        return res.json(ok({ user: row }));
      }

      // ═══════════════════════ USER PROFILE ═══════════════════════
      case 'get_user': {
        const uid = parseInt(req.query.uid, 10);
        const token = req.query.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        const user = await sqlite.getAsync('SELECT id, name, email, phone, honorPoints, bounty, profilePic, address FROM users WHERE id=?', [uid]);
        if (!user) return res.json(fail('User not found.'));
        return res.json(ok({ user }));
      }

      case 'update_pic': {
        const uid = parseInt(data.uid, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        const pic = data.profilePic || '';
        const sizeBytes = Math.floor(pic.length * 0.75);
        if (sizeBytes > 2000000) return res.json(fail('حجم الصورة كبير جداً. الحد الأقصى هو 2MB'));
        if (/^data:image\/(\w+);base64,/.test(pic)) {
          const b64 = pic.substring(pic.indexOf(',') + 1);
          const buf = Buffer.from(b64, 'base64');
          // Basic mime check via magic bytes
          const header = buf.slice(0, 4).toString('hex');
          const validHeaders = ['89504e47', 'ffd8ffe0', 'ffd8ffe1', 'ffd8ffee', '47494638', '52494646'];
          if (!validHeaders.some(h => header.startsWith(h))) return res.json(fail('Invalid image format.'));
        }
        await sqlite.runAsync('UPDATE users SET profilePic=? WHERE id=?', [pic, uid]);
        return res.json(ok());
      }

      case 'update_name': {
        const uid = parseInt(data.uid, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        await sqlite.runAsync('UPDATE users SET name=? WHERE id=?', [data.name || '', uid]);
        return res.json(ok());
      }

      case 'update_address': {
        const uid = parseInt(data.uid, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        await sqlite.runAsync('UPDATE users SET address=? WHERE id=?', [data.address || '', uid]);
        return res.json(ok());
      }

      case 'update_phone': {
        const uid = parseInt(data.uid, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        await sqlite.runAsync('UPDATE users SET phone=? WHERE id=?', [data.phone || '', uid]);
        return res.json(ok());
      }

      case 'update_password': {
        const uid = parseInt(data.uid, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const row = await sqlite.getAsync('SELECT id, password FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
        if (!row) return res.json(fail('Unauthorized'));
        const match = await bcrypt.compare(data.old_password || '', row.password);
        if (!match) return res.json(fail('Incorrect current password.'));
        const newHash = await bcrypt.hash(data.new_password, 10);
        await sqlite.runAsync('UPDATE users SET password=? WHERE id=?', [newHash, uid]);
        return res.json(ok());
      }

      case 'get_user_orders': {
        const uid = parseInt(req.query.uid, 10);
        const token = req.query.auth_token || '';
        if (!token) return res.json({ success: false, orders: [] });
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
        if (!auth) return res.json({ success: false, orders: [] });
        const rows = await sqlite.allAsync('SELECT id, status, totals, createdAt FROM orders WHERE uid=? ORDER BY createdAt DESC LIMIT 10', [uid]);
        rows.forEach(r => { try { r.totals = JSON.parse(r.totals); } catch {} });
        return res.json(ok({ orders: rows }));
      }

      // ═══════════════════════ PRODUCTS / COUPONS (public) ═══════
      case 'get_products': {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = 50;
        const offset = (page - 1) * limit;
        const totalRow = await sqlite.getAsync('SELECT COUNT(*) as c FROM products');
        const total = totalRow ? totalRow.c : 0;
        const maxPages = Math.ceil(total / limit);
        const rows = await sqlite.allAsync('SELECT * FROM products ORDER BY createdAt DESC LIMIT ? OFFSET ?', [limit, offset]);
        rows.forEach(r => { try { r.details = JSON.parse(r.details); } catch {} });
        return res.json({ success: true, products: rows, page, maxPages, total });
      }

      case 'get_coupons': {
        const rows = await sqlite.allAsync('SELECT * FROM coupons');
        return res.json(ok({ coupons: rows }));
      }

      // ═══════════════════════ ORDER ══════════════════════════════
      case 'order': {
        const uid = parseInt(data.customer?.uid || 0, 10);
        const token = data.auth_token || '';

        if (uid > 0) {
          if (!token) return res.json(fail('Unauthorized'));
          const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now")', [uid, token]);
          if (!auth) return res.json(fail('Unauthorized'));
        }

        let subtotal = 0;
        let totalQty = 0;
        const safeItems = [];
        const rawItems = Array.isArray(data.items) ? data.items : [];

        for (const item of rawItems) {
          const prodId = item.id || '';
          const qty = parseInt(item.qty || 1, 10);
          if (qty <= 0) continue;

          const pRow = await sqlite.getAsync('SELECT title, priceCents, img, stock FROM products WHERE id=?', [prodId]);
          if (!pRow) continue;
          if (parseInt(pRow.stock, 10) < qty) {
            return res.json(fail(`عذراً، المنتج '${pRow.title}' غير متوفر بالكمية المطلوبة.`));
          }

          const price = parseInt(pRow.priceCents, 10);
          subtotal += price * qty;
          totalQty += qty;

          safeItems.push({
            id: prodId,
            title: pRow.title,
            priceCents: price,
            qty,
            img: pRow.img,
            size: item.size || null,
          });
        }

        let discount = 0;
        let shipping = (subtotal >= 10000 || subtotal === 0) ? 0 : 700;
        const couponCode = data.coupon || '';

        if (couponCode.startsWith('HONOR-') && totalQty >= 10) {
          discount = Math.round(subtotal * 0.20);
        } else if (couponCode) {
          const c = await sqlite.getAsync('SELECT type, value, minSubtotalCents FROM coupons WHERE code=?', [couponCode]);
          if (c) {
            if (!c.minSubtotalCents || subtotal >= parseInt(c.minSubtotalCents, 10)) {
              if (c.type === 'percent') discount = Math.round(subtotal * (parseInt(c.value, 10) / 100));
              else if (c.type === 'shipping') shipping = 0;
            }
          }
        }

        const taxableBase = Math.max(0, subtotal - discount);
        const tax = Math.round(taxableBase * 0.05);
        const total = taxableBase + tax + shipping;

        const safeTotals = { subtotal, discount, honorDiscount: 0, tax, shipping, total };
        const honorPoints = Math.min(100, Math.round((totalQty / 10) * 100));
        const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();

        // Decrease stock
        for (const it of safeItems) {
          await sqlite.runAsync('UPDATE products SET stock = stock - ? WHERE id=?', [it.qty, it.id]);
        }

        const status = data.status || 'placed';
        await sqlite.runAsync(
          'INSERT INTO orders (id, uid, items, totals, customer, status) VALUES (?, ?, ?, ?, ?, ?)',
          [orderId, uid, JSON.stringify(safeItems), JSON.stringify(safeTotals), JSON.stringify(data.customer), status]
        );

        let addedBounty = 0;
        if (uid > 0) {
          addedBounty = safeItems.length * 500;
          await sqlite.runAsync('UPDATE users SET honorPoints = MIN(100, honorPoints + ?), bounty = bounty + ? WHERE id=?', [honorPoints, addedBounty, uid]);
        }

        // ── Send email receipt ──
        try {
          const transporter = getMailTransporter();
          if (transporter) {
            const custEmail = (data.customer?.email || '').trim();
            if (custEmail) {
              let itemsList = safeItems.map(it => `<li>${it.title} (الكمية: ${it.qty})</li>`).join('');
              let bountyLine = uid > 0 ? `<p><b>البونتي (Bounty) المُكتسَب:</b> +$${addedBounty} 💰</p>` : '';
              const body = `<div dir='rtl' style='font-family:Arial,sans-serif;font-size:16px;color:#333;'>
                <h2 style='color:#C4A484;'>مرحباً ${data.customer?.name || 'شريكنا العزيز'}! 🤠</h2>
                <p>لقد استلمنا طلبك رقم <b>${orderId}</b> بنجاح، ونشكرك لاختيارك متجرنا.</p>
                <p>إجمالي قيمة الطلب: <b>$${(total / 100).toFixed(2)}</b></p>
                <hr style='border:1px dashed #C4A484;'>
                <h3>تفاصيل المنتجات:</h3><ul>${itemsList}</ul>
                ${bountyLine}
                <br><p>سنقوم بالتواصل معك قريباً لتأكيد الشحن.</p>
                <p>مع تحيات،<br>فريق BRONCO</p>
              </div>`;
              await transporter.sendMail({
                from: `"${process.env.STORE_EMAIL_NAME || 'BRONCO Store'}" <${process.env.STORE_EMAIL}>`,
                to: custEmail,
                subject: `تأكيد طلبك من BRONCO Store (رقم الطلب: ${orderId})`,
                html: body,
              });
            }
          }
        } catch (e) { console.error('Mail Error:', e.message); }

        return res.json(ok({ addedBounty, orderId }));
      }

      // ═══════════════════════ ADMIN AUTH ═════════════════════════
      case 'admin_login': {
        const { email, password: pass } = data;
        const row = await sqlite.getAsync('SELECT * FROM users WHERE email=? AND isAdmin=1', [email]);
        if (!row) return res.json(fail('Access denied. Admin only.'));
        const match = await bcrypt.compare(pass, row.password);
        if (!match) return res.json(fail('Invalid password.'));
        const token = crypto.randomBytes(16).toString('hex');
        await sqlite.runAsync('UPDATE users SET auth_token=?, token_expires=datetime("now", "+30 days") WHERE id=?', [token, row.id]);
        row.auth_token = token;
        delete row.password;
        return res.json(ok({ user: row }));
      }

      // ═══════════════════════ ADMIN PRODUCTS ════════════════════
      case 'admin_save_product': {
        const adminId = parseInt(data.admin_id, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now") AND isAdmin=1', [adminId, token]);
        if (!auth) return res.json(fail('Unauthorized'));

        const { id, title, priceCents, img, category, details, stock } = data;
        const detailsJson = JSON.stringify(details || {});
        const createdAt = data.createdAt ? data.createdAt.trim() : new Date().toISOString().slice(0, 19).replace('T', ' ');

        const existing = await sqlite.getAsync('SELECT id FROM products WHERE id=?', [id]);
        if (existing) {
          await sqlite.runAsync('UPDATE products SET title=?, priceCents=?, img=?, category=?, details=?, stock=? WHERE id=?',
            [title, parseInt(priceCents, 10), img || '', category || '', detailsJson, parseInt(stock || 0, 10), id]);
        } else {
          await sqlite.runAsync('INSERT INTO products (id, title, priceCents, img, category, details, createdAt, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, title, parseInt(priceCents, 10), img || '', category || '', detailsJson, createdAt, parseInt(stock || 0, 10)]);
        }
        return res.json(ok());
      }

      case 'admin_delete_product': {
        const adminId = parseInt(data.admin_id, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now") AND isAdmin=1', [adminId, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        await sqlite.runAsync('DELETE FROM products WHERE id=?', [data.id || '']);
        return res.json(ok());
      }

      // ═══════════════════════ ADMIN COUPONS ═════════════════════
      case 'admin_save_coupon': {
        const adminId = parseInt(data.admin_id, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now") AND isAdmin=1', [adminId, token]);
        if (!auth) return res.json(fail('Unauthorized'));

        const { code, type, value, label, minSubtotalCents } = data;
        const createdAt = data.createdAt ? data.createdAt.trim() : new Date().toISOString().slice(0, 19).replace('T', ' ');

        const existing = await sqlite.getAsync('SELECT code FROM coupons WHERE code=?', [code]);
        if (existing) {
          await sqlite.runAsync('UPDATE coupons SET type=?, value=?, label=?, minSubtotalCents=? WHERE code=?',
            [type, parseInt(value, 10), label || '', parseInt(minSubtotalCents || 0, 10), code]);
        } else {
          await sqlite.runAsync('INSERT INTO coupons (code, type, value, label, minSubtotalCents, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [code, type, parseInt(value, 10), label || '', parseInt(minSubtotalCents || 0, 10), createdAt]);
        }
        return res.json(ok());
      }

      case 'admin_delete_coupon': {
        const adminId = parseInt(data.admin_id, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now") AND isAdmin=1', [adminId, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        await sqlite.runAsync('DELETE FROM coupons WHERE code=?', [data.code || '']);
        return res.json(ok());
      }

      // ═══════════════════════ ADMIN ORDERS ══════════════════════
      case 'admin_get_orders': {
        const adminId = parseInt(req.query.admin_id, 10);
        const token = req.query.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now") AND isAdmin=1', [adminId, token]);
        if (!auth) return res.json(fail('Unauthorized'));

        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = 50;
        const offset = (page - 1) * limit;
        const totalRow = await sqlite.getAsync('SELECT COUNT(*) as c FROM orders');
        const total = totalRow ? totalRow.c : 0;
        const maxPages = Math.ceil(total / limit);
        const rows = await sqlite.allAsync('SELECT * FROM orders ORDER BY createdAt DESC LIMIT ? OFFSET ?', [limit, offset]);
        rows.forEach(r => {
          try { r.customer = JSON.parse(r.customer); } catch {}
          try { r.items = JSON.parse(r.items); } catch {}
          try { r.totals = JSON.parse(r.totals); } catch {}
        });
        return res.json({ success: true, orders: rows, page, maxPages, total });
      }

      case 'admin_update_order_status': {
        const adminId = parseInt(data.admin_id, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now") AND isAdmin=1', [adminId, token]);
        if (!auth) return res.json(fail('Unauthorized'));

        const { id: orderId, status: newStatus } = data;
        await sqlite.runAsync('UPDATE orders SET status=? WHERE id=?', [newStatus, orderId]);

        // Send email on shipped / delivered
        try {
          if (newStatus === 'shipped' || newStatus === 'delivered') {
            const oRow = await sqlite.getAsync('SELECT customer FROM orders WHERE id=?', [orderId]);
            if (oRow) {
              const custData = typeof oRow.customer === 'string' ? JSON.parse(oRow.customer) : oRow.customer;
              const custEmail = (custData?.email || '').trim();
              if (custEmail) {
                const transporter = getMailTransporter();
                if (transporter) {
                  const custName = custData?.name || 'شريكنا';
                  let subject, body;
                  if (newStatus === 'shipped') {
                    subject = `تم شحن طلبك من BRONCO Store 📦 (رقم: ${orderId})`;
                    body = `<div dir='rtl' style='font-family:Arial,sans-serif;font-size:16px;color:#333;'>
                      <h2 style='color:#C4A484;'>مرحباً ${custName}! 🤠</h2>
                      <p>نود إعلامك أن طلبك <b>${orderId}</b> قد تم تجهيزه وتسليمه لشركة الشحن، وهو الآن في طريقه إليك! 🚚💨</p>
                      <p>يرجى إبقاء هاتفك مفتوحاً للتواصل معك عند وصول المندوب.</p><br>
                      <p>نتمنى لك تجربة ممتعة مع منتجاتنا!</p>
                      <p>مع تحيات،<br>فريق BRONCO</p></div>`;
                  } else {
                    subject = `تم تسليم طلبك بنجاح! شاركنا تقييمك 🌟 (رقم: ${orderId})`;
                    body = `<div dir='rtl' style='font-family:Arial,sans-serif;font-size:16px;color:#333;'>
                      <h2 style='color:#C4A484;'>مرحباً ${custName}! 🤠</h2>
                      <p>يسعدنا إخبارك أن طلبك <b>${orderId}</b> قد وصل إليك بسلام وتم تسجيله كمُستلم بنجاح! 🎉</p>
                      <p>نأمل أن تكون منتجاتنا قد لبت توقعاتك. رأيك يهمنا جداً.</p><br>
                      <p>شكراً لكونك جزءاً من عائلة BRONCO، وننتظر زيارتك القادمة!</p>
                      <p>مع تحيات،<br>فريق الغرب الجامح 🐎</p></div>`;
                  }
                  await transporter.sendMail({
                    from: `"${process.env.STORE_EMAIL_NAME || 'BRONCO Store'}" <${process.env.STORE_EMAIL}>`,
                    to: custEmail, subject, html: body,
                  });
                }
              }
            }
          }
        } catch (e) { console.error('Mail Error:', e.message); }

        return res.json(ok());
      }

      case 'admin_delete_order': {
        const adminId = parseInt(data.admin_id, 10);
        const token = data.auth_token || '';
        if (!token) return res.json(fail('Unauthorized'));
        const auth = await sqlite.getAsync('SELECT id FROM users WHERE id=? AND auth_token=? AND token_expires > datetime("now") AND isAdmin=1', [adminId, token]);
        if (!auth) return res.json(fail('Unauthorized'));
        await sqlite.runAsync('DELETE FROM orders WHERE id=?', [data.id || '']);
        return res.json(ok());
      }

      // ═══════════════════════ PASSWORD RESET ════════════════════
      case 'request_password_reset': {
        const email = (data.email || '').trim();
        if (!email) return res.json(fail('Email required'));

        const row = await sqlite.getAsync('SELECT id, name, reset_expires FROM users WHERE email=?', [email]);
        if (row) {
          // Rate-limit: if a token was issued less than 5 min ago, skip
          if (row.reset_expires && new Date(row.reset_expires).getTime() > (Date.now() + 2700 * 1000)) {
            return res.json(ok());
          }
          const resetToken = crypto.randomBytes(32).toString('hex');
          const expires = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
          await sqlite.runAsync('UPDATE users SET reset_token=?, reset_expires=? WHERE id=?', [resetToken, expires, row.id]);

          try {
            const transporter = getMailTransporter();
            if (transporter) {
              const resetLink = `${process.env.BASE_URL || ''}/store/reset.html?token=${resetToken}`;
              const body = `<div dir='rtl' style='font-family:Arial,sans-serif;font-size:16px;color:#333;line-height:1.6;'>
                <h2 style='color:#5C3A21;border-bottom:2px dashed #C4A484;padding-bottom:10px;'>مرحباً ${row.name}! 🤠</h2>
                <p>لقد استلمنا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في متجرنا.</p>
                <p>اضغط على الزر أدناه لاختيار كلمة مرور جديدة:</p>
                <div style='margin:20px 0;'>
                  <a href='${resetLink}' style='display:inline-block;padding:12px 24px;background:#A16B43;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;letter-spacing:1px;box-shadow:0 4px 10px rgba(0,0,0,.2);'>إعادة التعيين الآن</a>
                </div>
                <p style='color:#666;font-size:14px;'><br>هذا الرابط صالح لمدة ساعة واحدة فقط.</p></div>`;
              await transporter.sendMail({
                from: `"${process.env.STORE_EMAIL_NAME || 'BRONCO Store'}" <${process.env.STORE_EMAIL}>`,
                to: email, subject: 'إعادة تعيين كلمة المرور - BRONCO Store', html: body,
              });
            }
          } catch (e) { console.error('Reset Mail Error:', e.message); }
        }
        // Always return true to prevent email enumeration
        return res.json(ok());
      }

      case 'execute_password_reset': {
        const resetToken = (data.token || '').trim();
        const newPass = (data.new_password || '').trim();
        if (!resetToken || newPass.length < 6) return res.json(fail('Invalid data or password too short (min 6 chars)'));
        const row = await sqlite.getAsync('SELECT id FROM users WHERE reset_token=? AND reset_expires > datetime("now")', [resetToken]);
        if (!row) return res.json(fail('Invalid or expired reset token'));
        const hash = await bcrypt.hash(newPass, 10);
        await sqlite.runAsync('UPDATE users SET password=?, reset_token=NULL, reset_expires=NULL WHERE id=?', [hash, row.id]);
        return res.json(ok());
      }

      // ═══════════════════════ CONTACT MESSAGE ═══════════════════
      case 'send_message': {
        const name = (data.name || '').trim();
        const email = (data.email || '').trim();
        const message = (data.message || '').trim();
        if (!name || !email || !message) return res.json(fail('جميع الحقول مطلوبة'));
        await sqlite.runAsync('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)', [name, email, message]);
        return res.json(ok({ message: 'تم إرسال رسالتك بنجاح!' }));
      }

      // ═══════════════════════ FALLBACK ══════════════════════════
      default:
        return res.json({ error: 'Invalid action' });
    }
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
