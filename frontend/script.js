// frontend/script.js
// state มีแค่ไม่กี่ตัว ทุกครั้งที่ state เปลี่ยนจะวาดหน้าจอใหม่จาก state

const BILLS = [1, 5, 10, 20, 50, 100];
const QR_SECONDS = 5 * 60;

// ---------- คุยกับ backend (เดิมแยกไว้เป็น api.js) ----------
// เปิดจาก backend เอง (พอร์ต 3001) ใช้ path เดียวกันได้เลย เปิดผ่าน Live Server พอร์ตอื่นค่อย fallback ไป localhost:3001
const API_BASE = location.port === '3001' ? '' : 'http://localhost:3001';
const DENOMS = [100, 50, 20, 10, 5, 1];

let offlineMode = false;
let offlineItems = null;

async function loadMenu() {
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    if (!res.ok) throw new Error('menu failed');
    const data = await res.json();
    offlineMode = false;
    return { items: data.items, offline: false };
  } catch (err) {
    offlineMode = true;
    if (!offlineItems) offlineItems = buildOfflineItems();
    return { items: offlineItems, offline: true };
  }
}

async function checkout(payload) {
  if (offlineMode) return offlineCheckout(payload);
  const res = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// โหมดออฟไลน์ (เปิดไฟล์ตรง ๆ โดยไม่ได้เปิด backend) — ข้อมูลชุดเดียวกับ backend/items.js
function buildOfflineItems() {
  const groups = [
    { letter: 'A', cat: 'keychain', file: 'keychain', price: 79, names: [
      'Makineko แมวกวักทอง', 'จิ้งจอกนำโชค', 'ตุ๊กตาดารุมะจิ๋ว', 'กระดิ่งซากุระ', 'ปลาคาร์ฟมงคล'] },
    { letter: 'B', cat: 'omamori', file: 'omamori', price: 129, names: [
      'โอมาโมริ สุขภาพแข็งแรง', 'โอมาโมริ ความรัก', 'โอมาโมริ การเรียน',
      'โอมาโมริ เดินทางปลอดภัย', 'โอมาโมริ โชคลาภ'] },
    { letter: 'C', cat: 'crystal', file: 'crystal', price: 99, names: [
      'Rose Quartz', 'Citrine', 'Amethyst', 'Clear Quartz', 'Green Aventurine'] },
  ];
  const items = [];
  groups.forEach((g) => {
    g.names.forEach((name, i) => {
      items.push({ id: `${g.letter}${i + 1}`, cat: g.cat, name, img: `${g.file}-${i + 1}`, photo: null, price: g.price, stock: 5 });
    });
  });
  return items;
}

function offlineMakeChange(amount) {
  let rest = amount;
  const result = [];
  for (const denom of DENOMS) {
    const count = Math.floor(rest / denom);
    if (count > 0) { result.push({ denom, count }); rest -= denom * count; }
  }
  return result;
}

let offlineOrderNo = 1000;

function offlineCheckout({ cart, method, inserted }) {
  if (cart.length !== 1 || cart[0].qty !== 1) return { ok: false, error: 'ซื้อได้ทีละ 1 ชิ้นเท่านั้น' };
  let total = 0;
  const lines = [];
  for (const row of cart) {
    const item = offlineItems.find((it) => it.id === row.id);
    if (!item) return { ok: false, error: `ไม่พบสินค้ารหัส ${row.id}` };
    if (item.stock < row.qty) return { ok: false, error: `${item.name} เหลือ ${item.stock} ชิ้น` };
    total += item.price * row.qty;
    lines.push({ item, qty: row.qty });
  }
  const paid = method === 'cash' ? inserted : total;
  if (paid < total) return { ok: false, error: `เงินไม่พอ ต้องจ่าย ${total}฿` };
  const stock = {};
  lines.forEach(({ item, qty }) => { item.stock -= qty; stock[item.id] = item.stock; });
  offlineOrderNo += 1;
  return {
    ok: true, orderId: `HS${offlineOrderNo}`, method, total, paid, change: paid - total,
    changeBreakdown: offlineMakeChange(paid - total),
    lines: lines.map(({ item, qty }) => ({ id: item.id, name: item.name, qty })), stock,
  };
}

const state = {
  items: [],
  cart: {},          // { A1: 2, C3: 1 }
  method: 'cash',    // 'cash' | 'promptpay'
  inserted: 0,       // เงินสดที่หยอดแล้ว
  qrLeft: QR_SECONDS,
  qrTimer: null,
  busy: false,       // กำลังส่งคำสั่งซื้อ/เล่นอนิเมชัน กันกดซ้ำ
};

const $ = (sel) => document.querySelector(sel);
const money = (n) => n.toLocaleString('th-TH') + '฿';
const findItem = (id) => state.items.find((it) => it.id === id);

function cartLines() {
  return Object.entries(state.cart).map(([id, qty]) => ({ item: findItem(id), qty }));
}
function cartTotal() {
  return cartLines().reduce((sum, l) => sum + l.item.price * l.qty, 0);
}
function say(text) {
  $('#statusMsg').textContent = text || '';
}
function clock(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}
function changeText(list) {
  return list.map((c) => `${c.denom}฿ x${c.count}`).join(', ');
}

// ---------- วาดหน้าจอ ----------

const TIERS = [
  { cat: 'keychain', label: 'พวงกุญแจ', en: 'Keychain' },
  { cat: 'omamori', label: 'เครื่องราง โอมาโมริ', en: 'Omamori' },
  { cat: 'crystal', label: 'หินคริสตัลนำโชค', en: 'Crystal' },
];

function cardHtml(it) {
  const picked = !!state.cart[it.id];
  const out = it.stock <= 0;
  return `
      <button class="card${out ? ' out' : ''}${picked ? ' picked' : ''}" data-action="add" data-id="${it.id}" ${out ? 'disabled' : ''}>
        ${out ? '<span class="tag">หมด</span>' : ''}
        <span class="thumb">${itemIcon(it)}</span>
        <span class="name">${it.name}</span>
        <span class="price">${money(it.price)}</span>
        ${it.stock > 0 && it.stock <= 2 ? `<span class="left-n">เหลือ ${it.stock}</span>` : ''}
      </button>`;
}

function renderShelf() {
  $('#shelf').innerHTML = TIERS.map((t) => {
    const list = state.items.filter((it) => it.cat === t.cat);
    if (!list.length) return '';
    return `
      <section class="tier">
        <h2 class="tier-title">${t.label} <small>${t.en} · ${money(list[0].price)}</small></h2>
        <div class="tier-row">${list.map(cardHtml).join('')}</div>
      </section>`;
  }).join('');
}

function renderCart() {
  const lines = cartLines();
  $('#cartList').innerHTML = lines.length
    ? lines.map(({ item, qty }) => `
        <li class="line">
          <div>${item.name}<small>${money(item.price)}</small></div>
          <button class="link" data-action="clear">เอาออก</button>
          <div class="sum">${money(item.price * qty)}</div>
        </li>`).join('')
    : '<li class="empty">ยังไม่ได้เลือกสินค้า<br>กดเลือกสินค้าทางซ้าย หรือพิมพ์รหัส (ซื้อได้ทีละ 1 ชิ้น)</li>';

  $('#cartFoot').innerHTML = `
    <span>รวมทั้งหมด</span>
    <strong>${money(cartTotal())}</strong>`;
}

function renderPayment() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('is-on', t.dataset.value === state.method);
  });
  $('#payBody').innerHTML = state.method === 'cash' ? cashHtml() : promptpayHtml();
}

