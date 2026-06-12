
const STORAGE = {
  site: 'smk_psikologi_site_v4',
  questions: 'smk_psikologi_questions_v4',
  results: 'smk_psikologi_results_v4',
  session: 'smk_psikologi_session_v4',
  pending: 'smk_psikologi_pending_v4',
  drafts: 'smk_psikologi_drafts_v4',
};

const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyOaNrHdIgJA8pxXSQyQ0pzdTNEAXeSAtAEP9_ZpTKflXFk_jZeUFXjpUIiLCWT061s/exec';

const AUTH = {
  superadmin: { email: 'bksmkpgri2@gmail.com', password: 'rayarvian2', label: 'Super Admin' },
  admin: { email: 'admin', password: 'bkgrida2026', label: 'Admin Biasa' },
};

const DEFAULT_SITE = {
  branding: {
    title: 'Alat Tes Psikologi Internal',
    subtitle: 'SMK PGRI 2 Kediri ',
    logoData: '',
    backgroundData: '',
    primaryColor: '#1d4ed8',
    textColor: '#0f172a',
    bgColor: '#f4f7fb',
    heroColor: '#0ea5e9',
  },
  home: {
    heroTitle: 'Tes psikologi internal yang cepat, rapi, dan nyaman dibuka di semua perangkat.',
    heroText: 'Masuk sebagai siswa, kerjakan tes, dan simpan progres secara otomatis. Beranda dibuat clean, ringan, dan fokus ke akses tes.',
    studentTitle: 'Masuk sebagai siswa',
    studentText: 'Langkah utama ada di sini. Masukkan email pribadi lalu mulai tes.',
    guideTitle: 'Petunjuk penggunaan',
    guideItems: [
      'Siswa memasukkan email lalu menekan mulai.',
      'Soal dapat berisi gambar dan jawaban bergambar.',
    ],
    categories: [
      { title: 'Tes Kepribadian', desc: 'Untuk mengenali pola sikap dan kebiasaan siswa.', count: '12 item' },
      { title: 'Tes Minat & Bakat', desc: 'Membantu melihat arah potensi dan kecenderungan belajar.', count: '8 item' },
      { title: 'Tes Emosi', desc: 'Cocok untuk pemahaman kondisi emosi dan respon.', count: '6 item' },
    ],
    announcements: [
      { title: 'Pelaksanaan tes internal', body: 'Gunakan email pribadi siswa agar progres tersimpan dan hasil dapat direkap ke Google Sheets.' },
    ],
    faqs: [
      { q: 'Apakah bisa diakses dari HP?', a: 'Bisa. Layout dibuat responsif agar nyaman di desktop, tablet, dan Android.' },
      { q: 'Apakah soal bisa gambar?', a: 'Bisa. Soal dan jawaban dapat berupa teks, gambar, atau kombinasi keduanya.' },
      { q: 'Apakah hasil tersimpan ke cloud?', a: 'Bisa jika endpoint Google Apps Script sudah diisi.' },
    ],
  },
  sheetEndpoint: DEFAULT_ENDPOINT,
  sheetUrl: '',
};

const DEFAULT_QUESTIONS = [
  {
    id: uid('q'),
    type: 'mcq',
    prompt: 'Saya merasa mudah bergaul dengan teman baru.',
    image: '',
    options: [
      { text: 'Sangat tidak setuju', score: 0, image: '' },
      { text: 'Tidak setuju', score: 1, image: '' },
      { text: 'Setuju', score: 2, image: '' },
      { text: 'Sangat setuju', score: 3, image: '' },
    ],
  },
  {
    id: uid('q'),
    type: 'text',
    prompt: 'Tuliskan satu hal yang biasanya membuat kamu merasa lebih tenang saat sedang cemas.',
    image: '',
    options: [],
  },
];

const state = {
  site: null,
  questions: [],
  results: [],
  session: null,
  pending: [],
  homeState: { studentEmail: '', testIndex: 0, answers: {}, inTest: false },
  editor: { mode: 'add', questionId: null, draft: null },
  page: document.body.dataset.page || 'home',
};

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

