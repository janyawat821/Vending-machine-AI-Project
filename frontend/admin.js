// frontend/admin.js
// หน้าหลังบ้าน: เช็คสต็อก เติมของ ดูยอดขาย (ต้องเปิด backend ก่อน)

const API_BASE = 'http://localhost:3001';
const $ = (sel) => document.querySelector(sel);
const money = (n) => n.toLocaleString('th-TH') + '฿';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let pin = sessionStorage.getItem('hoshimori_pin') || '';
let toastTimer = null;

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
  });
  const data = await res.json().catch(() => ({ ok: false, error: 'อ่านคำตอบจากเซิร์ฟเวอร์ไม่ได้' }));
  if (res.status === 401) { logout(); throw new Error(data.error || 'PIN ไม่ถูกต้อง'); }
  return data;
}

function toast(text) {
  $('#toast').textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; }, 2500);
}

// ---------- เข้า/ออกระบบ ----------
async function login() {
  const value = $('#pin').value.trim();
  if (!value) { $('#loginMsg').textContent = 'กรุณาใส่ PIN'; return; }
  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: value }),
    });
    const data = await res.json();
    if (!data.ok) { $('#loginMsg').textContent = data.error || 'PIN ไม่ถูกต้อง'; return; }
    pin = value;
    sessionStorage.setItem('hoshimori_pin', pin);
    $('#loginMsg').textContent = '';
    showAdmin();
  } catch (err) {
    $('#loginMsg').textContent = 'เชื่อมต่อ backend ไม่ได้ ตรวจว่าเปิด npm start แล้วหรือยัง';
  }
}

function logout() {
  pin = '';
  sessionStorage.removeItem('hoshimori_pin');
  $('#adminView').hidden = true;
  $('#loginView').hidden = false;
  $('#pin').value = '';
}

function showAdmin() {
  $('#loginView').hidden = true;
  $('#adminView').hidden = false;
  refresh();
}

// ---------- วาดหน้าจอ ----------
const TIERS = [
  { cat: 'keychain', label: 'A · พวงกุญแจ' },
  { cat: 'omamori', label: 'B · เครื่องราง โอมาโมริ' },
  { cat: 'crystal', label: 'C · หินคริสตัลนำโชค' },
];

function renderSummary(s) {
  $('#summary').innerHTML = `
    <div class="stat"><span>ยอดขายวันนี้</span><b>${money(s.todayRevenue)}</b></div>
    <div class="stat"><span>ออเดอร์วันนี้</span><b>${s.todayOrders}</b></div>
    <div class="stat ${s.lowCount ? 'warn' : ''}"><span>ใกล้หมด</span><b>${s.lowCount} ช่อง</b></div>
    <div class="stat ${s.outCount ? 'warn' : ''}"><span>หมดแล้ว</span><b>${s.outCount} ช่อง</b></div>`;
}

function renderStock(data) {
  $('#stockList').innerHTML = TIERS.map((t) => {
    const rows = data.items.filter((it) => it.cat === t.cat).map((it) => {
      const cls = it.stock <= 0 ? ' out' : it.stock <= data.lowStock ? ' low' : '';
      const pct = Math.min(100, Math.round((it.stock / data.startStock) * 100));
      const note = it.stock <= 0 ? 'หมดแล้ว' : it.stock <= data.lowStock ? 'ใกล้หมด' : 'ปกติ';
      return `
        <div class="stock-row${cls}">
          <span class="thumb">${itemIcon(it)}</span>
          <div class="nm">${esc(it.id)} · ${esc(it.name)}<small>${money(it.price)} · ขายแล้ว ${it.sold} ชิ้น</small></div>
          <div class="bar"><span><b>${it.stock}</b> / ${data.startStock} ชิ้น · ${note}</span>
            <span class="track"><span class="fill" style="display:block;width:${pct}%"></span></span></div>
          <div class="stepper">
            <button data-act="dec" data-id="${it.id}" data-stock="${it.stock}" aria-label="ลด ${esc(it.id)}" ${it.stock <= 0 ? 'disabled' : ''}>−</button>
            <output>${it.stock}</output>
            <button data-act="inc" data-id="${it.id}" data-stock="${it.stock}" aria-label="เพิ่ม ${esc(it.id)}" ${it.stock >= 99 ? 'disabled' : ''}>+</button>
            <button class="fillbtn" data-act="fill" data-id="${it.id}" data-stock="${data.startStock}" ${it.stock >= data.startStock ? 'disabled' : ''}>เติมเต็ม</button>
          </div>
        </div>`;
    }).join('');
    return `<div class="tier-block"><h3>${t.label}</h3>${rows}</div>`;
  }).join('');
}

function renderSales(sales) {
  if (!sales.length) {
    $('#salesList').innerHTML = '<div class="empty-note">ยังไม่มีรายการขาย</div>';
    return;
  }
  $('#salesList').innerHTML = `
    <table class="sales">
      <thead><tr><th>เวลา</th><th>ออเดอร์</th><th>สินค้า</th><th>จ่ายด้วย</th><th class="num">ยอด</th></tr></thead>
      <tbody>
        ${sales.map((s) => `
          <tr>
            <td>${new Date(s.time).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
            <td>${esc(s.orderId)}</td>
            <td>${s.lines.map((l) => esc(`${l.id} ${l.name}`)).join(', ')}</td>
            <td>${s.method === 'cash' ? 'เงินสด' : 'PromptPay'}</td>
            <td class="num">${money(s.total)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function refresh() {
  try {
    const [overview, sales] = await Promise.all([api('/api/admin/overview'), api('/api/admin/sales')]);
    renderSummary(overview.summary);
    renderStock(overview);
    renderSales(sales.sales);
  } catch (err) {
    if (pin) toast('โหลดข้อมูลไม่ได้ ตรวจว่า backend เปิดอยู่');
  }
}

async function setStock(id, value) {
  const data = await api('/api/admin/stock', { method: 'POST', body: JSON.stringify({ id, stock: value }) });
  if (!data.ok) { toast(data.error); return; }
  toast(`${id} ตอนนี้เหลือ ${data.stock} ชิ้น`);
  refresh();
}

// ---------- ผูกปุ่ม ----------
$('#loginBtn').addEventListener('click', login);
$('#pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
$('#refreshBtn').addEventListener('click', () => { refresh(); toast('รีเฟรชแล้ว'); });
$('#logoutBtn').addEventListener('click', logout);
$('#refillBtn').addEventListener('click', async () => {
  if (!confirm('เติมเต็มทุกช่องกลับเป็นค่าเริ่มต้น ใช่ไหม')) return;
  const data = await api('/api/admin/refill-all', { method: 'POST', body: '{}' });
  if (data.ok) { toast(`เติมทุกช่องเป็น ${data.stock} ชิ้นแล้ว`); refresh(); }
});
$('#stockList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const cur = Number(btn.dataset.stock);
  const next = btn.dataset.act === 'inc' ? cur + 1 : btn.dataset.act === 'dec' ? cur - 1 : cur;
  setStock(btn.dataset.id, next);
});

// ถ้าเคยล็อกอินค้างไว้ในแท็บนี้ ลองเข้าเลย
if (pin) showAdmin();
