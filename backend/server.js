// backend/server.js
// รัน: npm install แล้ว npm start  แล้วเปิด http://localhost:3001 (ตู้และหลังบ้านอยู่พอร์ตเดียวกัน)
// หลังบ้าน: http://localhost:3001/admin.html ใส่ PIN (ค่าเริ่มต้น 1234 เปลี่ยนได้ด้วย ADMIN_PIN=xxxx npm start)

const path = require('path');
const express = require('express');
const cors = require('cors');
const { CATEGORIES, START_STOCK, items, getMenu, findItem, priceOf, saveData, loadSales, addSale } = require('./items');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // เสิร์ฟ index.html, admin.html ฯลฯ จากพอร์ตเดียวกัน

const DENOMS = [100, 50, 20, 10, 5, 1]; // เหรียญ/ธนบัตรที่ตู้รับและทอนได้
const METHODS = ['cash', 'promptpay'];
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
const LOW_STOCK = 2; // เหลือเท่านี้หรือน้อยกว่า = ใกล้หมด

let orderNo = 1000 + loadSales().length; // เลขออเดอร์ต่อจากเดิมแม้เปิดเซิร์ฟเวอร์ใหม่

// ทอนเงินโดยหยิบใบใหญ่สุดก่อน (greedy)
// ชุด 1/5/10/20/50/100 ทอนจำนวนเต็มบาทได้ลงตัวเสมอ
function makeChange(amount) {
  let rest = amount;
  const result = [];
  for (const denom of DENOMS) {
    const count = Math.floor(rest / denom);
    if (count > 0) {
      result.push({ denom, count });
      rest -= denom * count;
    }
  }
  return result;
}

