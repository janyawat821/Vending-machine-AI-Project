const POUCH = `
  <path d="M20 12 C16 6 20 3 24 3 C28 3 32 6 28 12"/>
  <rect x="13" y="12" width="22" height="29" rx="3"/>
  <path d="M13 19 H35"/><circle cx="24" cy="15.5" r="1.3" fill="currentColor" stroke="none"/>
  <path d="M24 41 V46 M20 41 L19 46 M28 41 L29 46"/>`;

const ITEM_ICONS = {
  'keychain-1': `<path d="M13 19 V8 L21 13 M35 19 V8 L27 13"/><ellipse cx="24" cy="24" rx="12" ry="11"/>
    <path d="M18.5 22.5 q2 -2 4 0 M25.5 22.5 q2 -2 4 0 M23 27 h2 M21 29.5 q3 2.5 6 0"/>
    <path d="M17 35 q7 4 14 0"/><circle cx="24" cy="38" r="2.2"/>
    <path d="M37 33 V22 a3 3 0 0 1 6 0 V33"/><path d="M14 43 H34"/>`,
  'keychain-2': `<path d="M8 12 L18 18 Q24 16 30 18 L40 12 Q42 26 34 34 Q29 40 24 42 Q19 40 14 34 Q6 26 8 12Z"/>
    <path d="M11 16 l4 3 M37 16 l-4 3 M16 25 l4 2 M32 25 l-4 2 M12 29 l6 3 M36 29 l-6 3"/>
    <circle cx="24" cy="36" r="1.7" fill="currentColor" stroke="none"/>`,
  'keychain-3': `<circle cx="24" cy="25" r="16"/>
    <path d="M13 22 Q24 10 35 22 Q35 34 24 35 Q13 34 13 22Z"/>
    <circle cx="19.5" cy="24" r="2"/><circle cx="28.5" cy="24" r="2"/>
    <path d="M16 20 q3 -3 6 -1 M32 20 q-3 -3 -6 -1 M20 30 q4 -2 8 0 M17 39 q7 4 14 0"/>`,
  'keychain-4': `<circle cx="24" cy="7" r="3"/><path d="M24 10 V15"/>
    <path d="M12 34 Q12 16 24 16 Q36 16 36 34Z"/><path d="M9 34 H39"/><circle cx="24" cy="39.5" r="3"/>
    <circle cx="24" cy="26" r="2"/><path d="M24 21 V23 M28.5 24 L27 25 M27 29.5 L26 28.5 M21 29.5 L22 28.5 M19.5 24 L21 25"/>`,
  'keychain-5': `<path d="M6 24 Q14 12 28 16 Q34 18 36 24 Q34 30 28 32 Q14 36 6 24Z"/>
    <path d="M36 24 L44 16 M36 24 L44 32 M44 16 Q41 24 44 32"/>
    <circle cx="13" cy="23" r="1.4" fill="currentColor" stroke="none"/>
    <path d="M18 21 q3 3 0 6 M24 20 q3 4 0 8 M30 21 q2.5 3 0 6 M20 33 q3 5 8 3"/>`,
  // ---- โอมาโมริ ----
  'omamori-1': `${POUCH}<path d="M19 34 C18 26 24 22 30 23 C31 30 26 35 19 34Z M19 34 L26 27"/>`,
  'omamori-2': `${POUCH}<path d="M24 36 C16 30 17 24 21 24 C23 24 24 26 24 26 C24 26 25 24 27 24 C31 24 32 30 24 36Z"/>`,
  'omamori-3': `${POUCH}<path d="M24 27 V36 M24 27 Q20 25 16.5 26 V35 Q20 34 24 36 M24 27 Q28 25 31.5 26 V35 Q28 34 24 36"/>`,
  'omamori-4': `${POUCH}<circle cx="24" cy="30" r="6.5"/><path d="M24 25 L26 30 L24 35 L22 30Z"/>`,
  'omamori-5': `${POUCH}<circle cx="24" cy="30" r="6.5"/><rect x="21.5" y="27.5" width="5" height="5"/>`,
  //  หินคริสตัล (ใส่สีตามชนิดหิน ต่างจากไอคอนอื่นที่เป็นเส้นสีเดียว) 
  'crystal-1': `<polygon points="14,14 34,14 42,21 24,42 6,21" fill="#F0C6D0" stroke-width="1.6"/>
    <polygon points="14,14 34,14 24,21" fill="#F8DEE5" stroke-width="1.6"/>
    <polygon points="6,21 24,21 24,42" fill="#D98CA1" stroke-width="1.6"/>
    <polygon points="42,21 24,21 24,42" fill="#E5A7B7" stroke-width="1.6"/>`, // โรสควอตซ์ ชมพู
  'crystal-2': `<polygon points="14,14 34,14 42,21 24,42 6,21" fill="#F3D07E" stroke-width="1.6"/>
    <polygon points="14,14 34,14 24,21" fill="#F9E4AE" stroke-width="1.6"/>
    <polygon points="6,21 24,21 24,42" fill="#D9A62F" stroke-width="1.6"/>
    <polygon points="42,21 24,21 24,42" fill="#E8BE55" stroke-width="1.6"/>`, // ซิทริน ทอง
  'crystal-3': `<polygon points="14,14 34,14 42,21 24,42 6,21" fill="#C7B2E8" stroke-width="1.6"/>
    <polygon points="14,14 34,14 24,21" fill="#DDD0F2" stroke-width="1.6"/>
    <polygon points="6,21 24,21 24,42" fill="#9678C9" stroke-width="1.6"/>
    <polygon points="42,21 24,21 24,42" fill="#AE97DB" stroke-width="1.6"/>`, // อเมทิสต์ ม่วง
  'crystal-4': `<polygon points="14,14 34,14 42,21 24,42 6,21" fill="#E4F2F7" stroke-width="1.6"/>
    <polygon points="14,14 34,14 24,21" fill="#F3FAFC" stroke-width="1.6"/>
    <polygon points="6,21 24,21 24,42" fill="#B7DCE8" stroke-width="1.6"/>
    <polygon points="42,21 24,21 24,42" fill="#CFE9F1" stroke-width="1.6"/>`, // ควอตซ์ใส ฟ้าน้ำแข็ง
  'crystal-5': `<path d="M8 28 C6 16 18 8 30 10 C42 12 44 26 38 34 C32 42 12 42 8 28Z" fill="#B7D6A8" stroke-width="1.6"/>
    <path d="M18 24 V28 M16 26 H20 M30 19 V23 M28 21 H32 M28 31 V35 M26 33 H30" stroke="#4A6B42" stroke-width="1.6" fill="none"/>`, // อเวนจูรีน เขียว
  fallback: `<path d="M24 6 L28 20 L42 24 L28 28 L24 42 L20 28 L6 24 L20 20Z"/>`,
};

// ตัวช่วย: คืน HTML ของรูปสินค้า (รูปถ่ายถ้ามี ไม่มีใช้ไอคอน)
function itemIcon(it) {
  if (it.photo) return `<img src="assets/items/${it.photo}" alt="">`;
  return `<svg class="ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ITEM_ICONS[it.img] || ITEM_ICONS.fallback}</svg>`;
}