function deepMerge(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base.slice();
  if (base && typeof base === 'object') {
    const out = { ...base };
    const src = override && typeof override === 'object' ? override : {};
    for (const key of Object.keys(base)) {
      out[key] = deepMerge(base[key], src[key]);
    }
    for (const key of Object.keys(src)) {
      if (!(key in out)) out[key] = src[key];
    }
    return out;
  }
  return override !== undefined ? override : base;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadAll() {
  state.site = deepMerge(DEFAULT_SITE, readJSON(STORAGE.site, DEFAULT_SITE));
  state.questions = readJSON(STORAGE.questions, null) || DEFAULT_QUESTIONS.slice();
  state.results = readJSON(STORAGE.results, []);
  state.session = readJSON(STORAGE.session, null);
  state.pending = readJSON(STORAGE.pending, []);
}

function saveSite() {
  saveJSON(STORAGE.site, state.site);
}

function saveQuestions() {
  saveJSON(STORAGE.questions, state.questions);
}

function saveResults() {
  saveJSON(STORAGE.results, state.results);
}

function saveSession() {
  if (state.session) saveJSON(STORAGE.session, state.session);
  else localStorage.removeItem(STORAGE.session);
}

function savePending() {
  saveJSON(STORAGE.pending, state.pending);
}

function el(id) {
  return document.getElementById(id);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toast(message) {
  const t = el('toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function applyTheme() {
  const branding = state.site.branding;
  document.documentElement.style.setProperty('--primary', branding.primaryColor || '#1d4ed8');
  document.documentElement.style.setProperty('--text', branding.textColor || '#0f172a');
  document.documentElement.style.setProperty('--bg', branding.bgColor || '#f4f7fb');
  document.documentElement.style.setProperty('--accent', branding.heroColor || '#0ea5e9');
  document.body.style.background = branding.bgColor || '#f4f7fb';

  const bgLayer = el('bgLayer');
  if (bgLayer) {
    bgLayer.style.backgroundImage = branding.backgroundData
      ? `linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.68)), url('${branding.backgroundData}')`
      : 'linear-gradient(180deg,#eef4ff 0%, #f7fafc 40%, #f4f7fb 100%)';
  }

  const brandTitle = el('brandTitle');
  const brandSubtitle = el('brandSubtitle');
  const logoImg = el('logoImg');
  const logoFallback = el('logoFallback');

  if (brandTitle) brandTitle.textContent = branding.title;
  if (brandSubtitle) brandSubtitle.textContent = branding.subtitle;

  if (logoImg && logoFallback) {
    if (branding.logoData) {
      logoImg.src = branding.logoData;
      logoImg.classList.remove('hidden');
      logoFallback.classList.add('hidden');
    } else {
      logoImg.classList.add('hidden');
      logoFallback.classList.remove('hidden');
      logoFallback.textContent = (branding.title || 'SP')
        .split(' ')
        .map((x) => x[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
  }
}

function renderNavButtons() {
  const userLink = 'user.html';
  const adminLink = 'admin.html';
  const superLink = 'superadmin.html';
  const nav = document.querySelector('[data-nav]');
  if (nav) {
    nav.innerHTML = `
      <a class="pill ghost" href="index.html">Beranda</a>
      <a class="pill ghost" href="${userLink}">User</a>
      <a class="pill ghost" href="${adminLink}">Admin</a>
      <a class="pill primary" href="${superLink}">Super Admin</a>
    `;
  }
}

function renderHome() {
  const app = el('app');
  if (!app) return;

  const h = state.site.home;
  app.innerHTML = `
    <section class="page-shell">
      <div class="hero">
        <div class="hero-banner">
          <h2 class="title">${escapeHtml(h.heroTitle)}</h2>
          <p class="subtitle">${escapeHtml(h.heroText)}</p>
          <div class="hero-meta">
            <span class="meta-badge">Teks & gambar</span>
            <span class="meta-badge">Jawaban bergambar</span>
            <span class="meta-badge">Rekap cloud</span>
            <span class="meta-badge">Responsif</span>
          </div>
        </div>
        <div class="student-box">
          <div>
            <h3>${escapeHtml(h.studentTitle)}</h3>
            <p>${escapeHtml(h.studentText)}</p>
            <div class="field">
              <label for="studentEmail">Email pribadi siswa</label>
              <input id="studentEmail" class="input" type="email" placeholder="contoh: nama@domain.com" autocomplete="email" />
            </div>
          </div>
          <div>
            <div class="row">
              <button class="btn primary" data-action="start-test">Lanjut ke Tes</button>
              <button class="btn outline" data-action="resume-draft">Lanjutkan Draft</button>
            </div>
            <div class="note">Menu admin ada di pojok kanan atas.</div>
          </div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card accordion" style="padding:0">
          <details open>
            <summary>${escapeHtml(h.guideTitle)}</summary>
            <div class="body">
              ${h.guideItems.map((item, idx) => `<div>${idx + 1}. ${escapeHtml(item)}</div>`).join('')}
            </div>
          </details>
          <details>
            <summary>Info akses</summary>
            <div class="body" id="homeAccessBody">
              ${state.session
                ? `Sedang login sebagai ${escapeHtml(state.session.label)}.`
                : 'Belum login admin. Gunakan menu di kanan atas untuk masuk.'}
            </div>
          </details>
        </div>
        <div class="card">
          <div class="section-title">
            <h3>Ringkasan fitur</h3>
          </div>
          <div class="help-box">
          </div>
        </div>
      </div>

      <div class="content-grid">
        <div>
          <div class="section-title"><h3>Kategori tes</h3></div>
          <div class="category-grid">
            ${h.categories.map((c) => `
              <div class="category">
                <h4>${escapeHtml(c.title)}</h4>
                <p>${escapeHtml(c.desc)}</p>
                <span class="count">${escapeHtml(c.count)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div>
          <div class="section-title"><h3>Info / pengumuman</h3></div>
          <div class="post-list">
            ${h.announcements.map((a) => `
              <div class="post">
                <h4>${escapeHtml(a.title)}</h4>
                <p>${escapeHtml(a.body)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title"><h3>FAQ</h3></div>
        <div class="accordion">
          ${h.faqs.map((f) => `
            <details>
              <summary>${escapeHtml(f.q)}</summary>
              <div class="body">${escapeHtml(f.a)}</div>
            </details>
          `).join('')}
        </div>
      </div>
    </section>
  `;
  bindHomeEvents();
}

function renderUser() {
  const app = el('app');
  if (!app) return;

  app.innerHTML = `
    <section class="page-shell">
      <div class="page-hero">
        <div class="hero-banner">
          <h2 class="title">Halaman siswa</h2>
          <p class="subtitle">Masukkan email pribadi siswa lalu mulai tes. Progres akan disimpan di perangkat dan hasil bisa dikirim ke Google Sheets.</p>
          <div class="hero-meta">
            <span class="meta-badge">Simpan progres</span>
            <span class="meta-badge">Soal bergambar</span>
            <span class="meta-badge">Riwayat draft</span>
          </div>
        </div>
        <div class="student-box">
          <div>
            <h3>Mulai tes</h3>
            <p>Gunakan email pribadi siswa agar progres tersimpan.</p>
            <div class="field">
              <label for="studentEmail">Email pribadi siswa</label>
              <input id="studentEmail" class="input" type="email" placeholder="contoh: nama@domain.com" autocomplete="email" />
            </div>
          </div>
          <div>
            <div class="row">
              <button class="btn primary" data-action="start-test">Mulai Tes</button>
              <button class="btn outline" data-action="resume-draft">Lanjutkan Draft</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card" id="userTestCard">
        <div class="section-title">
          <div>
            <h3>Tes aktif</h3>
            <small id="testEmailLabel">Email: -</small>
          </div>
          <div class="row" style="justify-content:flex-end;flex:0 0 auto">
            <button class="btn outline small" data-action="save-draft">Simpan Progres</button>
            <a class="btn gray small" href="index.html">Kembali ke Beranda</a>
          </div>
        </div>
        <div class="progress-wrap"><div class="progress-bar" id="progressBar"></div></div>
        <div id="questionHost"></div>
        <div class="row" style="margin-top:16px">
          <button class="btn outline" data-action="prev-question">Sebelumnya</button>
          <button class="btn blue" data-action="next-question">Selanjutnya</button>
          <button class="btn success" data-action="finish-test">Selesai & Kirim</button>
        </div>
      </div>
    </section>
  `;
  bindUserEvents();
  if (state.homeState.inTest) {
    document.getElementById('studentEmail').value = state.homeState.studentEmail || '';
    renderUserTest();
  } else {
    el('userTestCard').classList.add('hidden');
  }
}

function renderUserTest() {
  const card = el('userTestCard');
  if (!card) return;
  card.classList.remove('hidden');

  const email = (el('studentEmail')?.value || state.homeState.studentEmail || '').trim();
  const label = el('testEmailLabel');
  if (label) label.textContent = email ? `Email: ${email}` : 'Email: belum diisi';

  const q = state.questions[state.homeState.testIndex];
  const questionHost = el('questionHost');
  if (!q) {
    questionHost.innerHTML = '<div class="help-box">Belum ada soal. Silakan masuk sebagai super admin untuk menambahkan soal.</div>';
    el('progressBar').style.width = '0%';
    return;
  }

  el('progressBar').style.width = `${((state.homeState.testIndex + 1) / state.questions.length) * 100}%`;

  let html = `
    <div class="question-item" style="border:none;padding:0">
      <div class="section-title" style="margin-bottom:8px">
        <h3>Soal ${state.homeState.testIndex + 1} dari ${state.questions.length}</h3>
        <small>${q.type === 'mcq' ? 'Pilihan ganda' : 'Isian'}</small>
      </div>
      <h4 style="font-size:18px;margin:0 0 8px;line-height:1.5">${escapeHtml(q.prompt || '')}</h4>
      ${q.image ? `<img class="q-image" src="${q.image}" alt="Gambar soal">` : ''}
  `;

  if (q.type === 'mcq') {
    const current = state.homeState.answers[q.id] || '';
    html += `
      <div class="option-list">
        ${q.options.map((opt, idx) => {
          const checked = current === String(idx);
          return `
            <div class="option ${checked ? 'selected' : ''}">
              <label>
                <span style="display:block;width:100%">
                  <span style="display:flex;gap:10px;align-items:flex-start;width:100%">
                    <input type="radio" name="answer_${q.id}" value="${idx}" ${checked ? 'checked' : ''} data-action="answer-option" data-qid="${q.id}">
                    <span style="display:block">
                      <span>${escapeHtml(opt.text)}</span>
                      ${opt.image ? `<img class="answer-thumb" src="${opt.image}" alt="Jawaban bergambar">` : ''}
                    </span>
                  </span>
                </span>
              </label>
              <span class="score">Skor ${Number(opt.score || 0)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    const current = state.homeState.answers[q.id] || '';
    html += `
      <div class="field" style="margin-top:12px">
        <label for="textAnswer">Jawaban</label>
        <textarea id="textAnswer" placeholder="Tulis jawaban di sini...">${escapeHtml(current)}</textarea>
      </div>
      <div class="small">Jawaban akan tersimpan saat berpindah soal atau saat klik Simpan Progres.</div>
    `;
  }

  html += `</div>`;
  questionHost.innerHTML = html;
}

function renderAdmin() {
  const app = el('app');
  if (!app) return;

  if (!state.session || (state.session.role !== 'admin' && state.session.role !== 'superadmin')) {
    app.innerHTML = adminLoginMarkup('admin');
    bindLoginEvents('admin');
    return;
  }

  app.innerHTML = `
    <section class="split">
      <div class="card">
        <div class="section-title">
          <div>
            <h3>Halaman Admin</h3>
            <small id="adminRoleLabel">Peran: ${escapeHtml(state.session.label)}</small>
          </div>
          <div class="row" style="justify-content:flex-end;flex:0 0 auto">
            <button class="btn outline small" data-action="logout">Keluar</button>
            <a class="btn gray small" href="index.html">Kembali</a>
          </div>
        </div>

        <div class="tabs">
          <button class="tab active" data-tab="results">Rekap</button>
          <button class="tab" data-tab="settings">Spreadsheet</button>
        </div>

        <div id="adminResultsTab">
          <div class="row" style="margin-bottom:12px;align-items:center">
            <span class="badge" id="resultCountBadge">${state.results.length} hasil</span>
            <button class="btn success small" data-action="export-csv">Unduh CSV</button>
            <button class="btn blue small" data-action="sync-results">Kirim Ulang ke Sheets</button>
            <button class="btn outline small" data-action="open-sheet">Buka Spreadsheet</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Waktu</th><th>Email</th><th>Skor</th><th>Ringkasan</th></tr>
              </thead>
              <tbody id="resultsTable"></tbody>
            </table>
          </div>
        </div>

        <div id="adminSettingsTab" class="hidden">
          <div class="section-title"><h3>Pengaturan spreadsheet</h3></div>
          <div class="field">
            <label for="sheetEndpoint">Google Apps Script Web App</label>
            <input id="sheetEndpoint" class="input" type="url" placeholder="https://script.google.com/macros/s/.../exec" value="${escapeHtml(state.site.sheetEndpoint || '')}">
          </div>
          <div class="field">
            <label for="sheetUrl">Google Sheets URL (opsional)</label>
            <input id="sheetUrl" class="input" type="url" placeholder="https://docs.google.com/spreadsheets/d/..." value="${escapeHtml(state.site.sheetUrl || '')}">
          </div>
          <div class="row">
            <button class="btn blue" data-action="save-admin-settings">Simpan Pengaturan</button>
            <button class="btn outline" data-action="test-endpoint">Tes Endpoint</button>
          </div>
          <p class="footer-note" style="margin-top:12px">Admin dan super admin bisa membuka hasil rekap yang tersimpan di halaman ini dan di Google Sheets.</p>
        </div>
      </div>

      <div class="card">
        <div class="section-title"><h3>Info login</h3></div>
        <div class="help-box">
          <div><b>Admin</b></div>
          <div>Email: admin</div>
          <div>Password: bkgrida2026</div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
          <div><b>Super admin</b></div>
          <div>Email: bksmkpgri2@gmail.com</div>
          <div>Password: rayarvian2</div>
        </div>
      </div>
    </section>
  `;
  renderResultsTable('resultsTable');
  bindAdminEvents();
}

function renderSuper() {
  const app = el('app');
  if (!app) return;

  if (!state.session || state.session.role !== 'superadmin') {
    if (state.session && state.session.role === 'admin') {
      app.innerHTML = `
        <div class="card">
          <div class="help-box">
            Kamu login sebagai admin biasa. Untuk masuk ke halaman super admin, gunakan akun super admin.
          </div>
          <div class="row" style="margin-top:12px">
            <a class="btn blue" href="admin.html">Ke Halaman Admin</a>
            <a class="btn outline" href="index.html">Kembali ke Beranda</a>
          </div>
        </div>
      `;
      return;
    }
    app.innerHTML = superLoginMarkup();
    bindLoginEvents('superadmin');
    return;
  }

  const s = state.site;
  app.innerHTML = `
    <section class="split">
      <div class="card">
        <div class="section-title">
          <div>
            <h3>Halaman Super Admin</h3>
            <small id="superRoleLabel">Peran: ${escapeHtml(state.session.label)}</small>
          </div>
          <div class="row" style="justify-content:flex-end;flex:0 0 auto">
            <button class="btn outline small" data-action="logout">Keluar</button>
            <a class="btn gray small" href="index.html">Kembali</a>
          </div>
        </div>

        <div class="tabs">
          <button class="tab active" data-super-tab="questions">Soal</button>
          <button class="tab" data-super-tab="branding">Branding</button>
          <button class="tab" data-super-tab="homepage">Beranda</button>
          <button class="tab" data-super-tab="raw">Spreadsheet & Rekap</button>
        </div>

        <div id="superQuestionsTab">
          <div class="row" style="margin-bottom:12px;align-items:center">
            <span class="badge" id="questionCountBadge">${state.questions.length} soal aktif</span>
            <button class="btn primary small" data-action="new-question">Tambah Soal</button>
          </div>
          <div class="help-box" style="margin-bottom:12px">
            Super admin bisa menambah, mengubah, dan menghapus soal teks maupun gambar. Jawaban pilihan juga bisa memakai gambar.
          </div>
          <div class="question-list" id="questionList"></div>
          <div id="questionEditorWrap" class="card" style="margin-top:16px;display:none"></div>
        </div>

        <div id="superBrandingTab" class="hidden">
          <div class="editor-columns">
            <div>
              <div class="field"><label for="brandingTitle">Judul header</label><input id="brandingTitle" class="input" type="text" value="${escapeHtml(s.branding.title)}"></div>
              <div class="field"><label for="brandingSubtitle">Subjudul header</label><input id="brandingSubtitle" class="input" type="text" value="${escapeHtml(s.branding.subtitle)}"></div>
              <div class="field"><label for="brandingLogoFile">Logo sekolah</label><input id="brandingLogoFile" class="input" type="file" accept="image/*"></div>
              <div class="field"><label for="brandingBackgroundFile">Background gambar</label><input id="brandingBackgroundFile" class="input" type="file" accept="image/*"></div>
            </div>
            <div>
              <div class="field"><label for="primaryColor">Warna utama</label><input id="primaryColor" class="input" type="color" value="${escapeHtml(s.branding.primaryColor)}"></div>
              <div class="field"><label for="textColor">Warna tulisan</label><input id="textColor" class="input" type="color" value="${escapeHtml(s.branding.textColor)}"></div>
              <div class="field"><label for="bgColor">Warna latar</label><input id="bgColor" class="input" type="color" value="${escapeHtml(s.branding.bgColor)}"></div>
              <div class="field"><label for="heroColor">Warna banner</label><input id="heroColor" class="input" type="color" value="${escapeHtml(s.branding.heroColor)}"></div>
            </div>
          </div>
          <div class="help-box">
            Rekomendasi resolusi: logo 512×512 px atau lebih besar, background 1600×900 px atau lebih besar, gambar soal/jawaban minimal 800 px agar tetap tajam di HP.
          </div>
          <div class="row" style="margin-top:12px">
            <button class="btn blue" data-action="save-branding">Simpan Branding</button>
            <button class="btn outline" data-action="reset-branding">Reset Branding</button>
          </div>
        </div>

        <div id="superHomepageTab" class="hidden">
          <div class="editor-columns">
            <div>
              <div class="field"><label for="homeHeroTitleInput">Judul hero</label><textarea id="homeHeroTitleInput">${escapeHtml(s.home.heroTitle)}</textarea></div>
              <div class="field"><label for="homeHeroTextInput">Teks hero</label><textarea id="homeHeroTextInput">${escapeHtml(s.home.heroText)}</textarea></div>
              <div class="field"><label for="studentTitleInput">Judul kartu siswa</label><input id="studentTitleInput" class="input" type="text" value="${escapeHtml(s.home.studentTitle)}"></div>
              <div class="field"><label for="studentTextInput">Teks kartu siswa</label><textarea id="studentTextInput">${escapeHtml(s.home.studentText)}</textarea></div>
            </div>
            <div>
              ${listEditor('guide', 'Petunjuk penggunaan', s.home.guideItems, ['text'])}
            </div>
          </div>
          <div class="grid cols-2" style="margin-top:16px">
            <div>${listEditor('categories', 'Kategori tes', s.home.categories, ['title','desc','count'])}</div>
            <div>${listEditor('announcements', 'Info / pengumuman', s.home.announcements, ['title','body'])}</div>
          </div>
          <div style="margin-top:16px">
            ${listEditor('faqs', 'FAQ', s.home.faqs, ['q','a'])}
          </div>
          <div class="row" style="margin-top:12px">
            <button class="btn blue" data-action="save-homepage">Simpan Beranda</button>
          </div>
        </div>

        <div id="superRawTab" class="hidden">
          <div class="grid cols-2">
            <div class="card">
              <div class="section-title"><h3>Spreadsheet</h3></div>
              <div class="field">
                <label for="sheetEndpoint">Google Apps Script Web App</label>
                <input id="sheetEndpoint" class="input" type="url" value="${escapeHtml(s.sheetEndpoint || '')}">
              </div>
              <div class="field">
                <label for="sheetUrl">Google Sheets URL</label>
                <input id="sheetUrl" class="input" type="url" value="${escapeHtml(s.sheetUrl || '')}">
              </div>
              <div class="row">
                <button class="btn blue" data-action="save-sheet-settings">Simpan Spreadsheet</button>
                <button class="btn outline" data-action="open-sheet">Buka Spreadsheet</button>
                <button class="btn outline" data-action="test-endpoint">Tes Endpoint</button>
              </div>
            </div>
            <div class="card">
              <div class="section-title"><h3>Rekap cepat</h3></div>
              <div class="row" style="margin-bottom:12px;align-items:center">
                <span class="badge" id="resultCountBadge">${state.results.length} hasil</span>
                <button class="btn success small" data-action="export-csv">Unduh CSV</button>
                <button class="btn blue small" data-action="sync-results">Kirim Ulang ke Sheets</button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr><th>Waktu</th><th>Email</th><th>Skor</th><th>Ringkasan</th></tr>
                  </thead>
                  <tbody id="superResultsTable"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title"><h3>Info kontrol</h3></div>
        <div class="help-box">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
          <div><b>Halaman 1</b> = Beranda</div>
          <div><b>Halaman 2</b> = User / tes</div>
          <div><b>Halaman 3</b> = Admin rekap</div>
          <div><b>Halaman 4</b> = Super admin penuh</div>
        </div>
      </div>
    </section>

    <div class="modal-backdrop" id="questionModalBackdrop"></div>
  `;
  renderQuestionList();
  renderResultsTable('superResultsTable');
  renderSuperVisibility();
  bindSuperEvents();
}

function renderQuestionList() {
  const host = el('questionList');
  if (!host) return;
  if (!state.questions.length) {
    host.innerHTML = '<div class="help-box">Belum ada soal. Klik <b>Tambah Soal</b>.</div>';
    return;
  }
  host.innerHTML = state.questions.map((q, idx) => `
    <div class="question-item">
      <header>
        <div>
          <h4>${idx + 1}. ${escapeHtml(q.prompt || '(Tanpa teks soal)')}</h4>
          <div class="meta">Tipe: ${q.type === 'mcq' ? 'Pilihan ganda' : 'Isian'} · ID: ${escapeHtml(q.id)}</div>
        </div>
        <div class="row" style="flex:0 0 auto;justify-content:flex-end">
          <button class="btn outline small" data-action="edit-question" data-id="${escapeHtml(q.id)}">Edit</button>
          <button class="btn danger small" data-action="delete-question" data-id="${escapeHtml(q.id)}">Hapus</button>
        </div>
      </header>
      ${q.image ? `<img class="q-image" src="${q.image}" alt="Gambar soal">` : ''}
      ${q.type === 'mcq' ? `
        <div class="option-list">
          ${q.options.map((opt) => `
            <div class="option">
              <div style="width:100%">
                <div>${escapeHtml(opt.text)}</div>
                ${opt.image ? `<img class="answer-thumb" src="${opt.image}" alt="Gambar jawaban">` : ''}
              </div>
              <span class="score">Skor ${Number(opt.score || 0)}</span>
            </div>
          `).join('')}
        </div>
      ` : '<div class="small">Jawaban siswa akan disimpan sebagai teks.</div>'}
    </div>
  `).join('');
}

function renderResultsTable(tbodyId) {
  const body = el(tbodyId);
  if (!body) return;
  if (!state.results.length) {
    body.innerHTML = '<tr><td colspan="4">Belum ada hasil tes.</td></tr>';
    return;
  }
  body.innerHTML = state.results.slice().reverse().map((r) => `
    <tr>
      <td>${escapeHtml(r.time)}</td>
      <td>${escapeHtml(r.email)}</td>
      <td><b>${Number(r.score || 0)}</b></td>
      <td>${escapeHtml(r.summary || '')}</td>
    </tr>
  `).join('');
}

function adminLoginMarkup(roleHint) {
  return `
    <section class="page-shell">
      <div class="page-hero">
        <div class="hero-banner">
          <h2 class="title">Login ${roleHint === 'superadmin' ? 'super admin' : 'admin'}</h2>
          <p class="subtitle">Masuk untuk melihat rekap hasil dan spreadsheet.</p>
        </div>
        <div class="card login-card">
          <div class="field">
            <label for="loginEmail">Email</label>
            <input id="loginEmail" class="input" type="text" placeholder="Email admin">
          </div>
          <div class="field">
            <label for="loginPassword">Password</label>
            <input id="loginPassword" class="input" type="password" placeholder="Password">
          </div>
          <div class="row">
            <button class="btn primary" data-action="do-login" data-role="${roleHint}">Masuk</button>
            <a class="btn outline" href="index.html">Kembali</a>
          </div>
          <p class="footer-note" style="margin-top:12px">
            Admin biasa: admin / bkgrida2026<br>
            Super admin: bksmkpgri2@gmail.com / rayarvian2
          </p>
        </div>
      </div>
    </section>
  `;
}

function superLoginMarkup() {
  return adminLoginMarkup('superadmin');
}

function listEditor(key, title, items, fields) {
  const rows = items.map((item, idx) => {
    const cols = fields.map((field) => `
      <div class="field" style="margin:0">
        <label>${fieldLabel(field)}</label>
        <input class="input" data-list-key="${key}" data-field="${field}" data-index="${idx}" value="${escapeHtml(item[field] || '')}">
      </div>
    `).join('');
    return `
      <div class="card" style="padding:14px">
        <div class="row" style="align-items:flex-start">
          ${cols}
          <div class="field" style="margin:0;flex:0 0 auto">
            <label>Aksi</label>
            <button class="btn danger small" data-action="remove-list-item" data-list-key="${key}" data-index="${idx}">Hapus</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <div class="section-title">
        <h3>${escapeHtml(title)}</h3>
        <button class="btn outline small" data-action="add-list-item" data-list-key="${key}">Tambah</button>
      </div>
      <div class="grid" style="gap:10px">
        ${rows || '<div class="help-box">Belum ada data.</div>'}
      </div>
    </div>
  `;
}

function fieldLabel(field) {
  return {
    text: 'Teks',
    title: 'Judul',
    desc: 'Deskripsi',
    count: 'Jumlah',
    body: 'Isi',
    q: 'Pertanyaan',
    a: 'Jawaban',
  }[field] || field;
}

function renderSuperVisibility() {
  const tabs = qsa('[data-super-tab]');
  const ids = {
    questions: 'superQuestionsTab',
    branding: 'superBrandingTab',
    homepage: 'superHomepageTab',
    raw: 'superRawTab',
  };
  const current = state.editor.view || 'questions';
  tabs.forEach((b) => b.classList.toggle('active', b.dataset.superTab === current));
  Object.values(ids).forEach((id) => {
    const node = el(id);
    if (node) node.classList.add('hidden');
  });
  const active = el(ids[current] || ids.questions);
  if (active) active.classList.remove('hidden');
}

function bindHomeEvents() {
  const app = el('app');
  if (!app || app.dataset.boundHome === '1') return;
  app.dataset.boundHome = '1';
  app.addEventListener('click', homeClickHandler);
}


function bindUserEvents() {
  const app = el('app');
  if (!app || app.dataset.boundUser === '1') return;
  app.dataset.boundUser = '1';
  app.addEventListener('click', userClickHandler);
}


function bindAdminEvents() {
  const app = el('app');
  if (!app || app.dataset.boundAdmin === '1') return;
  app.dataset.boundAdmin = '1';
  app.addEventListener('click', adminClickHandler);
  qsa('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      qsa('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      el('adminResultsTab')?.classList.toggle('hidden', btn.dataset.tab !== 'results');
      el('adminSettingsTab')?.classList.toggle('hidden', btn.dataset.tab !== 'settings');
    });
  });
}


function bindLoginEvents(roleHint) {
  const app = el('app');
  if (!app) return;
  app.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action="do-login"]');
    if (!btn) return;
    doLogin(roleHint);
  });
}


function bindSuperEvents() {
  const app = el('app');
  if (!app || app.dataset.boundSuper === '1') return;
  app.dataset.boundSuper = '1';
  app.addEventListener('click', superClickHandler);
  app.addEventListener('input', superInputHandler);
  qsa('[data-super-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editor.view = btn.dataset.superTab;
      renderSuperVisibility();
    });
  });
}


function homeClickHandler(ev) {
  const action = ev.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'start-test') startTestFromHome();
  if (action === 'resume-draft') resumeDraftFromHome();
}

function userClickHandler(ev) {
  const action = ev.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'start-test') startTestOnUser();
  if (action === 'resume-draft') resumeDraftOnUser();
  if (action === 'save-draft') saveDraft();
  if (action === 'prev-question') prevQuestion();
  if (action === 'next-question') nextQuestion();
  if (action === 'finish-test') finishTest();
  if (action === 'answer-option') {
    const input = ev.target.closest('input[type="radio"][data-qid]');
    if (input) answerOption(input.dataset.qid, input.value);
  }
}

function adminClickHandler(ev) {
  const action = ev.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'logout') logout();
  if (action === 'export-csv') exportCSV();
  if (action === 'sync-results') syncResults();
  if (action === 'open-sheet') openSheet();
  if (action === 'save-admin-settings') saveAdminSettings();
  if (action === 'test-endpoint') testEndpoint();
}