function fail(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

// ---------- ฝั่งลูกค้า ----------

app.get('/api/menu', (req, res) => {
  res.json({ items: getMenu(), denoms: DENOMS });
});

// body: { cart: [{ id, qty }], method: 'cash' | 'promptpay', inserted }
// inserted ใช้เฉพาะเงินสด (ยอดที่หยอดรวมทั้งหมด)
app.post('/api/checkout', (req, res) => {
  const { cart, method, inserted } = req.body || {};

  if (!Array.isArray(cart) || cart.length === 0) {
    return fail(res, 400, 'ตะกร้าว่างเปล่า');
  }
  if (cart.length !== 1 || Number(cart[0].qty) !== 1) {
    return fail(res, 400, 'ซื้อได้ทีละ 1 ชิ้นเท่านั้น');
  }
  if (!METHODS.includes(method)) {
    return fail(res, 400, 'วิธีชำระเงินไม่ถูกต้อง');
  }

  // 1) ตรวจทุกรายการก่อน ยังไม่ตัดสต็อก
  const lines = [];
  const seen = new Set();
  let total = 0;

  for (const row of cart) {
    const item = findItem(row.id);
    const qty = Number(row.qty);

    if (!item) return fail(res, 404, `ไม่พบสินค้ารหัส ${row.id}`);
    if (seen.has(row.id)) return fail(res, 400, `สินค้า ${row.id} ซ้ำในตะกร้า`);
    if (!Number.isInteger(qty) || qty < 1) return fail(res, 400, 'จำนวนสินค้าไม่ถูกต้อง');
    if (item.stock < qty) {
      return fail(res, 409, `${item.name} เหลือ ${item.stock} ชิ้น`);
    }

    seen.add(row.id);
    lines.push({ item, qty });
    total += priceOf(item) * qty;
  }

  // 2) ตรวจเงิน
  let paid = total; // PromptPay จ่ายพอดีเสมอ
  if (method === 'cash') {
    paid = Number(inserted);
    if (!Number.isInteger(paid) || paid < total) {
      return fail(res, 400, `เงินไม่พอ ต้องจ่าย ${total}฿`);
    }
  }
  const change = paid - total;

  // 3) ผ่านทั้งหมดแล้วค่อยตัดสต็อก
  const stock = {};
  for (const { item, qty } of lines) {
    item.stock -= qty;
    stock[item.id] = item.stock;
  }

  orderNo += 1;
  const orderId = `HS${orderNo}`;

  // 4) บันทึกยอดขาย (หลังบ้านเอาไปแสดง) แล้วเซฟลงไฟล์
  addSale({
    orderId,
    time: new Date().toISOString(),
    method,
    total,
    paid,
    change,
    lines: lines.map(({ item, qty }) => ({ id: item.id, name: item.name, qty })),
  });

  res.json({
    ok: true,
    orderId,
    method,
    total,
    paid,
    change,
    changeBreakdown: makeChange(change),
    lines: lines.map(({ item, qty }) => ({ id: item.id, name: item.name, qty })),
    stock,
  });
});

// ---------- หลังบ้าน (ต้องมี PIN) ----------

function requirePin(req, res, next) {
  if (req.get('x-admin-pin') !== ADMIN_PIN) {
    return fail(res, 401, 'PIN ไม่ถูกต้อง');
  }
  next();
}

// ตรวจ PIN ตอนเข้าหน้าหลังบ้าน
app.post('/api/admin/login', (req, res) => {
  if ((req.body || {}).pin !== ADMIN_PIN) return fail(res, 401, 'PIN ไม่ถูกต้อง');
  res.json({ ok: true });
});

// ภาพรวมสต็อก + ยอดขายวันนี้/ทั้งหมด
app.get('/api/admin/overview', requirePin, (req, res) => {
  const sales = loadSales();
  const sold = {};
  sales.forEach((s) => s.lines.forEach((l) => { sold[l.id] = (sold[l.id] || 0) + l.qty; }));

  const today = new Date().toDateString();
  const todaySales = sales.filter((s) => new Date(s.time).toDateString() === today);
  const sum = (list) => list.reduce((t, s) => t + s.total, 0);

  const menu = getMenu().map((it) => ({ ...it, sold: sold[it.id] || 0 }));
  res.json({
    ok: true,
    startStock: START_STOCK,
    lowStock: LOW_STOCK,
    categories: CATEGORIES,
    items: menu,
    summary: {
      todayOrders: todaySales.length,
      todayRevenue: sum(todaySales),
      totalOrders: sales.length,
      totalRevenue: sum(sales),
      lowCount: menu.filter((it) => it.stock > 0 && it.stock <= LOW_STOCK).length,
      outCount: menu.filter((it) => it.stock <= 0).length,
    },
  });
});

// ประวัติการขายล่าสุด (ใหม่สุดก่อน)
app.get('/api/admin/sales', requirePin, (req, res) => {
  res.json({ ok: true, sales: loadSales().slice().reverse().slice(0, 50) });
});

// ตั้งสต็อกช่องเดียว body: { id, stock }
app.post('/api/admin/stock', requirePin, (req, res) => {
  const { id, stock } = req.body || {};
  const item = findItem(id);
  if (!item) return fail(res, 404, `ไม่พบช่อง ${id}`);
  const n = Number(stock);
  if (!Number.isInteger(n) || n < 0 || n > 99) return fail(res, 400, 'จำนวนต้องเป็นเลข 0-99');
  item.stock = n;
  saveData();
  res.json({ ok: true, id: item.id, stock: item.stock });
});

// เติมเต็มทุกช่องกลับเป็นค่าเริ่มต้น
app.post('/api/admin/refill-all', requirePin, (req, res) => {
  items.forEach((it) => { it.stock = START_STOCK; });
  saveData();
  res.json({ ok: true, stock: START_STOCK });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Hoshimori: http://localhost:${PORT}`);
  console.log(`หลังบ้าน: http://localhost:${PORT}/admin.html (PIN ${ADMIN_PIN === '1234' ? '1234 - ค่าเริ่มต้น' : 'ตามที่ตั้งไว้'})`);
  // แจ้งว่าเจอรูปสินค้ากี่ช่อง ช่วยตรวจว่าทำไมยังไม่ขึ้นรูป (ชื่อไฟล์/นามสกุลไม่ตรง)
  const withPhoto = getMenu().filter((it) => it.photo);
  if (withPhoto.length) {
    console.log(`พบรูปสินค้า ${withPhoto.length} ช่อง: ${withPhoto.map((it) => `${it.id}=${it.photo}`).join(', ')}`);
  } else {
    console.log('ยังไม่พบไฟล์รูปสินค้าใน frontend/assets/items/ (ใช้ไอคอนแทนทุกช่อง)');
  }
});