function cashHtml() {
  const total = cartTotal();
  const enough = total > 0 && state.inserted >= total;
  const lastRow = enough
    ? `<div><dt>เงินทอน</dt><dd>${money(state.inserted - total)}</dd></div>`
    : `<div><dt>ยังขาดอีก</dt><dd>${money(Math.max(0, total - state.inserted))}</dd></div>`;

  return `
    <div class="bills">
      ${BILLS.map((v) => `<button data-action="insert" data-value="${v}">${v}฿</button>`).join('')}
    </div>
    <dl class="rows">
      <div><dt>หยอดแล้ว</dt><dd>${money(state.inserted)}</dd></div>
      ${lastRow}
    </dl>
    <div class="actions">
      <button class="btn" data-action="refund" ${state.inserted ? '' : 'disabled'}>คืนเงิน</button>
      <button class="btn primary" data-action="confirm" ${enough && !state.busy ? '' : 'disabled'}>ยืนยันการซื้อ</button>
    </div>`;
}

function promptpayHtml() {
  const total = cartTotal();
  const expired = total > 0 && state.qrLeft <= 0;
  const button = expired
    ? '<button class="btn primary" data-action="newqr">สร้าง QR ใหม่</button>'
    : `<button class="btn primary" data-action="confirm" ${total && !state.busy ? '' : 'disabled'}>จำลองว่าจ่ายแล้ว</button>`;

  return `
    <div class="qr">
      <div class="qr-mock" role="img" aria-label="QR PromptPay">
        <i><span></span></i>
        <img src="assets/promptpay-qr.png" alt="" onerror="this.remove()">
      </div>
      <div class="info">
        <p>สแกนเพื่อจ่าย</p>
        <p class="amount">${money(total)}</p>
        ${total === 0
          ? '<p class="hint">เลือกสินค้าก่อน</p>'
          : expired
            ? '<p class="expired">QR หมดอายุแล้ว</p>'
            : `<p class="hint">หมดอายุใน <span id="qrTime">${clock(state.qrLeft)}</span></p>`}
      </div>
    </div>
    <div class="actions single">${button}</div>`;
}

