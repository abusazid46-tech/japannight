/* ============================================
   MAIN JS — Public Pages
   Khanapara Morning Teer
   ============================================ */

// ---- LIVE CLOCK ----
function startClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}
startClock();

// ---- DATE DISPLAY ----
function setTodayDate(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// ============================================
// HOME PAGE
// ============================================
function initHomePage() {
  setTodayDate('todayDate');
  renderTodayResult();
  renderRecentTable();
  renderStats();
}

function renderTodayResult() {
  const el = document.getElementById('todayResult');
  if (!el) return;
  const result = getTodayResult();
  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long' });

  if (result) {
    el.innerHTML = `
      <div class="result-header">
        <div>
          <div class="fw-700 text-white fs-6">Khanapara Morning Teer</div>
          <div class="text-muted" style="font-size:12px;">${dayStr}</div>
        </div>
        <div class="result-date-badge">${todayStr}</div>
      </div>
      <div class="result-body">
        <div class="result-round">
          <div class="round-label">Round 1</div>
          <div class="round-title">🕙 10:30 AM — First Round</div>
          <div class="round-number fr">${result.fr}</div>
          <div class="round-sub">First Round Result</div>
        </div>
        <div class="result-round">
          <div class="round-label">Round 2</div>
          <div class="round-title">🕞 3:30 PM — Second Round</div>
          <div class="round-number sr">${result.sr}</div>
          <div class="round-sub">Second Round Result</div>
        </div>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="result-header">
        <div>
          <div class="fw-700 text-white fs-6">Khanapara Morning Teer</div>
          <div class="text-muted" style="font-size:12px;">${dayStr}</div>
        </div>
        <div class="result-date-badge">${todayStr}</div>
      </div>
      <div class="result-body">
        <div class="result-round">
          <div class="round-label">Round 1</div>
          <div class="round-title">🕙 10:30 AM — First Round</div>
          <div class="round-number pending">--</div>
          <div class="round-sub">Awaiting result…</div>
        </div>
        <div class="result-round">
          <div class="round-label">Round 2</div>
          <div class="round-title">🕞 3:30 PM — Second Round</div>
          <div class="round-number pending">--</div>
          <div class="round-sub">Awaiting result…</div>
        </div>
      </div>
      <div class="text-center py-3 text-muted" style="font-size:13px;border-top:1px solid var(--border);">
        <i class="bi bi-info-circle me-1"></i>Today's result will be published after 10:30 AM
      </div>
    `;
  }
}

function renderRecentTable() {
  const tbody = document.getElementById('recentTableBody');
  if (!tbody) return;
  const results = getPublishedResults().slice(0, 10);
  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No results yet.</td></tr>';
    return;
  }
  tbody.innerHTML = results.map(r => `
    <tr>
      <td class="fw-600">${formatDate(r.date)}</td>
      <td><span class="day-badge">${getDayName(r.date)}</span></td>
      <td><span class="fr-badge">${r.fr}</span></td>
      <td><span class="sr-badge">${r.sr}</span></td>
    </tr>
  `).join('');
}

function renderStats() {
  const results = getPublishedResults();
  document.getElementById('totalDays').textContent = results.length;

  if (results.length) {
    const frFreq = {}, srFreq = {};
    results.forEach(r => {
      frFreq[r.fr] = (frFreq[r.fr] || 0) + 1;
      srFreq[r.sr] = (srFreq[r.sr] || 0) + 1;
    });
    const topFR = Object.entries(frFreq).sort((a,b)=>b[1]-a[1])[0];
    const topSR = Object.entries(srFreq).sort((a,b)=>b[1]-a[1])[0];
    document.getElementById('hotFR').textContent = topFR ? topFR[0] : '—';
    document.getElementById('hotSR').textContent = topSR ? topSR[0] : '—';
  }
}

// ============================================
// RESULTS PAGE (results.html)
// ============================================
let currentPage = 1;
const PAGE_SIZE = 20;
let filteredResults = [];

function initResultsPage() {
  setTodayDate('todayDate');
  filteredResults = getPublishedResults();
  renderResultsTable();
  setupSearch();
  setupMonthFilter();
}

function renderResultsTable() {
  const tbody = document.getElementById('resultsTableBody');
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredResults.slice(start, start + PAGE_SIZE);

  if (!pageData.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">No results found.</td></tr>';
  } else {
    tbody.innerHTML = pageData.map((r, i) => `
      <tr>
        <td class="text-muted" style="font-size:13px;">${start + i + 1}</td>
        <td class="fw-600">${formatDate(r.date)}</td>
        <td><span class="day-badge">${getDayName(r.date)}</span></td>
        <td><span class="fr-badge">${r.fr}</span></td>
        <td><span class="sr-badge">${r.sr}</span></td>
      </tr>
    `).join('');
  }

  renderPagination();
  document.getElementById('resultCount').textContent = `Showing ${Math.min(start + 1, filteredResults.length)}–${Math.min(start + PAGE_SIZE, filteredResults.length)} of ${filteredResults.length}`;
}