function superClickHandler(ev) {
  const target = ev.target.closest('[data-action]');
  const action = target?.dataset.action;
  if (!action) return;

  if (action === 'logout') logout();
  if (action === 'new-question') openQuestionEditor();
  if (action === 'add-option') addOptionRow();
  if (action === 'edit-question') openQuestionEditor(target.dataset.id);
  if (action === 'delete-question') deleteQuestion(target.dataset.id);
  if (action === 'add-list-item') addListItem(target.dataset.listKey);
  if (action === 'remove-list-item') removeListItem(target.dataset.listKey, Number(target.dataset.index));
  if (action === 'save-branding') saveBranding();
  if (action === 'reset-branding') resetBranding();
  if (action === 'save-homepage') saveHomepage();
  if (action === 'save-sheet-settings') saveSheetSettings();
  if (action === 'open-sheet') openSheet();
  if (action === 'test-endpoint') testEndpoint();
  if (action === 'sync-results') syncResults();
  if (action === 'export-csv') exportCSV();
  if (action === 'save-question') saveQuestionFromEditor();
  if (action === 'cancel-question') closeQuestionEditor();
}

function superInputHandler(ev) {
  const target = ev.target;
  if (!target.matches('[data-list-key]')) return;
  const key = target.dataset.listKey;
  const field = target.dataset.field;
  const idx = Number(target.dataset.index);
  const list = getEditableList(key);
  if (!list[idx]) return;
  list[idx][field] = target.value;
  assignEditableList(key, list);
}