function renderAll() {
  renderShelf();
  renderCart();
  renderPayment();
}

// ---------- ตะกร้า ----------

function addToCart(id) {
  // ซื้อได้ทีละ 1 ชิ้น: เลือกอันใหม่จะแทนอันเดิมในตะกร้า
  const item = findItem(id);
  if (item.stock < 1) {
    say(`${item.name} หมดแล้ว`);
    return;
  }
  state.cart = { [id]: 1 };
  cartChanged();
}

function cartChanged() {
  say('');
  if (state.method === 'promptpay') startQr(); // ยอดเปลี่ยน = QR ใบใหม่
  renderAll();
}

// ---------- เงินสด ----------

function insertMoney(value) {
  state.inserted += value;
  say('');
  renderPayment();
}

function refund() {
  say(`คืนเงิน ${money(state.inserted)} ที่ช่องรับเหรียญ`);
  state.inserted = 0;
  renderPayment();
}

function switchMethod(method) {
  if (method === state.method) return;
  if (state.inserted > 0) {
    say('ยังมีเงินค้างอยู่ในตู้ กดคืนเงินก่อนเปลี่ยนวิธีจ่าย');
    return;
  }
  state.method = method;
  say('');
  if (method === 'promptpay') startQr();
  else stopQr();
  renderPayment();
}

// ---------- PromptPay (จำลอง) ----------

function startQr() {
  stopQr();
  state.qrLeft = QR_SECONDS;
  if (cartTotal() === 0) return;
  state.qrTimer = setInterval(() => {
    state.qrLeft -= 1;
    const el = $('#qrTime');
    if (el) el.textContent = clock(state.qrLeft);
    if (state.qrLeft <= 0) {
      stopQr();
      renderPayment();
    }
  }, 1000);
}

function stopQr() {
  clearInterval(state.qrTimer);
  state.qrTimer = null;
}

// ---------- ยืนยันการซื้อ ----------

async function confirmPurchase() {
  if (state.busy) return; // กันกดซ้ำ
  const total = cartTotal();
  if (total === 0) return;
  if (state.method === 'cash' && state.inserted < total) return;

  const payload = {
    cart: Object.entries(state.cart).map(([id, qty]) => ({ id, qty })),
    method: state.method,
    inserted: state.method === 'cash' ? state.inserted : total,
  };

  state.busy = true;
  renderPayment();
  try {
    const result = await checkout(payload);
    if (!result.ok) {
      state.busy = false;
      say(result.error);
      await refreshMenu();
      renderAll();
      return;
    }
    // จับตำแหน่งกรอบรูปสินค้าก่อนวาดหน้าจอใหม่ ไว้เล่นอนิเมชันของหล่น
    const id = payload.cart[0].id;
    const box = document.querySelector(`.card[data-id="${id}"] .thumb`);
    const from = box ? { html: box.innerHTML, rect: box.getBoundingClientRect() } : null;

    Object.entries(result.stock).forEach(([sid, left]) => { findItem(sid).stock = left; });
    resetOrder();
    renderAll();
    await dropItem(from);
    state.busy = false;
    showResult(result);
  } catch (err) {
    state.busy = false;
    say('เชื่อมต่อตู้ไม่ได้ ลองใหม่อีกครั้ง');
    renderPayment();
  }
}

