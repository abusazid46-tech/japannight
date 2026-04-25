/* ============================================
   DATA LAYER — localStorage based storage
   Khanapara Morning Teer
   ============================================ */

const DB_KEY = 'khanapara_teer_results';
const DREAM_KEY = 'khanapara_dream_numbers';
const COMMON_KEY = 'khanapara_common_numbers';

// ---- SEED DATA (sample results) ----
const SEED_RESULTS = [
  { date: '2025-04-25', fr: '08', sr: '51', status: 'published' },
  { date: '2025-04-24', fr: '76', sr: '47', status: 'published' },
  { date: '2025-04-23', fr: '06', sr: '94', status: 'published' },
  { date: '2025-04-22', fr: '91', sr: '19', status: 'published' },
  { date: '2025-04-21', fr: '30', sr: '45', status: 'published' },
  { date: '2025-04-19', fr: '78', sr: '84', status: 'published' },
  { date: '2025-04-18', fr: '60', sr: '05', status: 'published' },
  { date: '2025-04-17', fr: '89', sr: '27', status: 'published' },
  { date: '2025-04-16', fr: '30', sr: '51', status: 'published' },
  { date: '2025-04-15', fr: '09', sr: '23', status: 'published' },
  { date: '2025-04-14', fr: '92', sr: '82', status: 'published' },
  { date: '2025-04-12', fr: '22', sr: '34', status: 'published' },
  { date: '2025-04-11', fr: '20', sr: '69', status: 'published' },
  { date: '2025-04-10', fr: '49', sr: '26', status: 'published' },
  { date: '2025-04-09', fr: '93', sr: '57', status: 'published' },
  { date: '2025-04-08', fr: '86', sr: '32', status: 'published' },
  { date: '2025-04-07', fr: '57', sr: '03', status: 'published' },
  { date: '2025-04-05', fr: '92', sr: '72', status: 'published' },
  { date: '2025-04-04', fr: '15', sr: '32', status: 'published' },
  { date: '2025-04-03', fr: '36', sr: '91', status: 'published' },
  { date: '2025-04-02', fr: '26', sr: '11', status: 'published' },
  { date: '2025-04-01', fr: '48', sr: '56', status: 'published' },
  { date: '2025-03-31', fr: '40', sr: '30', status: 'published' },
  { date: '2025-03-29', fr: '17', sr: '51', status: 'published' },
  { date: '2025-03-28', fr: '69', sr: '03', status: 'published' },
  { date: '2025-03-27', fr: '92', sr: '70', status: 'published' },
  { date: '2025-03-26', fr: '51', sr: '55', status: 'published' },
  { date: '2025-03-25', fr: '18', sr: '39', status: 'published' },
  { date: '2025-03-24', fr: '46', sr: '40', status: 'published' },
  { date: '2025-03-22', fr: '80', sr: '23', status: 'published' },
  { date: '2025-03-21', fr: '96', sr: '42', status: 'published' },
  { date: '2025-03-20', fr: '03', sr: '58', status: 'published' },
  { date: '2025-03-19', fr: '89', sr: '42', status: 'published' },
  { date: '2025-03-18', fr: '82', sr: '14', status: 'published' },
  { date: '2025-03-17', fr: '38', sr: '52', status: 'published' },
  { date: '2025-03-15', fr: '94', sr: '24', status: 'published' },
  { date: '2025-03-14', fr: '81', sr: '79', status: 'published' },
  { date: '2025-03-13', fr: '50', sr: '03', status: 'published' },
  { date: '2025-03-12', fr: '72', sr: '67', status: 'published' },
  { date: '2025-03-11', fr: '92', sr: '56', status: 'published' },
  { date: '2025-03-10', fr: '81', sr: '38', status: 'published' },
  { date: '2025-03-08', fr: '42', sr: '64', status: 'published' },
  { date: '2025-03-07', fr: '31', sr: '95', status: 'published' },
  { date: '2025-03-06', fr: '15', sr: '91', status: 'published' },
  { date: '2025-03-05', fr: '84', sr: '32', status: 'published' },
  { date: '2025-03-04', fr: '12', sr: '60', status: 'published' },
  { date: '2025-03-03', fr: '88', sr: '95', status: 'published' },
  { date: '2025-03-01', fr: '31', sr: '44', status: 'published' },
  { date: '2025-02-28', fr: '82', sr: '03', status: 'published' },
  { date: '2025-02-27', fr: '18', sr: '98', status: 'published' },
];