function getEditableList(key) {
  switch (key) {
    case 'guide':
      return state.site.home.guideItems;
    case 'categories':
      return state.site.home.categories;
    case 'announcements':
      return state.site.home.announcements;
    case 'faqs':
      return state.site.home.faqs;
    default:
      return [];
  }
}

function assignEditableList(key, list) {
  switch (key) {
    case 'guide':
      state.site.home.guideItems = list;
      break;
    case 'categories':
      state.site.home.categories = list;
      break;
    case 'announcements':
      state.site.home.announcements = list;
      break;
    case 'faqs':
      state.site.home.faqs = list;
      break;
  }
}

function addListItem(key) {
  const list = getEditableList(key).slice();
  if (key === 'guide') list.push('Item baru');
  else if (key === 'categories') list.push({ title: 'Judul baru', desc: 'Deskripsi baru', count: '0 item' });
  else if (key === 'announcements') list.push({ title: 'Pengumuman baru', body: 'Isi pengumuman baru.' });
  else if (key === 'faqs') list.push({ q: 'Pertanyaan baru?', a: 'Jawaban baru.' });
  assignEditableList(key, list);
  renderSuper();
  toast('Item ditambahkan.');
}

function removeListItem(key, index) {
  const list = getEditableList(key).slice();
  list.splice(index, 1);
  if (!list.length) {
    if (key === 'guide') list.push('Item baru');
    if (key === 'categories') list.push({ title: 'Judul baru', desc: 'Deskripsi baru', count: '0 item' });
    if (key === 'announcements') list.push({ title: 'Pengumuman baru', body: 'Isi pengumuman baru.' });
    if (key === 'faqs') list.push({ q: 'Pertanyaan baru?', a: 'Jawaban baru.' });
  }
  assignEditableList(key, list);
  renderSuper();
  toast('Item dihapus.');
}