// ของหล่นลงช่องรับสินค้า: ก๊อปกรอบรูปมาวางทับการ์ดเดิม สั่นเบา ๆ แล้วปล่อยลงช่อง
async function dropItem(from) {
  const tray = $('#tray');
  if (!from || !tray || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = from.rect;
  const t = tray.getBoundingClientRect();
  if (a.width === 0 || a.bottom < 0 || a.top > innerHeight) return; // การ์ดอยู่นอกจอ ข้ามอนิเมชัน

  const ghost = document.createElement('div');
  ghost.className = 'ghost-drop';
  ghost.innerHTML = from.html;
  Object.assign(ghost.style, {
    position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`,
    zIndex: 40, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--thumb)', color: '#6f5f4b', borderRadius: '12px', border: '1.5px solid var(--hanko)',
  });
  document.body.appendChild(ghost);

  const dx = t.left + t.width / 2 - (a.left + a.width / 2);
  const dy = t.top + t.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate([
    { transform: 'translate(0,0) rotate(0deg) scale(1)', offset: 0 },
    { transform: 'translate(-3px,0) rotate(-2deg) scale(1)', offset: 0.06 },
    { transform: 'translate(3px,0) rotate(2deg) scale(1)', offset: 0.12 },
    { transform: 'translate(0,0) rotate(0deg) scale(1)', offset: 0.18 },
    { transform: `translate(${dx}px,${dy}px) rotate(8deg) scale(.5)`, offset: 0.82, easing: 'cubic-bezier(.5,0,1,.6)' },
    { transform: `translate(${dx}px,${dy - 14}px) rotate(-4deg) scale(.5)`, offset: 0.91, easing: 'ease-out' },
    { transform: `translate(${dx}px,${dy}px) rotate(0deg) scale(.5)`, offset: 1, easing: 'ease-in' },
  ], { duration: 1100, fill: 'forwards' });
  try { await anim.finished; } catch (e) { /* ถูกยกเลิก */ }
  await new Promise((r) => setTimeout(r, 250));
  ghost.remove();
}

// สต็อกไม่พอตอนกดซื้อ: โหลดเมนูใหม่แล้วลดจำนวนในตะกร้าให้เท่าที่เหลือ
async function refreshMenu() {
  const menu = await loadMenu();
  state.items = menu.items;
  Object.keys(state.cart).forEach((id) => {
    const left = findItem(id).stock;
    if (left <= 0) delete state.cart[id];
    else if (state.cart[id] > left) state.cart[id] = left;
  });
}

function resetOrder() {
  state.cart = {};
  state.inserted = 0;
  state.qrLeft = QR_SECONDS;
  stopQr();
  say('');
}

function showResult(r) {
  const dialog = $('#resultDialog');
  dialog.innerHTML = `
    <h3>ซื้อสำเร็จ</h3>
    <p class="order">เลขที่ ${r.orderId} · ${r.method === 'cash' ? 'เงินสด' : 'PromptPay'}</p>
    <ul>
      ${r.lines.map((l) => `<li><span>${l.name} x${l.qty}</span></li>`).join('')}
    </ul>
    <dl class="rows">
      <div><dt>ยอดรวม</dt><dd>${money(r.total)}</dd></div>
      <div><dt>จ่ายแล้ว</dt><dd>${money(r.paid)}</dd></div>
      <div><dt>เงินทอน</dt><dd>${money(r.change)}</dd></div>
    </dl>
    ${r.change > 0 ? `<p class="note">เงินทอน: ${changeText(r.changeBreakdown)}</p>` : '<p class="note">ไม่มีเงินทอน</p>'}
    <button class="btn primary" data-action="close">ตกลง</button>`;
  dialog.showModal();
}

// ---------- รับคลิกทั้งหน้า ----------

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, value } = btn.dataset;

  switch (action) {
    case 'add': addToCart(id); break;
    case 'clear': state.cart = {}; stopQr(); cartChanged(); break;
    case 'method': switchMethod(value); break;
    case 'insert': insertMoney(Number(value)); break;
    case 'refund': refund(); break;
    case 'newqr': startQr(); renderPayment(); break;
    case 'confirm': confirmPurchase(); break;
    case 'close': $('#resultDialog').close(); break;
  }
});

// พิมพ์รหัสสินค้า (เช่น A1) แทนการกดที่การ์ด
$('#codeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (state.busy) return;
  const input = $('#codeInput');
  const code = input.value.trim().toUpperCase();
  input.value = '';
  if (!code) return;
  if (!findItem(code)) { say(`ไม่พบรหัส ${code}`); return; }
  addToCart(code);
});

// ---------- เริ่มทำงาน ----------

(async function init() {
  const menu = await loadMenu();
  state.items = menu.items;
  $('#conn').textContent = menu.offline
    ? 'โหมดออฟไลน์ (ไม่ได้เชื่อม backend)'
    : 'เชื่อมต่อ backend แล้ว';
  renderAll();
})();

// ---------- ดึงสต็อกล่าสุดทุก 10 วินาที (เผื่อแอดมินเติมของ) ----------
setInterval(async () => {
  if (offlineMode || state.busy) return;
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    if (!res.ok) return;
    const data = await res.json();
    let changed = false;
    data.items.forEach((fresh) => {
      const it = findItem(fresh.id);
      if (it && it.stock !== fresh.stock) { it.stock = fresh.stock; changed = true; }
    });
    if (!changed) return;
    Object.keys(state.cart).forEach((id) => { if (findItem(id).stock <= 0) delete state.cart[id]; });
    renderAll();
  } catch (err) { /* เซิร์ฟเวอร์หลุดชั่วคราว ข้ามรอบนี้ */ }
}, 10000);