function renderPagination() {
  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);
  const el = document.getElementById('pagination');
  if (!el) return;

  let html = `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
    <button class="page-link" onclick="goPage(${currentPage - 1})">‹</button></li>`;

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
      html += `<li class="page-item ${p === currentPage ? 'active' : ''}">
        <button class="page-link" onclick="goPage(${p})">${p}</button></li>`;
    } else if (p === currentPage - 2 || p === currentPage + 2) {
      html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
    }
  }

  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
    <button class="page-link" onclick="goPage(${currentPage + 1})">›</button></li>`;

  el.innerHTML = html;
}

function goPage(p) {
  const totalPages = Math.ceil(filteredResults.length / PAGE_SIZE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderResultsTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const all = getPublishedResults();
    filteredResults = q ? all.filter(r =>
      r.fr.includes(q) || r.sr.includes(q) || r.date.includes(q) || formatDate(r.date).toLowerCase().includes(q)
    ) : all;
    currentPage = 1;
    renderResultsTable();
  });
}

function setupMonthFilter() {
  const sel = document.getElementById('monthFilter');
  if (!sel) return;
  const all = getPublishedResults();
  const months = [...new Set(all.map(r => r.date.substring(0,7)))];
  sel.innerHTML = '<option value="">All Months</option>' + months.map(m => {
    const d = new Date(m + '-01');
    return `<option value="${m}">${d.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</option>`;
  }).join('');
  sel.addEventListener('change', () => {
    const m = sel.value;
    filteredResults = m ? all.filter(r => r.date.startsWith(m)) : all;
    currentPage = 1;
    renderResultsTable();
  });
}

// ============================================
// COMMON NUMBERS PAGE
// ============================================
function initCommonPage() {
  renderCommonNumbers('both');
}

function renderCommonNumbers(round) {
  const data = getCommonNumbers();
  const container = document.getElementById('commonContainer');
  if (!container) return;

  let items = [];
  if (round === 'fr' || round === 'both') items = [...items, ...data.fr.map(d => ({...d, round:'FR'}))];
  if (round === 'sr' || round === 'both') items = [...items, ...data.sr.map(d => ({...d, round:'SR'}))];

  items.sort((a, b) => b.hits - a.hits);

  container.innerHTML = items.map(item => {
    const trendClass = item.trend === 'hot' ? 'hot' : item.trend === 'warm' ? 'warm' : '';
    const icon = item.trend === 'hot' ? '🔥' : item.trend === 'warm' ? '⚡' : '📍';
    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="common-num-card ${trendClass}">
          <div class="common-badge">${item.round}</div>
          <div class="common-number">${item.number}</div>
          <div class="common-hits">${icon} ${item.hits} hits</div>
          <div class="common-trend">${item.trend.toUpperCase()}</div>
        </div>
      </div>
    `;
  }).join('');

  if (!items.length) {
    container.innerHTML = '<div class="col-12 text-center text-muted py-5">No common numbers data.</div>';
  }
}

// ============================================
// DREAM NUMBERS PAGE
// ============================================
function initDreamPage() {
  renderDreamTable('');
  document.getElementById('dreamSearch')?.addEventListener('input', function() {
    renderDreamTable(this.value.trim().toLowerCase());
  });
  renderCategories();
}

function renderDreamTable(query) {
  const tbody = document.getElementById('dreamTableBody');
  if (!tbody) return;
  const all = getAllDreams();
  const filtered = query ? all.filter(d =>
    d.dream.toLowerCase().includes(query) ||
    d.numbers.includes(query) ||
    d.category.toLowerCase().includes(query)
  ) : all;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No results found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(d => `
    <tr>
      <td class="fw-600"><i class="bi bi-moon-stars text-warning me-2"></i>${d.dream}</td>
      <td><span class="category-pill">${d.category}</span></td>
      <td class="fw-700 text-warning">${d.numbers}</td>
    </tr>
  `).join('');
}

function renderCategories() {
  const el = document.getElementById('categoryFilter');
  if (!el) return;
  const all = getAllDreams();
  const cats = [...new Set(all.map(d => d.category))];
  el.innerHTML = `<button class="btn btn-sm btn-warning me-1 mb-1 active" onclick="filterCategory(this, '')">All</button>` +
    cats.map(c => `<button class="btn btn-sm btn-outline-warning me-1 mb-1" onclick="filterCategory(this,'${c}')">${c}</button>`).join('');
}

function filterCategory(btn, cat) {
  document.querySelectorAll('#categoryFilter button').forEach(b => b.classList.remove('active', 'btn-warning'));
  btn.classList.add('active', 'btn-warning');
  renderDreamTable(cat);
}

// ============================================
// TOAST UTILITY
// ============================================
function showToast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = 'toast-custom';
  el.innerHTML = `<span style="font-size:18px;">${icons[type]}</span><span style="font-size:14px;">${msg}</span>`;
  const container = document.getElementById('toastContainer') || (() => {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container-custom';
    document.body.appendChild(c);
    return c;
  })();
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => el.remove(), 400); }, 3000);
}