function startTestFromHome() {
  const email = el('studentEmail')?.value.trim();
  if (!email || !email.includes('@')) {
    toast('Masukkan email pribadi siswa yang valid.');
    el('studentEmail')?.focus();
    return;
  }
  state.homeState.studentEmail = email;
  state.homeState.inTest = true;
  state.homeState.testIndex = 0;
  const draft = readDraft(email);
  state.homeState.answers = draft?.answers || {};
  state.homeState.testIndex = draft?.index || 0;
  saveDraft(email, state.homeState.testIndex, state.homeState.answers);
  renderUserTest();
}

function resumeDraftFromHome() {
  const email = el('studentEmail')?.value.trim();
  if (!email) return toast('Masukkan email siswa dulu.');
  const draft = readDraft(email);
  if (!draft) return toast('Belum ada draft untuk email ini.');
  state.homeState.studentEmail = email;
  state.homeState.inTest = true;
  state.homeState.testIndex = draft.index || 0;
  state.homeState.answers = draft.answers || {};
  renderUserTest();
  toast('Draft dibuka.');
}

function startTestOnUser() {
  const email = el('studentEmail')?.value.trim();
  if (!email || !email.includes('@')) {
    toast('Masukkan email pribadi siswa yang valid.');
    return;
  }
  state.homeState.studentEmail = email;
  state.homeState.inTest = true;
  state.homeState.testIndex = 0;
  const draft = readDraft(email);
  state.homeState.answers = draft?.answers || {};
  state.homeState.testIndex = draft?.index || 0;
  saveDraft(email, state.homeState.testIndex, state.homeState.answers);
  renderUserTest();
}