const SEED_DREAM = [
  { dream: 'Tiger', numbers: '01, 21, 41', category: 'Animals' },
  { dream: 'Snake', numbers: '08, 18, 28, 58', category: 'Animals' },
  { dream: 'Elephant', numbers: '44, 84', category: 'Animals' },
  { dream: 'Dog', numbers: '09, 29, 49', category: 'Animals' },
  { dream: 'Cat', numbers: '15, 55, 95', category: 'Animals' },
  { dream: 'Fish', numbers: '12, 21, 32', category: 'Animals' },
  { dream: 'Bird', numbers: '03, 33, 63, 93', category: 'Animals' },
  { dream: 'Cow', numbers: '25, 52, 75', category: 'Animals' },
  { dream: 'Fire', numbers: '07, 17, 77', category: 'Nature' },
  { dream: 'Water', numbers: '00, 10, 50, 90', category: 'Nature' },
  { dream: 'Rain', numbers: '06, 36, 66, 96', category: 'Nature' },
  { dream: 'Mountain', numbers: '14, 41, 74', category: 'Nature' },
  { dream: 'River', numbers: '05, 50, 55', category: 'Nature' },
  { dream: 'Moon', numbers: '11, 22, 33', category: 'Nature' },
  { dream: 'Sun', numbers: '10, 20, 60', category: 'Nature' },
  { dream: 'Wedding', numbers: '04, 40, 44, 84', category: 'Events' },
  { dream: 'Death', numbers: '09, 90, 99', category: 'Events' },
  { dream: 'Fight', numbers: '13, 31, 43', category: 'Events' },
  { dream: 'Running', numbers: '08, 28, 80', category: 'Events' },
  { dream: 'Flying', numbers: '06, 16, 60', category: 'Events' },
  { dream: 'Gold', numbers: '05, 50, 55, 85', category: 'Objects' },
  { dream: 'Money', numbers: '02, 22, 52, 72', category: 'Objects' },
  { dream: 'Knife', numbers: '07, 17, 27', category: 'Objects' },
  { dream: 'Car', numbers: '04, 14, 44', category: 'Objects' },
  { dream: 'House', numbers: '03, 30, 83', category: 'Objects' },
  { dream: 'Tree', numbers: '19, 29, 69', category: 'Nature' },
  { dream: 'Baby', numbers: '01, 11, 21', category: 'People' },
  { dream: 'Old man', numbers: '70, 80, 90', category: 'People' },
  { dream: 'Woman', numbers: '16, 36, 56, 76', category: 'People' },
  { dream: 'Mother', numbers: '09, 19, 49', category: 'People' },
];

const SEED_COMMON = {
  fr: [
    { number: '92', hits: 12, trend: 'hot' },
    { number: '82', hits: 11, trend: 'hot' },
    { number: '61', hits: 10, trend: 'warm' },
    { number: '94', hits: 10, trend: 'warm' },
    { number: '30', hits: 9, trend: 'warm' },
    { number: '81', hits: 9, trend: 'warm' },
    { number: '41', hits: 8, trend: 'normal' },
    { number: '18', hits: 8, trend: 'normal' },
    { number: '40', hits: 8, trend: 'normal' },
    { number: '57', hits: 7, trend: 'normal' },
  ],
  sr: [
    { number: '51', hits: 11, trend: 'hot' },
    { number: '42', hits: 10, trend: 'hot' },
    { number: '32', hits: 9, trend: 'warm' },
    { number: '03', hits: 9, trend: 'warm' },
    { number: '57', hits: 8, trend: 'warm' },
    { number: '91', hits: 8, trend: 'warm' },
    { number: '70', hits: 7, trend: 'normal' },
    { number: '56', hits: 7, trend: 'normal' },
    { number: '44', hits: 7, trend: 'normal' },
    { number: '24', hits: 6, trend: 'normal' },
  ]
};

// ---- INIT ----
function initDB() {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(SEED_RESULTS));
  }
  if (!localStorage.getItem(DREAM_KEY)) {
    localStorage.setItem(DREAM_KEY, JSON.stringify(SEED_DREAM));
  }
  if (!localStorage.getItem(COMMON_KEY)) {
    localStorage.setItem(COMMON_KEY, JSON.stringify(SEED_COMMON));
  }
}

// ---- RESULTS CRUD ----
function getAllResults() {
  initDB();
  const data = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
  return data.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getPublishedResults() {
  return getAllResults().filter(r => r.status === 'published');
}

function getTodayResult() {
  const today = new Date().toISOString().split('T')[0];
  return getAllResults().find(r => r.date === today && r.status === 'published') || null;
}

function saveResult(entry) {
  const all = getAllResults();
  const idx = all.findIndex(r => r.date === entry.date);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...entry };
  } else {
    all.push(entry);
  }
  localStorage.setItem(DB_KEY, JSON.stringify(all));
}

function deleteResult(date) {
  const all = getAllResults().filter(r => r.date !== date);
  localStorage.setItem(DB_KEY, JSON.stringify(all));
}

// ---- DREAM CRUD ----
function getAllDreams() {
  initDB();
  return JSON.parse(localStorage.getItem(DREAM_KEY) || '[]');
}

function saveDream(entry) {
  const all = getAllDreams();
  const idx = all.findIndex(d => d.dream.toLowerCase() === entry.dream.toLowerCase());
  if (idx >= 0) { all[idx] = entry; } else { all.push(entry); }
  localStorage.setItem(DREAM_KEY, JSON.stringify(all));
}

function deleteDream(dream) {
  const all = getAllDreams().filter(d => d.dream !== dream);
  localStorage.setItem(DREAM_KEY, JSON.stringify(all));
}

// ---- COMMON CRUD ----
function getCommonNumbers() {
  initDB();
  return JSON.parse(localStorage.getItem(COMMON_KEY) || '{"fr":[],"sr":[]}');
}

function saveCommonNumbers(data) {
  localStorage.setItem(COMMON_KEY, JSON.stringify(data));
}

// ---- ADMIN AUTH ----
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'teer@2025';

function adminLogin(user, pass) {
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem('admin_auth', 'true');
    return true;
  }
  return false;
}

function isAdminLoggedIn() {
  return sessionStorage.getItem('admin_auth') === 'true';
}

function adminLogout() {
  sessionStorage.removeItem('admin_auth');
  window.location.href = 'login.html';
}

// ---- HELPERS ----
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

function padNum(n) {
  return n.toString().padStart(2, '0');
}

initDB();
