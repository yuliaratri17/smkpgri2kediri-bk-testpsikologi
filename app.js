
(() => {
  const KEYS = {
    config: 'smk_psikologi_config_v4',
    questions: 'smk_psikologi_questions_v4',
    results: 'smk_psikologi_results_v4',
    drafts: 'smk_psikologi_drafts_v4',
    session: 'smk_psikologi_session_v4',
    queue: 'smk_psikologi_queue_v4',
    lastSync: 'smk_psikologi_last_sync_v4'
  };

  const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyOaNrHdIgJA8pxXSQyQ0pzdTNEAXeSAtAEP9_ZpTKflXFk_jZeUFXjpUIiLCWT061s/exec';
  const SESSION_TTL_MS = 4 * 60 * 60 * 1000;

  const CREDENTIALS = {
    superadmin: { email: 'bksmkpgri2@gmail.com', password: 'rayarvian2', label: 'Super Admin' },
    admin: { email: 'admin', password: 'bkgrida2026', label: 'Admin Biasa' }
  };

  const DEFAULT_CONFIG = {
    branding: {
      title: 'Alat Tes Psikologi Internal',
      subtitle: 'SMK PGRI 2 Kediri · responsif untuk desktop, tablet, dan Android',
      logoData: '',
      backgroundData: '',
      primaryColor: '#0f3a66',
      textColor: '#0f172a',
      bgColor: '#f4f7fb',
      heroColor: '#1d4ed8'
    },
    home: {
      heroTitle: 'Tes psikologi internal yang cepat, rapi, dan nyaman dibuka di semua perangkat.',
      heroText: 'Masuk sebagai siswa, kerjakan tes, dan simpan progres secara otomatis. Beranda dibuat bergaya clean dengan hero besar, kartu ringkas, statistik, konten terstruktur, dan FAQ.',
      heroPills: ['Teks & gambar', 'Jawaban bergambar', 'Cloud spreadsheet', 'Layout responsif'],
      stats: [{ num: '100%', label: 'Responsif' }, { num: '4', label: 'Halaman' }, { num: '2', label: 'Role admin' }, { num: '1', label: 'Spreadsheet' }],
      features: ['Masuk sebagai siswa', 'Login admin terpisah', 'Editor soal gambar', 'Rekap cloud'],
      summaryBox: 'Beranda ini dapat diubah dari panel super admin.',
      guide: '1. Siswa memasukkan email lalu menekan mulai.\n2. Soal dapat berisi gambar dan jawaban bergambar.\n3. Super admin dapat mengubah konten, warna, logo, dan semua elemen penting.\n4. Admin biasa hanya melihat rekap hasil.',
      categoryTitle: 'Kategori tes',
      categories: [
        { title: 'Tes Kepribadian', desc: 'Untuk mengenali pola sikap dan kebiasaan siswa.', count: '12 item' },
        { title: 'Tes Minat & Bakat', desc: 'Membantu melihat arah potensi dan kecenderungan belajar.', count: '8 item' },
        { title: 'Tes Emosi', desc: 'Cocok untuk pemahaman kondisi emosi dan respon.', count: '6 item' }
      ],
      newsTitle: 'Info / pengumuman',
      posts: [
        { title: 'Pelaksanaan tes internal', body: 'Gunakan email pribadi siswa agar progres tersimpan dan hasil dapat direkap ke Google Sheets.' },
        { title: 'Mode super admin', body: 'Semua konten beranda dan identitas visual bisa diubah dari halaman super admin.' }
      ],
      faq: [
        { q: 'Apakah bisa diakses dari HP?', a: 'Bisa. Layout dibuat responsif agar nyaman di desktop, tablet, dan Android.' },
        { q: 'Apakah soal bisa gambar?', a: 'Bisa. Soal dan jawaban dapat berupa teks, gambar, atau kombinasi keduanya.' },
        { q: 'Apakah hasil tersimpan ke cloud?', a: 'Bisa jika endpoint Google Apps Script sudah diisi.' }
      ],
      footerBox: 'Konten footer dapat diedit dari super admin. Website ini siap dipakai di GitHub Pages.'
    },
    sheetEndpoint: DEFAULT_ENDPOINT,
    sheetUrl: ''
  };

  const el = (id) => document.getElementById(id);
  const page = document.body.dataset.page || 'home';

  const state = {
    page,
    config: load('config', DEFAULT_CONFIG),
    questions: [],
    results: [],
    session: load('session', null),
    queue: load('queue', []),
    answers: {},
    draftEmail: '',
    testIndex: 0,
    loading: 0,
    adminTab: 'results',
    superTab: 'questions',
    editingQuestionId: null,
    pendingImageData: ''
  };

  function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
  function load(key, fallback){
    try {
      const raw = localStorage.getItem(KEYS[key]);
      if (!raw) return deepClone(fallback);
      const parsed = JSON.parse(raw);
      if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : deepClone(fallback);
      if (parsed && typeof parsed === 'object') return merge(deepClone(fallback), parsed);
      return deepClone(fallback);
    } catch { return deepClone(fallback); }
  }
  function save(key, value){ localStorage.setItem(KEYS[key], JSON.stringify(value)); }
  function merge(target, source){
    if (!source || typeof source !== 'object') return target;
    for (const [k, v] of Object.entries(source)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        target[k] = merge(target[k], v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }
  function esc(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
  function uid(){ return 'q_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36); }
  function nowText(){ return new Date().toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' }); }
  function toast(msg){ const t = el('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
  function setLoading(on, msg='Memproses...'){
    const overlay = el('loadingOverlay');
    const label = el('loadingText');
    if (!overlay) return;
    if (on) {
      state.loading++;
      overlay.classList.add('show');
      document.body.classList.add('locked');
      if (label) label.textContent = msg;
    } else {
      state.loading = Math.max(0, state.loading - 1);
      if (state.loading === 0) {
        overlay.classList.remove('show');
        document.body.classList.remove('locked');
      }
    }
  }
  function isSuper(){ return state.session?.role === 'superadmin'; }
  function isAdminLike(){ return !!state.session && (state.session.role === 'admin' || state.session.role === 'superadmin'); }

  function setTheme(){
    const b = state.config.branding;
    document.documentElement.style.setProperty('--primary', b.primaryColor);
    document.documentElement.style.setProperty('--primary-2', b.heroColor);
    document.documentElement.style.setProperty('--text', b.textColor);
    document.documentElement.style.setProperty('--bg', b.bgColor);
    const bg = el('bgLayer');
    if (bg) bg.style.backgroundImage = b.backgroundData ? `linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.68)), url('${b.backgroundData}')` : 'linear-gradient(180deg,#eef4ff 0%, #f7fafc 40%, #f4f7fb 100%)';
    const title = el('brandTitle'), sub = el('brandSubtitle');
    if (title) title.textContent = b.title;
    if (sub) sub.textContent = b.subtitle;
    const img = el('logoImg'), fb = el('logoFallback');
    if (img && fb) {
      if (b.logoData) { img.src = b.logoData; img.classList.remove('hidden'); fb.classList.add('hidden'); }
      else { img.classList.add('hidden'); fb.classList.remove('hidden'); fb.textContent = (b.title || 'SP').split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase(); }
    }
  }

  function seedQuestions(){
    return [
      { id: uid(), type:'mcq', prompt:'Saya merasa mudah bergaul dengan teman baru.', image:'', options:[
        { text:'Sangat tidak setuju', score:0, image:'' },
        { text:'Tidak setuju', score:1, image:'' },
        { text:'Setuju', score:2, image:'' },
        { text:'Sangat setuju', score:3, image:'' }
      ]},
      { id: uid(), type:'text', prompt:'Tuliskan satu hal yang biasanya membuat kamu merasa lebih tenang saat sedang cemas.', image:'', options:[] }
    ];
  }

  function initData(){
    state.config.sheetEndpoint = state.config.sheetEndpoint || DEFAULT_ENDPOINT;
    state.questions = load('questions', []);
    state.results = load('results', []);
    state.queue = load('queue', []);
    if (!Array.isArray(state.questions) || !state.questions.length) {
      state.questions = seedQuestions();
      save('questions', state.questions);
    }
    validateSession();
  }

  function validateSession(){
    if (!state.session) return;
    if (!state.session.expiresAt || Date.now() > state.session.expiresAt) clearSession();
  }
  function clearSession(){ state.session = null; localStorage.removeItem(KEYS.session); }
  function saveSession(role, email){
    state.session = { role, email, label: role === 'superadmin' ? 'Super Admin' : 'Admin Biasa', startedAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS };
    save('session', state.session);
  }

  function sessionLeft(){ return state.session ? Math.max(0, state.session.expiresAt - Date.now()) : 0; }
  function fmt(ms){ const s = Math.floor(ms/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

  function renderHome(){
    setTheme();
    const h = state.config.home;
    const stats = el('homeStats'); if (stats) stats.innerHTML = h.stats.map(s => `<div class="stat"><div class="num">${esc(s.num)}</div><div class="lbl">${esc(s.label)}</div></div>`).join('');
    const chips = el('homeFeatureChips'); if (chips) chips.innerHTML = h.features.map(x => `<span class="navchip">${esc(x)}</span>`).join('');
    const cats = el('homeCategories'); if (cats) cats.innerHTML = h.categories.map(c => `<div class="category"><h4>${esc(c.title)}</h4><p>${esc(c.desc)}</p><span class="count">${esc(c.count)}</span></div>`).join('');
    const posts = el('homePosts'); if (posts) posts.innerHTML = h.posts.map(p => `<div class="post"><h4>${esc(p.title)}</h4><p>${esc(p.body)}</p></div>`).join('');
    const faq = el('homeFaq'); if (faq) faq.innerHTML = h.faq.map(f => `<details><summary>${esc(f.q)}</summary><div class="body">${esc(f.a)}</div></details>`).join('');
    const guide = el('homeGuide'); if (guide) guide.innerHTML = esc(h.guide).replaceAll('\n','<br>');
    const status = el('homeStatus');
    if (status) status.innerHTML = [
      `<span class="badge">${state.questions.length} soal tersimpan</span>`,
      `<span class="badge">${state.results.length} hasil rekap</span>`,
      `<span class="badge">${state.config.sheetEndpoint ? 'Spreadsheet terhubung' : 'Spreadsheet belum diatur'}</span>`,
      `<span class="badge">${state.session ? state.session.label : 'Belum login admin'}</span>`
    ].join('');
    const setText = (id, val) => { const n = el(id); if (n) n.textContent = val; };
    setText('homeSummaryBox', h.summaryBox);
    setText('homeFooterBox', h.footerBox);
    setText('homeCategoryTitle', h.categoryTitle);
    setText('homeNewsTitle', h.newsTitle);
    setText('homeHeroTitle', h.heroTitle);
    setText('homeHeroText', h.heroText);
    const heroPills = el('homeHeroPills'); if (heroPills) heroPills.innerHTML = h.heroPills.map(x => `<span class="meta-badge">${esc(x)}</span>`).join('');
  }

  function getStudentEmail(){ return (el('studentEmail')?.value || state.draftEmail || '').trim(); }
  function draftKey(email){ return `${KEYS.drafts}_${email.toLowerCase()}`; }
  function saveDraft(){
    const email = getStudentEmail();
    if (!email || !email.includes('@')) return;
    localStorage.setItem(draftKey(email), JSON.stringify({ email, index: state.testIndex, answers: state.answers, updatedAt: new Date().toISOString() }));
  }
  function resumeDraft(){
    const email = getStudentEmail();
    if (!email) return toast('Masukkan email siswa dulu.');
    const draft = loadDraft(email);
    if (!draft) return toast('Belum ada draft tersimpan untuk email ini.');
    state.draftEmail = email;
    state.answers = draft.answers || {};
    state.testIndex = draft.index || 0;
    showPage('test');
  }
  function loadDraft(email){
    try { return JSON.parse(localStorage.getItem(draftKey(email)) || 'null'); } catch { return null; }
  }
  function startTest(){
    const email = getStudentEmail();
    if (!email || !email.includes('@')) { toast('Masukkan email pribadi siswa yang valid.'); el('studentEmail')?.focus(); return; }
    state.draftEmail = email;
    const draft = loadDraft(email);
    state.answers = draft?.answers || {};
    state.testIndex = draft?.index || 0;
    showPage('test');
  }

  function showPage(name){
    ['pageHome','pageTest','pageAdmin'].forEach(id => el(id)?.classList.remove('active'));
    const map = { home:'pageHome', test:'pageTest', admin:'pageAdmin' };
    el(map[name])?.classList.add('active');
    if (name === 'home') renderHome();
    if (name === 'test') renderTest();
    if (name === 'admin') renderAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderTest(){
    setTheme();
    const email = getStudentEmail();
    const lbl = el('testEmailLabel'); if (lbl) lbl.textContent = email ? `Email: ${email}` : 'Email: belum diisi';
    const q = state.questions[state.testIndex];
    const host = el('questionHost');
    if (!q) { if (host) host.innerHTML = '<div class="help-box">Belum ada soal.</div>'; return; }
    const bar = el('progressBar'); if (bar) bar.style.width = `${((state.testIndex + 1) / state.questions.length) * 100}%`;
    el('btnPrevQ') && (el('btnPrevQ').disabled = state.testIndex <= 0);
    el('btnNextQ') && (el('btnNextQ').disabled = state.testIndex >= state.questions.length - 1);
    let html = `
      <div class="question-item" style="border:none;padding:0">
        <div class="section-title" style="margin-bottom:8px">
          <h3>Soal ${state.testIndex + 1} dari ${state.questions.length}</h3>
          <small>${q.type === 'mcq' ? 'Pilihan ganda' : 'Isian'}</small>
        </div>
        <h4 style="font-size:18px;margin:0 0 8px;line-height:1.5">${esc(q.prompt || '')}</h4>
        ${q.image ? `<img class="q-image" src="${q.image}" alt="Gambar soal">` : ''}
    `;
    if (q.type === 'mcq') {
      const current = state.answers[q.id] || '';
      html += '<div class="option-list">' + q.options.map((opt, idx) => {
        const selected = current === String(idx);
        return `
          <div class="option ${selected ? 'selected' : ''}">
            <label>
              <span style="display:block;width:100%">
                <span style="display:flex;gap:10px;align-items:flex-start;width:100%">
                  <input type="radio" name="answer_${q.id}" value="${idx}" ${selected ? 'checked' : ''} onchange="window.__saveAnswer('${q.id}', this.value)">
                  <span style="display:block">
                    <span>${esc(opt.text)}</span>
                    ${opt.image ? `<img class="answer-thumb" src="${opt.image}" alt="Jawaban bergambar">` : ''}
                  </span>
                </span>
              </span>
            </label>
            <span class="score">Skor ${Number(opt.score || 0)}</span>
          </div>`;
      }).join('') + '</div>';
    } else {
      const current = state.answers[q.id] || '';
      html += `
        <div class="field" style="margin-top:12px">
          <label for="textAnswer">Jawaban</label>
          <textarea id="textAnswer" placeholder="Tulis jawaban di sini...">${esc(current)}</textarea>
        </div>
        <div class="small">Jawaban akan tersimpan saat berpindah soal atau klik Simpan Progres.</div>`;
    }
    html += '</div>';
    if (host) host.innerHTML = html;
  }

  function buildSummary(){
    let total = 0;
    const parts = [];
    for (const q of state.questions) {
      const ans = state.answers[q.id];
      if (q.type === 'mcq') {
        const opt = q.options?.[Number(ans)];
        if (opt) { total += Number(opt.score || 0); parts.push(`${q.prompt.slice(0,26)}: ${opt.text}`); }
        else parts.push(`${q.prompt.slice(0,26)}: -`);
      } else {
        parts.push(`${q.prompt.slice(0,26)}: ${String(ans || '-').slice(0,40)}`);
      }
    }
    return { email: getStudentEmail(), score: total, summary: parts.join(' | ') };
  }

  function buildRecord(){
    const d = buildSummary();
    return {
      time: nowText(),
      email: d.email,
      score: d.score,
      summary: d.summary,
      answers: state.answers,
      submittedAt: new Date().toISOString(),
      status: 'ok',
      source: 'SMK PGRI 2 Kediri Psychological Test'
    };
  }

  function postToSheet(payload){
    const endpoint = state.config.sheetEndpoint || DEFAULT_ENDPOINT;
    return fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  function queuePayload(payload){
    state.queue.push(payload);
    save('queue', state.queue);
  }

  async function flushQueue(){
    if (!state.queue.length) return;
    const batch = state.queue.splice(0, Math.min(20, state.queue.length));
    save('queue', state.queue);
    const payload = batch.length === 1 ? batch[0] : { source: 'SMK PGRI 2 Kediri Psychological Test', type: 'bulk-results', results: batch };
    await postToSheet(payload);
    localStorage.setItem(KEYS.lastSync, String(Date.now()));
  }

  async function submitTest(){
    const email = getStudentEmail();
    if (!email || !email.includes('@')) return toast('Email siswa tidak valid.');
    if (!state.questions.length) return toast('Tidak ada soal untuk dikirim.');
    const record = buildRecord();
    state.results.push(record);
    save('results', state.results);
    localStorage.removeItem(draftKey(email));
    queuePayload({ source:'SMK PGRI 2 Kediri Psychological Test', type:'result', record });
    setLoading(true, 'Mengirim hasil ke spreadsheet...');
    try { await flushQueue(); toast('Hasil tersimpan dan dikirim.'); }
    catch { toast('Disimpan lokal. Akan dicoba kirim ulang nanti.'); }
    finally { setLoading(false); }
    state.answers = {};
    state.testIndex = 0;
    showPage('home');
  }

  function renderResults(){
    const body = el('resultsTable');
    const count = el('resultCountBadge');
    if (count) count.textContent = `${state.results.length} hasil`;
    if (!body) return;
    if (!state.results.length) { body.innerHTML = '<tr><td colspan="5">Belum ada hasil tes.</td></tr>'; return; }
    body.innerHTML = state.results.slice().reverse().map(r => `
      <tr><td>${esc(r.time)}</td><td>${esc(r.email)}</td><td><b>${Number(r.score || 0)}</b></td><td>${esc(r.summary || '')}</td><td>${esc(r.status || 'ok')}</td></tr>
    `).join('');
  }

  function renderTabs(){
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === state.adminTab));
    el('adminResultsTab')?.classList.toggle('hidden', state.adminTab !== 'results');
    el('adminSettingsTab')?.classList.toggle('hidden', state.adminTab !== 'settings');
  }

  function renderSuperTabs(){
    document.querySelectorAll('[data-super-tab]').forEach(b => b.classList.toggle('active', b.dataset.superTab === state.superTab));
    const ids = { questions:'superQuestionsTab', branding:'superBrandingTab', homepage:'superHomepageTab', raw:'superRawTab' };
    Object.values(ids).forEach(id => el(id)?.classList.add('hidden'));
    el(ids[state.superTab])?.classList.remove('hidden');
  }

  function renderQuestionList(){
    const badge = el('questionCountBadge'); if (badge) badge.textContent = `${state.questions.length} soal aktif`;
    const host = el('questionList'); if (!host) return;
    if (!state.questions.length) { host.innerHTML = '<div class="help-box">Belum ada soal.</div>'; return; }
    host.innerHTML = state.questions.map((q, idx) => `
      <div class="question-item">
        <header>
          <div>
            <h4>${idx + 1}. ${esc(q.prompt || '(Tanpa teks soal)')}</h4>
            <div class="meta">Tipe: ${q.type === 'mcq' ? 'Pilihan ganda' : 'Isian'} · ID: ${esc(q.id)}</div>
          </div>
          ${isSuper() ? `<div class="row" style="flex:0 0 auto;justify-content:flex-end"><button class="btn outline small" onclick="window.__editQuestion('${q.id}')">Edit</button><button class="btn danger small" onclick="window.__deleteQuestion('${q.id}')">Hapus</button></div>` : ''}
        </header>
        ${q.image ? `<img class="q-image" src="${q.image}" alt="Gambar soal">` : ''}
        ${q.type === 'mcq' ? `<div class="option-list">${q.options.map(opt => `<div class="option"><div style="width:100%"><div>${esc(opt.text)}</div>${opt.image ? `<img class="answer-thumb" src="${opt.image}" alt="Gambar jawaban">` : ''}</div><span class="score">Skor ${Number(opt.score || 0)}</span></div>`).join('')}</div>` : '<div class="small">Jawaban siswa akan disimpan sebagai teks.</div>'}
      </div>
    `).join('');
  }

  function renderBrandingForm(){
    const b = state.config.branding;
    ['brandingTitle','brandingSubtitle','primaryColor','textColor','bgColor','heroColor'].forEach(id => { const n = el(id); if (n) n.value = b[id === 'brandingTitle' ? 'title' : id === 'brandingSubtitle' ? 'subtitle' : id]; });
  }

  function renderHomepageForm(){
    const h = state.config.home;
    const set = (id, val) => { const n = el(id); if (n) n.value = val; };
    set('homeHeroTitleInput', h.heroTitle);
    set('homeHeroTextInput', h.heroText);
    set('homeSummaryBoxInput', h.summaryBox);
    set('homeFooterBoxInput', h.footerBox);
    set('homeCategoryTitleInput', h.categoryTitle);
    set('homeNewsTitleInput', h.newsTitle);
    set('homeFeaturesInput', h.features.join('\n'));
    set('homeHeroPillsInput', h.heroPills.join('\n'));
    set('homeStatsInput', h.stats.map(x => `${x.num} | ${x.label}`).join('\n'));
    set('homeCategoriesInput', h.categories.map(x => `${x.title} | ${x.desc} | ${x.count}`).join('\n'));
    set('homePostsInput', h.posts.map(x => `${x.title} | ${x.body}`).join('\n'));
    set('homeFaqInput', h.faq.map(x => `${x.q} | ${x.a}`).join('\n'));
    set('homeGuideInput', h.guide);
  }

  function renderSiteJson(){ const editor = el('siteJsonEditor'); if (editor) editor.value = JSON.stringify(state.config, null, 2); }

  function renderLoginInfo(){
    const box = el('loginInfoBox');
    if (box) box.innerHTML = `
      <div><b>Admin</b></div>
      <div>Email: ${esc(CREDENTIALS.admin.email)}</div>
      <div>Password: ${esc(CREDENTIALS.admin.password)}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
      <div><b>Super admin</b></div>
      <div>Email: ${esc(CREDENTIALS.superadmin.email)}</div>
      <div>Password: ${esc(CREDENTIALS.superadmin.password)}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
      <div>Logout wajib dilakukan agar sesi tidak tetap terbuka.</div>`;
  }

  function renderRoleUI(){
    document.querySelectorAll('.super-only').forEach(n => n.classList.toggle('hidden', !isSuper()));
    document.querySelectorAll('.admin-only').forEach(n => n.classList.toggle('hidden', !isAdminLike()));
    const chip = el('sessionChip');
    if (chip) chip.textContent = state.session ? `${state.session.label} · sisa ${fmt(sessionLeft())}` : 'Belum login';
    const banner = el('roleBanner');
    if (banner) {
      banner.classList.toggle('hidden', !state.session);
      if (state.session) banner.innerHTML = `<h3>${esc(state.session.label)}</h3><p>Sesi aktif. Sisa waktu: ${fmt(sessionLeft())}</p>`;
    }
    const lbl = el('adminRoleLabel'); if (lbl) lbl.textContent = state.session ? `Peran: ${state.session.label}` : 'Peran: -';
  }

  function openLogin(){ el('loginOverlay')?.classList.add('show'); document.body.classList.add('locked'); }
  function closeLogin(){ el('loginOverlay')?.classList.remove('show'); document.body.classList.remove('locked'); }

  function login(){
    const email = (el('adminEmail')?.value || '').trim();
    const pass = (el('adminPassword')?.value || '').trim();
    const hit = Object.entries(CREDENTIALS).find(([role, c]) => c.email === email && c.password === pass);
    if (!hit) return toast('Login gagal. Cek email dan password.');
    saveSession(hit[0], hit[1].email);
    closeLogin();
    renderAdmin();
    toast(`Masuk sebagai ${hit[1].label}`);
  }

  function logout(){
    clearSession();
    localStorage.removeItem(KEYS.session);
    renderRoleUI();
    closeLogin();
    if (state.page === 'admin') {
      toast('Logout berhasil.');
      setTimeout(() => window.location.href = 'index.html', 250);
    }
  }

  async function manualSync(){
    setLoading(true, 'Menyinkronkan hasil ke spreadsheet...');
    try {
      if (state.queue.length) await flushQueue();
      const payload = { source:'SMK PGRI 2 Kediri Psychological Test', type:'bulk-results', results: state.results };
      await postToSheet(payload);
      toast('Sinkronisasi selesai.');
    } catch {
      toast('Sinkronisasi gagal. Data tetap aman di browser.');
    } finally {
      setLoading(false);
    }
  }

  function saveAdminSettings(){
    state.config.sheetEndpoint = el('sheetEndpoint')?.value.trim() || DEFAULT_ENDPOINT;
    state.config.sheetUrl = el('sheetUrl')?.value.trim() || '';
    save('config', state.config);
    toast('Pengaturan spreadsheet disimpan.');
  }

  function testEndpoint(){ queuePayload({ source:'SMK PGRI 2 Kediri Psychological Test', type:'ping', time:new Date().toISOString() }); flushQueue().then(() => toast('Tes endpoint dikirim.')).catch(() => toast('Tes endpoint gagal dikirim.')); }

  function saveBranding(){
    if (!isSuper()) return;
    state.config.branding.title = el('brandingTitle').value.trim() || DEFAULT_CONFIG.branding.title;
    state.config.branding.subtitle = el('brandingSubtitle').value.trim() || DEFAULT_CONFIG.branding.subtitle;
    state.config.branding.primaryColor = el('primaryColor').value || DEFAULT_CONFIG.branding.primaryColor;
    state.config.branding.textColor = el('textColor').value || DEFAULT_CONFIG.branding.textColor;
    state.config.branding.bgColor = el('bgColor').value || DEFAULT_CONFIG.branding.bgColor;
    state.config.branding.heroColor = el('heroColor').value || DEFAULT_CONFIG.branding.heroColor;
    save('config', state.config); setTheme(); renderHome(); renderBrandingForm(); toast('Branding disimpan.');
  }

  function resetBranding(){ if (!isSuper()) return; state.config.branding = deepClone(DEFAULT_CONFIG.branding); save('config', state.config); renderBrandingForm(); renderHome(); toast('Branding direset.'); }

  function parseList(text){ return String(text || '').split('\n').map(x => x.trim()).filter(Boolean); }
  function parseTriplets(text){ return String(text || '').split('\n').map(x => x.trim()).filter(Boolean).map(line => { const [a='',b='',c=''] = line.split('|').map(y => y.trim()); return { a,b,c }; }); }

  function saveHomepage(){
    if (!isSuper()) return;
    const h = state.config.home;
    h.heroTitle = el('homeHeroTitleInput').value.trim() || DEFAULT_CONFIG.home.heroTitle;
    h.heroText = el('homeHeroTextInput').value.trim() || DEFAULT_CONFIG.home.heroText;
    h.summaryBox = el('homeSummaryBoxInput').value.trim() || DEFAULT_CONFIG.home.summaryBox;
    h.footerBox = el('homeFooterBoxInput').value.trim() || DEFAULT_CONFIG.home.footerBox;
    h.categoryTitle = el('homeCategoryTitleInput').value.trim() || DEFAULT_CONFIG.home.categoryTitle;
    h.newsTitle = el('homeNewsTitleInput').value.trim() || DEFAULT_CONFIG.home.newsTitle;
    h.features = parseList(el('homeFeaturesInput').value);
    h.heroPills = parseList(el('homeHeroPillsInput').value);
    h.stats = parseList(el('homeStatsInput').value).map(line => { const [num='', label=''] = line.split('|').map(x => x.trim()); return { num, label }; }).filter(x => x.num || x.label);
    h.categories = parseTriplets(el('homeCategoriesInput').value).map(x => ({ title: x.a, desc: x.b, count: x.c })).filter(x => x.title || x.desc || x.count);
    h.posts = parseTriplets(el('homePostsInput').value).map(x => ({ title: x.a, body: x.b })).filter(x => x.title || x.body);
    h.faq = parseTriplets(el('homeFaqInput').value).map(x => ({ q: x.a, a: x.b })).filter(x => x.q || x.a);
    h.guide = el('homeGuideInput').value.trim() || DEFAULT_CONFIG.home.guide;
    save('config', state.config); renderHome(); toast('Konten beranda disimpan.');
  }

  function saveSiteJson(){
    if (!isSuper()) return;
    try {
      const parsed = JSON.parse(el('siteJsonEditor').value);
      state.config = merge(deepClone(DEFAULT_CONFIG), parsed);
      state.config.sheetEndpoint = state.config.sheetEndpoint || DEFAULT_ENDPOINT;
      save('config', state.config);
      renderBrandingForm(); renderHomepageForm(); renderHome();
      toast('JSON situs disimpan.');
    } catch { toast('JSON tidak valid.'); }
  }

  function reloadSiteJson(){ renderSiteJson(); toast('JSON dimuat ulang.'); }

  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function openSpreadsheet(){ const url = state.config.sheetUrl || state.config.sheetEndpoint; if (!url) return toast('URL spreadsheet belum diisi.'); window.open(url, '_blank', 'noopener,noreferrer'); }

  function renderAdmin(){
    setTheme();
    renderRoleUI();
    renderLoginInfo();
    renderResults();
    renderTabs();
    renderSuperTabs();
    renderQuestionList();
    renderBrandingForm();
    renderHomepageForm();
    renderSiteJson();
  }

  function renderTabs(){
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === state.adminTab));
    el('adminResultsTab')?.classList.toggle('hidden', state.adminTab !== 'results');
    el('adminSettingsTab')?.classList.toggle('hidden', state.adminTab !== 'settings');
  }

  function renderSuperTabs(){
    document.querySelectorAll('[data-super-tab]').forEach(b => b.classList.toggle('active', b.dataset.superTab === state.superTab));
    ['superQuestionsTab','superBrandingTab','superHomepageTab','superRawTab'].forEach(id => el(id)?.classList.add('hidden'));
    const map = { questions:'superQuestionsTab', branding:'superBrandingTab', homepage:'superHomepageTab', raw:'superRawTab' };
    el(map[state.superTab])?.classList.remove('hidden');
  }

  function renderQuestionModal(q){
    el('questionModalTitle').textContent = q ? 'Edit Soal' : 'Tambah Soal';
    el('qPrompt').value = q?.prompt || '';
    el('qType').value = q?.type || 'mcq';
    el('qImageUrl').value = q?.image && q.image.startsWith('http') ? q.image : '';
    el('qImageFile').value = '';
    state.pendingImageData = q?.image && q.image.startsWith('data:') ? q.image : '';
    renderOptionEditor(q?.options?.length ? q.options : [{ text:'', score:0, image:'' },{ text:'', score:1, image:'' },{ text:'', score:2, image:'' },{ text:'', score:3, image:'' }]);
    el('mcqEditor').classList.toggle('hidden', q?.type === 'text');
    el('textEditor').classList.toggle('hidden', q?.type !== 'text');
  }

  function openQuestionModal(editId=null){
    if (!isSuper()) return;
    state.editingQuestionId = editId;
    renderQuestionModal(editId ? state.questions.find(x => x.id === editId) : null);
    el('questionModalBackdrop').classList.add('show');
  }
  function closeQuestionModal(){ el('questionModalBackdrop').classList.remove('show'); }

  function renderOptionEditor(options){
    const host = el('optionEditor'); if (!host) return;
    host.innerHTML = (options && options.length ? options : [{ text:'', score:0, image:'' }]).map((opt, idx) => `
      <div class="choice-row">
        <div class="field" style="margin:0">
          <label>Teks opsi ${idx+1}</label>
          <input class="input opt-text" value="${esc(opt.text || '')}" placeholder="Teks opsi ${idx+1}">
        </div>
        <div class="field" style="margin:0">
          <label>Skor</label>
          <input class="input opt-score" type="number" min="0" step="1" value="${Number(opt.score || 0)}">
        </div>
        <div class="field" style="margin:0">
          <label>Gambar jawaban</label>
          <input class="input opt-image-url" type="url" placeholder="URL gambar (opsional)" value="${esc(opt.image && opt.image.startsWith('http') ? opt.image : '')}">
          <input class="input opt-image-file" type="file" accept="image/*" onchange="window.__handleOptionImageFile(this)">
          <input type="hidden" class="opt-image-data" value="${esc(opt.image && opt.image.startsWith('data:') ? opt.image : '')}">
          ${opt.image ? `<img class="answer-thumb answer-thumb-inline" src="${opt.image}" alt="Preview gambar jawaban">` : ''}
        </div>
        <div class="field" style="margin:0">
          <label>Aksi</label>
          <button class="btn danger small" type="button" onclick="this.closest('.choice-row').remove()">Hapus</button>
        </div>
      </div>
    `).join('');
  }

  function addOptionRow(){
    const host = el('optionEditor'); if (!host) return;
    const idx = host.querySelectorAll('.choice-row').length + 1;
    const div = document.createElement('div');
    div.className = 'choice-row';
    div.innerHTML = `
      <div class="field" style="margin:0"><label>Teks opsi ${idx}</label><input class="input opt-text" placeholder="Teks opsi ${idx}"></div>
      <div class="field" style="margin:0"><label>Skor</label><input class="input opt-score" type="number" min="0" step="1" value="0"></div>
      <div class="field" style="margin:0">
        <label>Gambar jawaban</label>
        <input class="input opt-image-url" type="url" placeholder="URL gambar (opsional)">
        <input class="input opt-image-file" type="file" accept="image/*" onchange="window.__handleOptionImageFile(this)">
        <input type="hidden" class="opt-image-data" value="">
      </div>
      <div class="field" style="margin:0"><label>Aksi</label><button class="btn danger small" type="button" onclick="this.closest('.choice-row').remove()">Hapus</button></div>
    `;
    host.appendChild(div);
  }

  async function handleOptionImageFile(input){
    const file = input.files && input.files[0];
    const row = input.closest('.choice-row');
    if (!file || !row) return;
    const data = await fileToDataUrl(file);
    row.querySelector('.opt-image-data').value = data;
    row.querySelector('.opt-image-url').value = '';
    let img = row.querySelector('.answer-thumb-inline');
    if (!img) {
      img = document.createElement('img');
      img.className = 'answer-thumb answer-thumb-inline';
      row.querySelector('.field:nth-child(3)').appendChild(img);
    }
    img.src = data;
    img.alt = 'Preview gambar jawaban';
  }

  function gatherOptions(){
    return [...document.querySelectorAll('#optionEditor .choice-row')].map(row => {
      const text = row.querySelector('.opt-text').value.trim();
      const score = Number(row.querySelector('.opt-score').value || 0);
      const image = row.querySelector('.opt-image-data').value.trim() || row.querySelector('.opt-image-url').value.trim();
      return { text, score, image };
    }).filter(x => x.text || x.image);
  }

  async function saveQuestion(){
    if (!isSuper()) return;
    const prompt = el('qPrompt').value.trim();
    const type = el('qType').value;
    if (!prompt) return toast('Teks soal belum diisi.');
    let image = state.pendingImageData || el('qImageUrl').value.trim();
    if (el('qImageFile').files && el('qImageFile').files[0]) image = await fileToDataUrl(el('qImageFile').files[0]);
    const q = { id: state.editingQuestionId || uid(), type, prompt, image, options: type === 'mcq' ? gatherOptions() : [] };
    if (type === 'mcq' && q.options.length < 2) return toast('Pilihan ganda minimal 2 opsi.');
    if (state.editingQuestionId) state.questions = state.questions.map(x => x.id === state.editingQuestionId ? q : x);
    else state.questions.push(q);
    save('questions', state.questions);
    renderQuestionList(); renderHome(); closeQuestionModal(); toast('Soal berhasil disimpan.');
  }

  function exportCSV(){
    if (!state.results.length) return toast('Belum ada data untuk diekspor.');
    const headers = ['time','email','score','summary','status'];
    const rows = state.results.map(r => headers.map(h => '"' + String(r[h] ?? '').replaceAll('"','""') + '"').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rekap_tes_psikologi.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function syncNow(){
    setLoading(true, 'Menyinkronkan hasil ke spreadsheet...');
    try {
      if (state.queue.length) await flushQueue();
      await postToSheet({ source:'SMK PGRI 2 Kediri Psychological Test', type:'bulk-results', results: state.results });
      toast('Sinkronisasi selesai.');
    } catch {
      toast('Sinkronisasi gagal. Data tetap aman di browser.');
    } finally {
      setLoading(false);
    }
  }

  function saveAdminSettings(){
    state.config.sheetEndpoint = el('sheetEndpoint').value.trim() || DEFAULT_ENDPOINT;
    state.config.sheetUrl = el('sheetUrl').value.trim() || '';
    save('config', state.config);
    toast('Pengaturan spreadsheet disimpan.');
  }

  function testEndpoint(){
    queuePayload({ source:'SMK PGRI 2 Kediri Psychological Test', type:'ping', time:new Date().toISOString() });
    flushQueue().then(() => toast('Tes endpoint dikirim.')).catch(() => toast('Tes endpoint gagal dikirim.'));
  }

  function queuePayload(payload){ state.queue.push(payload); save('queue', state.queue); }

  async function flushQueue(){
    if (!state.queue.length) return;
    const batch = state.queue.splice(0, Math.min(20, state.queue.length));
    save('queue', state.queue);
    const payload = batch.length === 1 ? batch[0] : { source:'SMK PGRI 2 Kediri Psychological Test', type:'bulk-results', results: batch };
    await postToSheet(payload);
    localStorage.setItem(KEYS.lastSync, String(Date.now()));
  }

  function postToSheet(payload){
    const endpoint = state.config.sheetEndpoint || DEFAULT_ENDPOINT;
    return fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  function saveBranding(){
    if (!isSuper()) return;
    state.config.branding.title = el('brandingTitle').value.trim() || DEFAULT_CONFIG.branding.title;
    state.config.branding.subtitle = el('brandingSubtitle').value.trim() || DEFAULT_CONFIG.branding.subtitle;
    state.config.branding.primaryColor = el('primaryColor').value || DEFAULT_CONFIG.branding.primaryColor;
    state.config.branding.textColor = el('textColor').value || DEFAULT_CONFIG.branding.textColor;
    state.config.branding.bgColor = el('bgColor').value || DEFAULT_CONFIG.branding.bgColor;
    state.config.branding.heroColor = el('heroColor').value || DEFAULT_CONFIG.branding.heroColor;
    save('config', state.config);
    setTheme(); renderHome(); renderBrandingForm();
    toast('Branding disimpan.');
  }

  function resetBranding(){
    if (!isSuper()) return;
    state.config.branding = deepClone(DEFAULT_CONFIG.branding);
    save('config', state.config);
    renderBrandingForm(); renderHome();
    toast('Branding direset.');
  }

  function parseList(text){ return String(text || '').split('\n').map(x => x.trim()).filter(Boolean); }
  function parseTriplets(text){ return String(text || '').split('\n').map(x => x.trim()).filter(Boolean).map(line => { const [a='',b='',c=''] = line.split('|').map(y => y.trim()); return { a,b,c }; }); }

  function saveHomepage(){
    if (!isSuper()) return;
    const h = state.config.home;
    h.heroTitle = el('homeHeroTitleInput').value.trim() || DEFAULT_CONFIG.home.heroTitle;
    h.heroText = el('homeHeroTextInput').value.trim() || DEFAULT_CONFIG.home.heroText;
    h.summaryBox = el('homeSummaryBoxInput').value.trim() || DEFAULT_CONFIG.home.summaryBox;
    h.footerBox = el('homeFooterBoxInput').value.trim() || DEFAULT_CONFIG.home.footerBox;
    h.categoryTitle = el('homeCategoryTitleInput').value.trim() || DEFAULT_CONFIG.home.categoryTitle;
    h.newsTitle = el('homeNewsTitleInput').value.trim() || DEFAULT_CONFIG.home.newsTitle;
    h.features = parseList(el('homeFeaturesInput').value);
    h.heroPills = parseList(el('homeHeroPillsInput').value);
    h.stats = parseList(el('homeStatsInput').value).map(line => { const [num='', label=''] = line.split('|').map(x => x.trim()); return { num, label }; }).filter(x => x.num || x.label);
    h.categories = parseTriplets(el('homeCategoriesInput').value).map(x => ({ title:x.a, desc:x.b, count:x.c })).filter(x => x.title || x.desc || x.count);
    h.posts = parseTriplets(el('homePostsInput').value).map(x => ({ title:x.a, body:x.b })).filter(x => x.title || x.body);
    h.faq = parseTriplets(el('homeFaqInput').value).map(x => ({ q:x.a, a:x.b })).filter(x => x.q || x.a);
    h.guide = el('homeGuideInput').value.trim() || DEFAULT_CONFIG.home.guide;
    save('config', state.config);
    renderHome();
    toast('Konten beranda disimpan.');
  }

  function saveSiteJson(){
    if (!isSuper()) return;
    try {
      const parsed = JSON.parse(el('siteJsonEditor').value);
      state.config = merge(deepClone(DEFAULT_CONFIG), parsed);
      state.config.sheetEndpoint = state.config.sheetEndpoint || DEFAULT_ENDPOINT;
      save('config', state.config);
      renderBrandingForm(); renderHomepageForm(); renderHome();
      toast('JSON situs disimpan.');
    } catch { toast('JSON tidak valid.'); }
  }

  function reloadSiteJson(){ renderSiteJson(); toast('JSON dimuat ulang.'); }

  function openSpreadsheet(){
    const url = state.config.sheetUrl || state.config.sheetEndpoint;
    if (!url) return toast('URL spreadsheet belum diisi.');
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function login(){
    const email = (el('adminEmail')?.value || '').trim();
    const pass = (el('adminPassword')?.value || '').trim();
    const match = Object.entries(CREDENTIALS).find(([role, c]) => c.email === email && c.password === pass);
    if (!match) return toast('Login gagal. Cek email dan password.');
    saveSession(match[0], match[1].email);
    closeLogin();
    renderAdmin();
    toast(`Masuk sebagai ${match[1].label}`);
  }

  function openLogin(){ el('loginOverlay')?.classList.add('show'); document.body.classList.add('locked'); }
  function closeLogin(){ el('loginOverlay')?.classList.remove('show'); document.body.classList.remove('locked'); }
  function logout(){
    clearSession();
    localStorage.removeItem(KEYS.session);
    closeLogin();
    if (state.page === 'admin') { toast('Logout berhasil.'); setTimeout(() => window.location.href = 'index.html', 250); }
  }

  function renderLoginInfo(){
    const box = el('loginInfoBox');
    if (box) box.innerHTML = `
      <div><b>Admin</b></div>
      <div>Email: ${esc(CREDENTIALS.admin.email)}</div>
      <div>Password: ${esc(CREDENTIALS.admin.password)}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
      <div><b>Super admin</b></div>
      <div>Email: ${esc(CREDENTIALS.superadmin.email)}</div>
      <div>Password: ${esc(CREDENTIALS.superadmin.password)}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0">
      <div>Logout wajib dilakukan agar sesi tidak tetap terbuka.</div>`;
  }

  function renderSessionChip(){
    const chip = el('sessionChip');
    if (chip) chip.textContent = state.session ? `${state.session.label} · sisa ${fmt(sessionLeft())}` : 'Belum login';
    const banner = el('roleBanner');
    if (banner) {
      banner.classList.toggle('hidden', !state.session);
      if (state.session) banner.innerHTML = `<h3>${esc(state.session.label)}</h3><p>Sesi aktif. Sisa waktu: ${fmt(sessionLeft())}</p>`;
    }
    const lbl = el('adminRoleLabel');
    if (lbl) lbl.textContent = state.session ? `Peran: ${state.session.label}` : 'Peran: -';
  }

  function renderRoleVisibility(){
    document.querySelectorAll('.super-only').forEach(n => n.classList.toggle('hidden', !isSuper()));
    document.querySelectorAll('.admin-only').forEach(n => n.classList.toggle('hidden', !isAdminLike()));
    renderSessionChip();
  }

  function renderBrandingForm(){
    const b = state.config.branding;
    const ids = {
      brandingTitle: 'title',
      brandingSubtitle: 'subtitle',
      primaryColor: 'primaryColor',
      textColor: 'textColor',
      bgColor: 'bgColor',
      heroColor: 'heroColor'
    };
    for (const [id, key] of Object.entries(ids)) { const n = el(id); if (n) n.value = b[key]; }
  }

  function renderHomepageForm(){
    const h = state.config.home;
    const set = (id, val) => { const n = el(id); if (n) n.value = val; };
    set('homeHeroTitleInput', h.heroTitle);
    set('homeHeroTextInput', h.heroText);
    set('homeSummaryBoxInput', h.summaryBox);
    set('homeFooterBoxInput', h.footerBox);
    set('homeCategoryTitleInput', h.categoryTitle);
    set('homeNewsTitleInput', h.newsTitle);
    set('homeFeaturesInput', h.features.join('\n'));
    set('homeHeroPillsInput', h.heroPills.join('\n'));
    set('homeStatsInput', h.stats.map(x => `${x.num} | ${x.label}`).join('\n'));
    set('homeCategoriesInput', h.categories.map(x => `${x.title} | ${x.desc} | ${x.count}`).join('\n'));
    set('homePostsInput', h.posts.map(x => `${x.title} | ${x.body}`).join('\n'));
    set('homeFaqInput', h.faq.map(x => `${x.q} | ${x.a}`).join('\n'));
    set('homeGuideInput', h.guide);
  }

  function renderSiteJson(){ const editor = el('siteJsonEditor'); if (editor) editor.value = JSON.stringify(state.config, null, 2); }

  function bindHomeEvents(){
    el('btnHome')?.addEventListener('click', () => showPage('home'));
    el('btnAdminLink')?.addEventListener('click', () => window.location.href = 'admin.html');
    el('btnStudentQuick')?.addEventListener('click', () => getStudentEmail() ? startTest() : (toast('Isi email siswa dulu.'), el('studentEmail')?.focus()));
    el('btnStartStudent')?.addEventListener('click', startTest);
    el('btnResumeDraft')?.addEventListener('click', resumeDraft);
    el('btnBackHomeFromTest')?.addEventListener('click', () => showPage('home'));
    el('btnSaveDraft')?.addEventListener('click', () => { saveDraft(); toast('Progres disimpan.'); });
    el('btnPrevQ')?.addEventListener('click', () => { state.testIndex = Math.max(0, state.testIndex - 1); renderTest(); saveDraft(); });
    el('btnNextQ')?.addEventListener('click', () => { state.testIndex = Math.min(state.questions.length - 1, state.testIndex + 1); renderTest(); saveDraft(); });
    el('btnFinishTest')?.addEventListener('click', async () => { const q = state.questions[state.testIndex]; if (q?.type === 'text') { const ta = el('textAnswer'); if (ta) state.answers[q.id] = ta.value; } await submitTest(); });
    window.__saveAnswer = (qid, value) => { state.answers[qid] = value; saveDraft(); };
  }

  function bindAdminEvents(){
    el('btnOpenSpreadsheet')?.addEventListener('click', openSpreadsheet);
    el('btnLogoutAdmin')?.addEventListener('click', logout);
    el('btnDoLogin')?.addEventListener('click', login);
    el('btnCloseLogin')?.addEventListener('click', closeLogin);
    el('loginOverlay')?.addEventListener('click', (e) => { if (e.target === el('loginOverlay')) closeLogin(); });
    el('btnSaveAdminSettings')?.addEventListener('click', saveAdminSettings);
    el('btnTestEndpoint')?.addEventListener('click', testEndpoint);
    el('btnExportCSV')?.addEventListener('click', exportCSV);
    el('btnSyncNow')?.addEventListener('click', manualSync);
    el('btnAddQuestion')?.addEventListener('click', () => openQuestionModal());
    el('btnCloseQuestionModal')?.addEventListener('click', closeQuestionModal);
    el('questionModalBackdrop')?.addEventListener('click', (e) => { if (e.target === el('questionModalBackdrop')) closeQuestionModal(); });
    el('btnSaveQuestion')?.addEventListener('click', saveQuestion);
    el('btnAddOption')?.addEventListener('click', addOptionRow);
    el('qType')?.addEventListener('change', (e) => {
      el('mcqEditor')?.classList.toggle('hidden', e.target.value !== 'mcq');
      el('textEditor')?.classList.toggle('hidden', e.target.value === 'mcq');
    });
    el('btnSaveBranding')?.addEventListener('click', saveBranding);
    el('btnResetBranding')?.addEventListener('click', resetBranding);
    el('btnSaveHomepage')?.addEventListener('click', saveHomepage);
    el('btnSaveSiteJson')?.addEventListener('click', saveSiteJson);
    el('btnReloadSiteJson')?.addEventListener('click', reloadSiteJson);
    el('brandingLogoFile')?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      state.config.branding.logoData = await fileToDataUrl(f);
      save('config', state.config); renderHome(); renderBrandingForm();
    });
    el('brandingBackgroundFile')?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      state.config.branding.backgroundData = await fileToDataUrl(f);
      save('config', state.config); renderHome(); renderBrandingForm();
    });
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { state.adminTab = b.dataset.tab; renderTabs(); }));
    document.querySelectorAll('[data-super-tab]').forEach(b => b.addEventListener('click', () => { state.superTab = b.dataset.superTab; renderSuperTabs(); }));
  }

  async function autoFlushQueue(){
    if (!state.queue.length) return;
    try { await flushQueue(); } catch {}
  }

  function updateSessionTimer(){
    if (state.session && sessionLeft() <= 0) {
      clearSession();
      closeLogin();
      if (state.page === 'admin') {
        toast('Sesi habis. Silakan login ulang.');
        setTimeout(() => window.location.href = 'index.html', 250);
      }
    }
    renderSessionChip();
  }

  function init(){
    initData();
    setTheme();
    if (state.page === 'home') {
      renderHome();
      bindHomeEvents();
    } else if (state.page === 'admin') {
      bindAdminEvents();
      if (!state.session) openLogin();
      renderAdmin();
      renderRoleVisibility();
    } else if (state.page === 'test') {
      renderTest();
      bindHomeEvents();
    }
    window.addEventListener('beforeunload', () => {
      if (state.page === 'test') saveDraft();
      save('config', state.config);
      save('questions', state.questions);
      save('results', state.results);
      save('queue', state.queue);
    });
    setInterval(updateSessionTimer, 1000);
    setInterval(autoFlushQueue, 45000);
    window.__editQuestion = (id) => { if (isSuper()) openQuestionModal(id); };
    window.__deleteQuestion = (id) => { if (!isSuper()) return; if (!confirm('Hapus soal ini?')) return; state.questions = state.questions.filter(x => x.id !== id); save('questions', state.questions); renderQuestionList(); renderHome(); };
    window.__handleOptionImageFile = handleOptionImageFile;
    if (state.page === 'admin') {
      const chip = el('sessionChip'); if (chip) chip.textContent = state.session ? `${state.session.label} · sisa ${fmt(sessionLeft())}` : 'Belum login';
      renderRoleVisibility();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