function resumeDraftOnUser() {
  const email = el('studentEmail')?.value.trim();
  if (!email) return toast('Masukkan email siswa dulu.');
  const draft = readDraft(email);
  if (!draft) return toast('Belum ada draft untuk email ini.');
  state.homeState.studentEmail = email;
  state.homeState.inTest = true;
  state.homeState.testIndex = draft.index || 0;
  state.homeState.answers = draft.answers || {};
  renderUserTest();
  toast('Draft dibuka.');
}

function readDraft(email) {
  return readJSON(`${STORAGE.drafts}_${String(email).toLowerCase()}`, null);
}

function saveDraft(email = state.homeState.studentEmail, index = state.homeState.testIndex, answers = state.homeState.answers) {
  if (!email || !email.includes('@')) return;
  saveJSON(`${STORAGE.drafts}_${String(email).toLowerCase()}`, {
    email,
    index,
    answers,
    updatedAt: new Date().toISOString(),
  });
}

function prevQuestion() {
  const q = state.questions[state.homeState.testIndex];
  if (q && q.type === 'text') {
    const ta = el('textAnswer');
    if (ta) state.homeState.answers[q.id] = ta.value;
  }
  if (state.homeState.testIndex > 0) state.homeState.testIndex -= 1;
  saveDraft();
  renderUserTest();
}

function nextQuestion() {
  const q = state.questions[state.homeState.testIndex];
  if (q && q.type === 'text') {
    const ta = el('textAnswer');
    if (ta) state.homeState.answers[q.id] = ta.value;
  }
  if (state.homeState.testIndex < state.questions.length - 1) state.homeState.testIndex += 1;
  saveDraft();
  renderUserTest();
}

function answerOption(qid, value) {
  state.homeState.answers[qid] = value;
  saveDraft();
}

function collectTestData() {
  let totalScore = 0;
  const summary = [];
  for (const q of state.questions) {
    const ans = state.homeState.answers[q.id];
    if (q.type === 'mcq') {
      const opt = q.options?.[Number(ans)];
      if (opt) {
        totalScore += Number(opt.score || 0);
        summary.push(`${q.prompt.slice(0, 26)}: ${opt.text}`);
      } else {
        summary.push(`${q.prompt.slice(0, 26)}: -`);
      }
    } else {
      summary.push(`${q.prompt.slice(0, 26)}: ${String(ans || '-').slice(0, 40)}`);
    }
  }
  return {
    email: state.homeState.studentEmail,
    score: totalScore,
    summary: summary.join(' | '),
    answers: state.homeState.answers,
  };
}

