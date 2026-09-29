// backend/items.js — สินค้าในตู้ + เก็บสต็อก/ยอดขายลง data/state.json
// ลบไฟล์ data/state.json ถ้าอยากรีเซ็ตตู้กลับเป็นค่าเริ่มต้น

const fs = require('fs');
const path = require('path');

// ราคาผูกกับหมวด แก้ตรงนี้ที่เดียวได้ทั้งหมวด
const CATEGORIES = {
  keychain: { label: 'พวงกุญแจ', price: 79 },
  omamori: { label: 'เครื่องราง โอมาโมริ', price: 129 },
  crystal: { label: 'หินคริสตัลนำโชค', price: 99 },
};

const START_STOCK = 5;

// img = ชื่อไฟล์ (ไม่ใส่นามสกุล) วางรูป .png ชื่อเดียวกันใน frontend/assets/items/ แล้วระบบจะใช้รูปนั้นแทนไอคอนทันที
const items = [
  { id: 'A1', cat: 'keychain', name: 'Makineko แมวกวักทอง', img: 'keychain-1' },
  { id: 'A2', cat: 'keychain', name: 'จิ้งจอกนำโชค', img: 'keychain-2' },
  { id: 'A3', cat: 'keychain', name: 'ตุ๊กตาดารุมะจิ๋ว', img: 'keychain-3' },
  { id: 'A4', cat: 'keychain', name: 'กระดิ่งซากุระ', img: 'keychain-4' },
  { id: 'A5', cat: 'keychain', name: 'ปลาคาร์ฟมงคล', img: 'keychain-5' },

  { id: 'B1', cat: 'omamori', name: 'โอมาโมริ สุขภาพแข็งแรง', img: 'omamori-1' },
  { id: 'B2', cat: 'omamori', name: 'โอมาโมริ ความรัก', img: 'omamori-2' },
  { id: 'B3', cat: 'omamori', name: 'โอมาโมริ การเรียน', img: 'omamori-3' },
  { id: 'B4', cat: 'omamori', name: 'โอมาโมริ เดินทางปลอดภัย', img: 'omamori-4' },
  { id: 'B5', cat: 'omamori', name: 'โอมาโมริ โชคลาภ', img: 'omamori-5' },

  // หิน: ใช้ชื่ออังกฤษล้วน ไม่มีคำบรรยายต่อท้าย
  { id: 'C1', cat: 'crystal', name: 'Rose Quartz', img: 'crystal-1' },
  { id: 'C2', cat: 'crystal', name: 'Citrine', img: 'crystal-2' },
  { id: 'C3', cat: 'crystal', name: 'Amethyst', img: 'crystal-3' },
  { id: 'C4', cat: 'crystal', name: 'Clear Quartz', img: 'crystal-4' },
  { id: 'C5', cat: 'crystal', name: 'Green Aventurine', img: 'crystal-5' },
].map((it) => ({ ...it, stock: START_STOCK }));

// ---------- เซฟ/โหลดลงไฟล์ ----------
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'state.json');

let sales = []; // ประวัติการขาย เก่าสุดอยู่หน้า

function loadData() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    (saved.items || []).forEach((row) => {
      const it = items.find((x) => x.id === row.id);
      if (it && Number.isInteger(row.stock) && row.stock >= 0) it.stock = row.stock;
    });
    sales = Array.isArray(saved.sales) ? saved.sales : [];
  } catch (err) {
    // ยังไม่มีไฟล์ หรือไฟล์เสีย: เริ่มจากค่าเริ่มต้น
  }
}

function saveData() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const body = { items: items.map(({ id, stock }) => ({ id, stock })), sales };
    fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('เซฟข้อมูลไม่สำเร็จ:', err.message);
  }
}

loadData();

function loadSales() {
  return sales;
}

function addSale(sale) {
  sales.push(sale);
  saveData();
}

const IMG_DIR = path.join(__dirname, '..', 'frontend', 'assets', 'items');

// หารูปจริงในโฟลเดอร์ (ไม่สนตัวพิมพ์เล็ก-ใหญ่ รับได้ทั้ง png/jpg/jpeg/webp) ไม่เจอคืน null แล้วหน้าเว็บใช้ไอคอนแทน
const PHOTO_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
function photoFile(base) {
  let files;
  try {
    files = fs.readdirSync(IMG_DIR);
  } catch (err) {
    return null; // ยังไม่มีโฟลเดอร์/อ่านไม่ได้
  }
  const wanted = base.toLowerCase();
  const found = files.find((f) => {
    const dot = f.lastIndexOf('.');
    if (dot < 0) return false;
    const name = f.slice(0, dot).toLowerCase();
    const ext = f.slice(dot).toLowerCase();
    return name === wanted && PHOTO_EXT.includes(ext);
  });
  return found || null;
}

function getMenu() {
  return items.map((it) => ({ ...it, photo: photoFile(it.img), price: CATEGORIES[it.cat].price }));
}

function findItem(id) {
  return items.find((it) => it.id === id);
}

function priceOf(item) {
  return CATEGORIES[item.cat].price;
}

module.exports = { CATEGORIES, START_STOCK, items, getMenu, findItem, priceOf, saveData, loadSales, addSale };