function finishTest() {
  const email = state.homeState.studentEmail || el('studentEmail')?.value.trim();
  if (!email || !email.includes('@')) return toast('Email siswa tidak valid.');
  const data = collectTestData();
  const record = {
    time: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
    email: data.email,
    score: data.score,
    summary: data.summary,
    answers: data.answers,
    submittedAt: new Date().toISOString(),
  };
  state.results.push(record);
  saveResults();

  const qid = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  state.pending.push({ id: qid, record });
  savePending();
  flushPending();

  localStorage.removeItem(`${STORAGE.drafts}_${String(email).toLowerCase()}`);
  state.homeState = { studentEmail: '', testIndex: 0, answers: {}, inTest: false };
  toast('Hasil tersimpan dan sedang dikirim.');
  if (state.page === 'user') renderUser();
  else renderHome();
}

async function flushPending() {
  const endpoint = (state.site.sheetEndpoint || '').trim();
  if (!endpoint || !state.pending.length) return;
  const remaining = [];
  for (const item of state.pending) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'SMK PGRI 2 Kediri Psychological Test', type: 'result', record: item.record }),
      });
    } catch {
      remaining.push(item);
    }
  }
  state.pending = remaining;
  savePending();
}

async function syncResults() {
  if (!state.site.sheetEndpoint) {
    toast('Isi spreadsheet endpoint dulu.');
    return;
  }
  await flushPending();
  try {
    await fetch(state.site.sheetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'SMK PGRI 2 Kediri Psychological Test', type: 'bulk-results', results: state.results }),
    });
    toast('Data dikirim ulang ke spreadsheet.');
  } catch {
    toast('Gagal mengirim ke spreadsheet.');
  }
}

function exportCSV() {
  if (!state.results.length) return toast('Belum ada data untuk diekspor.');
  const headers = ['time', 'email', 'score', 'summary'];
  const rows = state.results.map((r) => headers.map((h) => `"${String(r[h] ?? '').replaceAll('"', '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile('rekap_tes_psikologi.csv', csv, 'text/csv;charset=utf-8;');
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openSheet() {
  if (state.site.sheetUrl) {
    window.open(state.site.sheetUrl, '_blank', 'noopener,noreferrer');
  } else {
    toast('Isi URL Google Sheets dulu di pengaturan.');
  }
}

function testEndpoint() {
  if (!state.site.sheetEndpoint) return toast('Masukkan URL endpoint terlebih dahulu.');
  fetch(state.site.sheetEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'ping', time: new Date().toISOString() }),
  })
    .then((res) => toast(`Tes endpoint terkirim. Status: ${res.status}`))
    .catch(() => toast('Tes endpoint gagal.'));
}

function saveAdminSettings() {
  const endpoint = el('sheetEndpoint')?.value.trim();
  const sheetUrl = el('sheetUrl')?.value.trim();
  state.site.sheetEndpoint = endpoint || DEFAULT_ENDPOINT;
  state.site.sheetUrl = sheetUrl || '';
  saveSite();
  toast('Pengaturan disimpan.');
}

function saveSheetSettings() {
  state.site.sheetEndpoint = el('sheetEndpoint')?.value.trim() || DEFAULT_ENDPOINT;
  state.site.sheetUrl = el('sheetUrl')?.value.trim() || '';
  saveSite();
  toast('Spreadsheet disimpan.');
}

function logout() {
  state.session = null;
  saveSession();
  toast('Sesi keluar.');
  window.location.reload();
}

function doLogin(roleHint) {
  const email = el('loginEmail')?.value.trim();
  const password = el('loginPassword')?.value;
  const role = roleHint === 'superadmin' ? 'superadmin' : 'admin';
  const account = AUTH[role];
  if (!account || email !== account.email || password !== account.password) {
    toast('Login gagal. Cek email dan password.');
    return;
  }
  state.session = { email: account.email, role, label: account.label };
  saveSession();
  toast(`Masuk sebagai ${account.label}`);
  if (role === 'superadmin') window.location.href = 'superadmin.html';
  else window.location.href = 'admin.html';
}

function resetBranding() {
  state.site.branding = deepMerge(DEFAULT_SITE.branding, DEFAULT_SITE.branding);
  saveSite();
  renderSuper();
  toast('Branding direset.');
}

function saveBranding() {
  const branding = state.site.branding;
  branding.title = el('brandingTitle')?.value.trim() || branding.title;
  branding.subtitle = el('brandingSubtitle')?.value.trim() || branding.subtitle;
  branding.primaryColor = el('primaryColor')?.value || branding.primaryColor;
  branding.textColor = el('textColor')?.value || branding.textColor;
  branding.bgColor = el('bgColor')?.value || branding.bgColor;
  branding.heroColor = el('heroColor')?.value || branding.heroColor;
  saveSite();
  applyTheme();
  renderHome();
  toast('Branding disimpan.');
}

function saveHomepage() {
  state.site.home.heroTitle = el('homeHeroTitleInput')?.value.trim() || state.site.home.heroTitle;
  state.site.home.heroText = el('homeHeroTextInput')?.value.trim() || state.site.home.heroText;
  state.site.home.studentTitle = el('studentTitleInput')?.value.trim() || state.site.home.studentTitle;
  state.site.home.studentText = el('studentTextInput')?.value.trim() || state.site.home.studentText;
  state.site.home.guideItems = collectList('guide', ['text']).map((x) => x.text).filter(Boolean);
  state.site.home.categories = collectList('categories', ['title', 'desc', 'count']).filter((x) => x.title || x.desc);
  state.site.home.announcements = collectList('announcements', ['title', 'body']).filter((x) => x.title || x.body);
  state.site.home.faqs = collectList('faqs', ['q', 'a']).filter((x) => x.q || x.a);
  saveSite();
  renderHome();
  toast('Konten beranda disimpan.');
}

function collectList(key, fields) {
  const rows = qsa(`[data-list-section="${key}"] .list-row`);
  return rows.map((row) => {
    const item = {};
    fields.forEach((field) => {
      const input = row.querySelector(`[data-field="${field}"]`);
      item[field] = input ? input.value : '';
    });
    return item;
  });
}

function openQuestionEditor(id = null) {
  state.editor.mode = id ? 'edit' : 'add';
  state.editor.questionId = id;
  state.editor.draft = id ? structuredClone(state.questions.find((q) => q.id === id)) : {
    id: uid('q'),
    type: 'mcq',
    prompt: '',
    image: '',
    options: [
      { text: 'Opsi 1', score: 0, image: '' },
      { text: 'Opsi 2', score: 1, image: '' },
    ],
  };
  renderQuestionEditor();
}

function renderQuestionEditor() {
  const wrap = el('questionEditorWrap');
  if (!wrap) return;
  const q = state.editor.draft;
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="section-title">
      <h3>${state.editor.mode === 'edit' ? 'Edit Soal' : 'Tambah Soal'}</h3>
      <button class="btn outline small" data-action="cancel-question">Tutup</button>
    </div>
    <div class="editor-grid cols-2">
      <div class="field" style="grid-column:1/-1">
        <label for="qPrompt">Teks soal</label>
        <textarea id="qPrompt">${escapeHtml(q.prompt || '')}</textarea>
      </div>
      <div class="field">
        <label for="qType">Tipe soal</label>
        <select id="qType">
          <option value="mcq" ${q.type === 'mcq' ? 'selected' : ''}>Pilihan ganda</option>
          <option value="text" ${q.type === 'text' ? 'selected' : ''}>Isian / jawaban singkat</option>
        </select>
      </div>
      <div class="field">
        <label for="qImageFile">Gambar soal</label>
        <input id="qImageFile" class="input" type="file" accept="image/*">
      </div>
      <div class="field" style="grid-column:1/-1">
        <label for="qImageUrl">Atau URL gambar soal</label>
        <input id="qImageUrl" class="input" type="url" value="${escapeHtml(q.image && q.image.startsWith('http') ? q.image : '')}">
      </div>
    </div>
    <div id="mcqEditor" ${q.type === 'text' ? 'class="hidden"' : ''}>
      <div class="section-title">
        <h3 style="font-size:16px">Opsi jawaban</h3>
        <button class="btn outline small" data-action="add-option">Tambah Opsi</button>
      </div>
      <div class="choice-grid" id="optionEditor">
        ${renderOptionEditor(q.options || [])}
      </div>
      <p class="footer-note">Setiap opsi bisa punya teks, skor, dan gambar jawaban.</p>
    </div>
    <div id="textEditor" ${q.type === 'mcq' ? 'class="hidden"' : ''}>
      <div class="help-box">Soal isian menyimpan jawaban siswa sebagai teks.</div>
    </div>
    <div class="row" style="margin-top:16px">
      <button class="btn primary" data-action="save-question">Simpan Soal</button>
      <button class="btn outline" data-action="cancel-question">Batal</button>
    </div>
  `;
  bindQuestionEditorEvents();
}

async function saveQuestionFromEditor() {
  if (!state.session || state.session.role !== 'superadmin') return toast('Hanya super admin yang dapat mengubah soal.');
  const prompt = el('qPrompt')?.value.trim();
  const type = el('qType')?.value || 'mcq';
  const imageFile = el('qImageFile')?.files?.[0];
  const imageUrl = el('qImageUrl')?.value.trim();

  if (!prompt) return toast('Teks soal belum diisi.');

  const q = state.editor.draft || { id: uid('q'), type: 'mcq', prompt: '', image: '', options: [] };
  q.prompt = prompt;
  q.type = type;

  const options = type === 'mcq' ? await collectQuestionOptionsAsync() : [];
  q.options = options;

  if (type === 'mcq' && q.options.length < 2) return toast('Pilihan ganda minimal 2 opsi.');
  if (type === 'mcq' && q.options.some((o) => !o.text && !o.image)) return toast('Setiap opsi perlu teks atau gambar.');

  if (imageFile) {
    q.image = await readFileAsDataUrl(imageFile);
  } else {
    q.image = q.image || imageUrl || '';
  }

  if (state.editor.mode === 'edit') {
    state.questions = state.questions.map((item) => (item.id === q.id ? q : item));
  } else {
    state.questions.push(q);
  }

  saveQuestions();
  renderQuestionList();
  renderSuper();
  closeQuestionEditor();
  toast('Soal tersimpan.');
}

async function collectQuestionOptionsAsync() {
  const rows = qsa('[data-option-row]');
  const out = [];
  for (const row of rows) {
    const text = row.querySelector('[data-opt-field="text"]')?.value.trim() || '';
    const score = Number(row.querySelector('[data-opt-field="score"]')?.value || 0);
    const url = row.querySelector('[data-opt-field="imageUrl"]')?.value.trim() || '';
    const file = row.querySelector('[data-opt-file]')?.files?.[0];
    let image = row.querySelector('img.answer-thumb')?.src || url || '';
    if (file) image = await readFileAsDataUrl(file);
    out.push({ text, score, image });
  }
  return out;
}

function deleteQuestion(id) {
  if (!state.session || state.session.role !== 'superadmin') return toast('Hanya super admin yang dapat menghapus soal.');
  if (!confirm('Hapus soal ini?')) return;
  state.questions = state.questions.filter((q) => q.id !== id);
  saveQuestions();
  renderQuestionList();
  renderSuper();
  toast('Soal dihapus.');
}

function bindQuestionFiles() {
  const editor = el('questionEditorWrap');
  if (!editor) return;
  qsa('[data-opt-file]', editor).forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const dataUrl = await readFileAsDataUrl(file);
      const row = input.closest('[data-option-row]');
      const prev = row.querySelector('img.answer-thumb');
      if (prev) prev.remove();
      const img = document.createElement('img');
      img.className = 'answer-thumb';
      img.src = dataUrl;
      img.alt = 'Preview gambar jawaban';
      input.insertAdjacentElement('afterend', img);
    });
  });
}

function bindQuestionEditorEvents() {
  const wrap = el('questionEditorWrap');
  if (!wrap) return;
  wrap.onclick = (ev) => {
    const removeBtn = ev.target.closest('[data-action="remove-option-row"]');
    if (removeBtn) {
      removeBtn.closest('[data-option-row]')?.remove();
      return;
    }
  };
  wrap.onchange = (ev) => {
    const input = ev.target;
    if (input.matches('[data-opt-file]')) {
      const file = input.files?.[0];
      if (!file) return;
      const row = input.closest('[data-option-row]');
      if (!row) return;
      row.querySelector('img.answer-thumb')?.remove();
      readFileAsDataUrl(file).then((dataUrl) => {
        const img = document.createElement('img');
        img.className = 'answer-thumb';
        img.src = dataUrl;
        img.alt = 'Preview gambar jawaban';
        input.insertAdjacentElement('afterend', img);
      });
      return;
    }
    if (input.id === 'qType') {
      const isText = input.value === 'text';
      el('mcqEditor')?.classList.toggle('hidden', isText);
      el('textEditor')?.classList.toggle('hidden', !isText);
    }
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readHomeDataForListEditor() {
  // no-op placeholder for future
}

function saveQuestionDraftInputs() {
  // not used
}

function saveSiteAndRefresh() {
  saveSite();
  applyTheme();
  renderHome();
}

async function initPage() {
  loadAll();
  applyTheme();
  renderNavButtons();

  if (state.page === 'home') {
    renderHome();
  } else if (state.page === 'user') {
    renderUser();
  } else if (state.page === 'admin') {
    renderAdmin();
  } else if (state.page === 'super') {
    renderSuper();
  }

  await flushPending();
  savePending();
  setInterval(() => flushPending(), 45000);
}

document.addEventListener('DOMContentLoaded', () => {
  initPage().catch((err) => {
    console.error(err);
    const app = el('app');
    if (app) {
      app.innerHTML = `<div class="card"><div class="help-box">Terjadi error saat memuat aplikasi. Buka console untuk detail.</div></div>`;
    }
  });
});
