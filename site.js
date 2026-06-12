// ANTI OVERLAY BUG GLOBAL
window.addEventListener("load", () => {
  const overlay = document.getElementById("loginOverlay");
  if (overlay && localStorage.getItem("adminLogin") === "true") {
    overlay.style.display = "none";
  }
});
(function(){
  const APP = {
    data: {
      questions: 'sp_psikologi_questions_v3',
      results: 'sp_psikologi_results_v3',
      settings: 'sp_psikologi_settings_v3',
      drafts: 'sp_psikologi_drafts_v3',
      session: 'sp_psikologi_session_v3'
    },
    endpointDefault: 'https://script.google.com/macros/s/AKfycbyOaNrHdIgJA8pxXSQyQ0pzdTNEAXeSAtAEP9_ZpTKflXFk_jZeUFXjpUIiLCWT061s/exec',
    login: {
      superadmin: { email: 'bksmkpgri2@gmail.com', password: 'rayarvian2', label: 'Super Admin' },
      admin: { email: 'admin', password: 'bkgrida2026', label: 'Admin Biasa' }
    }
  };

  const DEFAULT_STATE = {
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
      heroText: 'Masuk sebagai siswa, kerjakan tes, dan simpan progres secara otomatis. Beranda dibuat bergaya clean, dengan hero besar, kartu ringkas, statistik, konten terstruktur, dan FAQ.',
      heroPills: ['Teks & gambar', 'Jawaban bergambar', 'Cloud spreadsheet', 'Layout responsif'],
      stats: [
        { num: '100%', label: 'Responsif' },
        { num: '4', label: 'Halaman' },
        { num: '2', label: 'Role admin' },
        { num: '1', label: 'Spreadsheet' }
      ],
      features: ['Masuk sebagai siswa', 'Login admin terpisah', 'Editor soal gambar', 'Rekap cloud'],
      summaryBox: 'Beranda ini dapat diubah dari panel super admin.',
      guide: '1. Siswa memasukkan email lalu menekan mulai.\n2. Soal dapat berisi gambar dan jawaban bergambar.\n3. Super admin dapat mengubah konten, warna, logo, dan semua elemen penting dari website.\n4. Admin biasa hanya melihat rekap hasil.',
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
    sheetEndpoint: '',
    sheetUrl: '',
    currentRole: null
  };

  const state = {
    page: document.body.dataset.page || 'home',
    config: loadJson(APP.data.settings, DEFAULT_STATE),
    questions: loadJson(APP.data.questions, [
      {
        id: uid(),
        type: 'mcq',
        prompt: 'Saya merasa mudah bergaul dengan teman baru.',
        image: '',
        options: [
          { text: 'Sangat tidak setuju', score: 0, image: '' },
          { text: 'Tidak setuju', score: 1, image: '' },
          { text: 'Setuju', score: 2, image: '' },
          { text: 'Sangat setuju', score: 3, image: '' }
        ]
      },
      {
        id: uid(),
        type: 'text',
        prompt: 'Tuliskan satu hal yang biasanya membuat kamu merasa lebih tenang saat sedang cemas.',
        image: '',
        options: []
      }
    ]),
    results: loadJson(APP.data.results, []),
    session: loadJson(APP.data.session, null),
    testIndex: 0,
    answers: {},
    draftEmail: '',
    editingQuestionId: null,
    pendingQuestionImage: '',
    pendingLogo: '',
    pendingBackground: '',
    tab: 'results',
    superTab: 'questions',
    pendingResultQueue: loadJson('sp_psikologi_pending_queue_v3', []),
  };

  function uid(){
    return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function el(id){
    return document.getElementById(id);
  }

  function $$ (sel, root=document){
    return Array.from(root.querySelectorAll(sel));
  }

  function loadJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return clone(fallback);
      return Object.assign({}, clone(fallback), JSON.parse(raw));
    }catch{
      return clone(fallback);
    }
  }

  function saveJson(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clone(v){
    return JSON.parse(JSON.stringify(v));
  }

  function esc(v){
    return String(v ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function toast(msg){
    const t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function saveAll(){
    saveJson(APP.data.questions, state.questions);
    saveJson(APP.data.results, state.results);
    saveJson(APP.data.settings, state.config);
    saveJson(APP.data.session, state.session);
    saveJson('sp_psikologi_pending_queue_v3', state.pendingResultQueue);
  }

  function applyBranding(){
    const b = state.config.branding || DEFAULT_STATE.branding;
    document.documentElement.style.setProperty('--primary', b.primaryColor || DEFAULT_STATE.branding.primaryColor);
    document.documentElement.style.setProperty('--primary-2', b.heroColor || DEFAULT_STATE.branding.heroColor);
    document.documentElement.style.setProperty('--text', b.textColor || DEFAULT_STATE.branding.textColor);
    document.documentElement.style.setProperty('--bg', b.bgColor || DEFAULT_STATE.branding.bgColor);

    const title = b.title || DEFAULT_STATE.branding.title;
    const subtitle = b.subtitle || DEFAULT_STATE.branding.subtitle;
    $$('#brandTitle').forEach(x => x.textContent = title);
    $$('#brandSubtitle').forEach(x => x.textContent = subtitle);

    const bgLayer = el('bgLayer');
    if (bgLayer){
      if (b.backgroundData){
        bgLayer.style.backgroundImage = `linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,.68)), url('${b.backgroundData}')`;
      } else {
        bgLayer.style.backgroundImage = 'linear-gradient(180deg,#eef4ff 0%, #f7fafc 40%, #f4f7fb 100%)';
      }
    }

    const logoImg = el('logoImg');
    const logoFallback = el('logoFallback');
    if (logoImg && logoFallback){
      if (b.logoData){
        logoImg.src = b.logoData;
        logoImg.classList.remove('hidden');
        logoFallback.classList.add('hidden');
      } else {
        logoImg.classList.add('hidden');
        logoFallback.classList.remove('hidden');
        logoFallback.textContent = (title || 'AT').split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase();
      }
    }
  }

  function renderHome(){
    applyBranding();
    const home = state.config.home || DEFAULT_STATE.home;

    const heroTitle = el('homeHeroTitle');
    const heroText = el('homeHeroText');
    if (heroTitle) heroTitle.textContent = home.heroTitle || DEFAULT_STATE.home.heroTitle;
    if (heroText) heroText.textContent = home.heroText || DEFAULT_STATE.home.heroText;

    const stats = el('homeStats');
    if (stats){
      stats.innerHTML = (home.stats || []).map(s => `
        <div class="stat">
          <div class="num">${esc(s.num)}</div>
          <div class="lbl">${esc(s.label)}</div>
        </div>
      `).join('');
    }

    const chips = el('homeFeatureChips');
    if (chips){
      chips.innerHTML = (home.features || []).map(f => `<span class="navchip">${esc(f)}</span>`).join('');
    }

    const categories = el('homeCategories');
    if (categories){
      categories.innerHTML = (home.categories || []).map(c => `
        <div class="category">
          <h4>${esc(c.title)}</h4>
          <p>${esc(c.desc)}</p>
          <span class="count">${esc(c.count)}</span>
        </div>
      `).join('');
    }

    const posts = el('homePosts');
    if (posts){
      posts.innerHTML = (home.posts || []).map(p => `
        <div class="post">
          <h4>${esc(p.title)}</h4>
          <p>${esc(p.body)}</p>
        </div>
      `).join('');
    }

    const faq = el('homeFaq');
    if (faq){
      faq.innerHTML = (home.faq || []).map(item => `
        <details>
          <summary>${esc(item.q)}</summary>
          <div class="body">${esc(item.a)}</div>
        </details>
      `).join('');
    }

    const guide = el('homeGuide');
    if (guide) guide.innerHTML = (home.guide || '').replaceAll('\n', '<br>');

    const summaryBox = el('homeSummaryBox');
    if (summaryBox) summaryBox.textContent = home.summaryBox || '';

    const footerBox = el('homeFooterBox');
    if (footerBox) footerBox.textContent = home.footerBox || '';

    const categoryTitle = el('homeCategoryTitle');
    if (categoryTitle) categoryTitle.textContent = home.categoryTitle || '';

    const newsTitle = el('homeNewsTitle');
    if (newsTitle) newsTitle.textContent = home.newsTitle || '';

    const status = el('homeStatus');
    if (status){
      const sheetText = state.config.sheetEndpoint ? 'Spreadsheet terhubung' : 'Spreadsheet belum diatur';
      const roleText = state.session ? `Login aktif: ${state.session.label}` : 'Belum login admin';
      status.innerHTML = [
        `<span class="badge">${state.questions.length} soal tersimpan</span>`,
        `<span class="badge">${state.results.length} hasil rekap</span>`,
        `<span class="badge">${sheetText}</span>`,
        `<span class="badge">${roleText}</span>`
      ].join('');
    }

    const pills = el('homeHeroPills');
    if (pills){
      pills.innerHTML = (home.heroPills || []).map(x => `<span class="meta-badge">${esc(x)}</span>`).join('');
    }

    if (state.page === 'home' && el('studentEmail')){
      const existing = localStorage.getItem('sp_student_email_v3') || '';
      el('studentEmail').value = existing;
    }
  }

  function getStudentEmail(){
    const input = el('studentEmail');
    const val = input ? input.value.trim() : '';
    return val || state.draftEmail || '';
  }

  function draftKey(email){
    return `${APP.data.drafts}_${String(email).toLowerCase()}`;
  }

  function saveDraftOnly(){
    const email = getStudentEmail();
    if (!email || !email.includes('@')) return;
    localStorage.setItem('sp_student_email_v3', email);
    saveJson(draftKey(email), {
      email,
      index: state.testIndex,
      answers: state.answers,
      updatedAt: new Date().toISOString()
    });
  }

  function startTest(){
    const email = getStudentEmail();
    if (!email || !email.includes('@')){
      toast('Masukkan email pribadi siswa yang valid.');
      el('studentEmail')?.focus();
      return;
    }
    localStorage.setItem('sp_student_email_v3', email);
    state.draftEmail = email;
    const draft = loadJson(draftKey(email), null);
    state.answers = draft && draft.answers ? draft.answers : {};
    state.testIndex = draft && typeof draft.index === 'number' ? draft.index : 0;
    showPage('test');
    toast('Tes dimulai.');
  }

  function resumeDraft(){
    const email = (el('studentEmail')?.value || '').trim();
    if (!email){
      toast('Masukkan email siswa dulu.');
      return;
    }
    const draft = loadJson(draftKey(email), null);
    if (!draft){
      toast('Belum ada draft untuk email ini.');
      return;
    }
    localStorage.setItem('sp_student_email_v3', email);
    state.draftEmail = email;
    state.answers = draft.answers || {};
    state.testIndex = draft.index || 0;
    showPage('test');
    toast('Draft dibuka.');
  }

  function renderQuestion(){
    const host = el('questionHost');
    if (!host) return;

    const q = state.questions[state.testIndex];
    if (!q){
      host.innerHTML = '<div class="help-box">Belum ada soal. Silakan login admin untuk menambahkan soal.</div>';
      const pb = el('progressBar');
      if (pb) pb.style.width = '0%';
      return;
    }

    const total = state.questions.length;
    const pb = el('progressBar');
    if (pb) pb.style.width = `${((state.testIndex + 1) / total) * 100}%`;

    let content = `
      <div class="question-item" style="border:none;padding:0">
        <div class="section-title" style="margin-bottom:8px">
          <h3>Soal ${state.testIndex + 1} dari ${total}</h3>
          <small>${q.type === 'mcq' ? 'Pilihan ganda' : 'Isian'}</small>
        </div>
        <h4 style="font-size:18px;margin:0 0 8px;line-height:1.5">${esc(q.prompt || '')}</h4>
        ${q.image ? `<img class="q-image" src="${q.image}" alt="Gambar soal">` : ''}
    `;

    if (q.type === 'mcq'){
      const current = state.answers[q.id] || '';
      content += `<div class="option-list">` + q.options.map((opt, idx) => {
        const selected = current === String(idx);
        return `
          <div class="option ${selected ? 'selected' : ''}">
            <label>
              <span style="display:block;width:100%">
                <span style="display:flex;gap:10px;align-items:flex-start;width:100%">
                  <input type="radio" name="answer_${q.id}" value="${idx}" ${selected ? 'checked' : ''} onchange="saveAnswer('${q.id}', this.value)">
                  <span style="display:block">
                    <span>${esc(opt.text)}</span>
                    ${opt.image ? `<img class="answer-thumb" src="${opt.image}" alt="Jawaban bergambar">` : ''}
                  </span>
                </span>
              </span>
            </label>
            <span class="score">Skor ${Number(opt.score || 0)}</span>
          </div>`;
      }).join('') + `</div>`;
    } else {
      const current = state.answers[q.id] || '';
      content += `
        <div class="field" style="margin-top:12px">
          <label for="textAnswer">Jawaban</label>
          <textarea id="textAnswer" placeholder="Tulis jawaban di sini...">${esc(current)}</textarea>
        </div>
        <div class="small">Jawaban akan tersimpan saat berpindah soal atau klik Simpan Progres.</div>
      `;
    }

    content += `</div>`;
    host.innerHTML = content;
    if (el('btnPrevQ')) el('btnPrevQ').disabled = state.testIndex <= 0;
    if (el('btnNextQ')) el('btnNextQ').disabled = state.testIndex >= state.questions.length - 1;
  }

  function showPage(page){
    state.page = page;
    const home = el('pageHome');
    const test = el('pageTest');
    const admin = el('pageAdmin');
    if (home) home.classList.toggle('active', page === 'home');
    if (test) test.classList.toggle('active', page === 'test');
    if (admin) admin.classList.toggle('active', page === 'admin');
    if (page === 'home') renderHome();
    if (page === 'test') renderQuestion();
    if (page === 'admin') renderAdmin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function saveAnswer(qid, val){
    state.answers[qid] = val;
    saveDraftOnly();
  }
  window.saveAnswer = saveAnswer;

  function goQuestion(delta){
    const q = state.questions[state.testIndex];
    if (q && q.type === 'text'){
      const ta = el('textAnswer');
      if (ta) state.answers[q.id] = ta.value;
    }
    saveDraftOnly();
    state.testIndex = Math.max(0, Math.min(state.questions.length - 1, state.testIndex + delta));
    renderQuestion();
  }

  function collectTestData(){
    let total = 0;
    const parts = [];
    for (const q of state.questions){
      const ans = state.answers[q.id];
      if (q.type === 'mcq'){
        const opt = q.options?.[Number(ans)];
        if (opt){
          total += Number(opt.score || 0);
          parts.push(`${q.prompt.slice(0, 26)}: ${opt.text}`);
        } else {
          parts.push(`${q.prompt.slice(0, 26)}: -`);
        }
      } else {
        parts.push(`${q.prompt.slice(0, 26)}: ${String(ans || '-').slice(0, 40)}`);
      }
    }
    return {
      email: getStudentEmail(),
      score: total,
      summary: parts.join(' | ')
    };
  }

  async function sendToSpreadsheet(record){
    const endpoint = (state.config.sheetEndpoint || '').trim();
    if (!endpoint) {
      state.pendingResultQueue.push(record);
      saveAll();
      return false;
    }

    try{
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'SMK PGRI 2 Kediri Psychological Test',
          type: 'result',
          record
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err){
      state.pendingResultQueue.push(record);
      saveAll();
      console.warn('Gagal mengirim ke spreadsheet:', err);
      return false;
    }
  }

  async function retryQueue(){
    if (!state.pendingResultQueue.length || !state.config.sheetEndpoint) return;
    const queue = [...state.pendingResultQueue];
    state.pendingResultQueue = [];
    for (const record of queue){
      try{
        const res = await fetch(state.config.sheetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'SMK PGRI 2 Kediri Psychological Test', type: 'result', record })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        state.pendingResultQueue.push(record);
      }
    }
    saveAll();
  }

  async function submitTest(){
    const email = getStudentEmail();
    if (!email || !email.includes('@')){
      toast('Email siswa tidak valid.');
      return;
    }
    if (!state.questions.length){
      toast('Tidak ada soal untuk dikirim.');
      return;
    }
    const data = collectTestData();
    const record = {
      time: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      email: data.email,
      score: data.score,
      summary: data.summary,
      answers: state.answers,
      submittedAt: new Date().toISOString()
    };
    state.results.push(record);
    saveAll();
    localStorage.removeItem(draftKey(email));
    localStorage.removeItem('sp_student_email_v3');
    await sendToSpreadsheet(record);
    toast('Hasil tes tersimpan dan dikirim.');
    state.answers = {};
    state.testIndex = 0;
    showPage('home');
  }

  function loadSession(){
    state.session = loadJson(APP.data.session, null);
    state.config.sheetEndpoint = state.config.sheetEndpoint || APP.endpointDefault;
  }

  function setSession(role){
    const entry = APP.login[role];
    state.session = {
      email: entry.email,
      role,
      label: entry.label,
      token: uid(),
      loginAt: new Date().toISOString()
    };
    saveAll();
  }

  function logout(){
    state.session = null;
    saveJson(APP.data.session, null);
    localStorage.removeItem(APP.data.session);
    localStorage.removeItem('sp_psikologi_admin_access_v3');
    toast('Sesi admin ditutup.');
    setTimeout(() => {
      if (location.pathname.endsWith('admin.html')){
        location.href = 'index.html';
      } else {
        showPage('home');
      }
    }, 180);
  }

  function requireAdmin(){
    if (!state.session){
      openAdminLogin();
      return false;
    }
    return true;
  }

  function openAdminLogin(){
    const overlay = el('loginOverlay');
    if (overlay){
      overlay.classList.add('show');
      const e = el('adminEmail');
      const p = el('adminPassword');
      if (e) e.value = '';
      if (p) p.value = '';
      setTimeout(() => e && e.focus(), 100);
    }
  }

  function closeAdminLogin(){
    const overlay = el('loginOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  function doLogin(){
    const email = (el('adminEmail')?.value || '').trim();
    const password = el('adminPassword')?.value || '';
    const role = Object.keys(APP.login).find(key => APP.login[key].email === email && APP.login[key].password === password);
    if (!role){
      toast('Login gagal. Cek email dan password.');
      return;
    }
    setSession(role);
    toast(`Masuk sebagai ${APP.login[role].label}`);
    closeAdminLogin();
    if (location.pathname.endsWith('admin.html')){
      renderAdmin();
    } else {
      location.href = 'admin.html';
    }
  }

  function renderAdminTabs(){
    const tabs = $$('#pageAdmin .tab');
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === state.tab));
    const results = el('adminResultsTab');
    const settings = el('adminSettingsTab');
    const questions = el('adminQuestionsTab');
    const branding = el('adminBrandingTab');
    const homepage = el('adminHomepageTab');
    const raw = el('adminRawTab');

    if (results) results.classList.toggle('hidden', state.tab !== 'results');
    if (settings) settings.classList.toggle('hidden', state.tab !== 'settings');

    if (questions) questions.classList.toggle('hidden', state.tab !== 'questions');
    if (branding) branding.classList.toggle('hidden', state.tab !== 'branding');
    if (homepage) homepage.classList.toggle('hidden', state.tab !== 'homepage');
    if (raw) raw.classList.toggle('hidden', state.tab !== 'raw');
  }

  function renderResults(){
    const body = el('resultsTable');
    if (!body) return;
    const rows = state.results.slice().reverse();
    if (!rows.length){
      body.innerHTML = '<tr><td colspan="4">Belum ada hasil tes.</td></tr>';
    } else {
      body.innerHTML = rows.map(r => `
        <tr>
          <td>${esc(r.time)}</td>
          <td>${esc(r.email)}</td>
          <td><b>${Number(r.score || 0)}</b></td>
          <td>${esc(r.summary || '')}</td>
        </tr>
      `).join('');
    }
    const badge = el('resultCountBadge');
    if (badge) badge.textContent = `${state.results.length} hasil`;
  }

  function renderQuestions(){
    const host = el('questionList');
    if (!host) return;
    const list = state.questions;
    if (!list.length){
      host.innerHTML = '<div class="help-box">Belum ada soal. Tambahkan soal pertama dari tombol <b>Tambah Soal</b>.</div>';
    } else {
      host.innerHTML = list.map((q, idx) => `
        <div class="question-item">
          <header>
            <div>
              <h4>${idx + 1}. ${esc(q.prompt || '(Tanpa teks soal)')}</h4>
              <div class="meta">Tipe: ${q.type === 'mcq' ? 'Pilihan ganda' : 'Isian'} · ID: ${q.id}</div>
            </div>
            ${state.session && state.session.role === 'superadmin' ? `
              <div class="row" style="flex:0 0 auto;justify-content:flex-end">
                <button class="btn outline small" onclick="editQuestion('${q.id}')">Edit</button>
                <button class="btn danger small" onclick="deleteQuestion('${q.id}')">Hapus</button>
              </div>` : ''}
          </header>
          ${q.image ? `<img class="q-image" src="${q.image}" alt="Gambar soal">` : ''}
          ${q.type === 'mcq' ? `
            <div class="option-list">
              ${q.options.map(opt => `
                <div class="option">
                  <div style="width:100%">
                    <div>${esc(opt.text)}</div>
                    ${opt.image ? `<img class="answer-thumb" src="${opt.image}" alt="Gambar jawaban">` : ''}
                  </div>
                  <span class="score">Skor ${Number(opt.score || 0)}</span>
                </div>`).join('')}
            </div>
          ` : '<div class="small">Jawaban siswa akan disimpan sebagai teks.</div>'}
        </div>
      `).join('');
    }
    const badge = el('questionCountBadge');
    if (badge) badge.textContent = `${state.questions.length} soal aktif`;
  }

  function renderAdminHeader(){
    const roleLabel = el('adminRoleLabel') || el('superRoleLabel');
    if (roleLabel) roleLabel.textContent = `Peran: ${state.session ? state.session.label : '-'}`;
    const emailLabel = el('adminEmailLabel');
    if (emailLabel) emailLabel.textContent = `Login: ${state.session ? state.session.email : '-'}`;
  }

  function fillAdminSettings(){
    const ep = el('sheetEndpoint');
    const su = el('sheetUrl');
    if (ep) ep.value = state.config.sheetEndpoint || '';
    if (su) su.value = state.config.sheetUrl || '';
  }

  function fillBrandingForm(){
    const b = state.config.branding || DEFAULT_STATE.branding;
    const ids = {
      brandingTitle: b.title,
      brandingSubtitle: b.subtitle,
      primaryColor: b.primaryColor,
      textColor: b.textColor,
      bgColor: b.bgColor,
      heroColor: b.heroColor
    };
    Object.entries(ids).forEach(([id, val]) => {
      const node = el(id);
      if (node) node.value = val;
    });
  }

  function fillHomepageForm(){
    const home = state.config.home || DEFAULT_STATE.home;
    const mapping = {
      homeHeroTitleInput: home.heroTitle,
      homeHeroTextInput: home.heroText,
      homeSummaryBoxInput: home.summaryBox,
      homeFooterBoxInput: home.footerBox,
      homeFeaturesInput: (home.features || []).join('\n'),
      homeGuideInput: home.guide,
      homeCategoryTitleInput: home.categoryTitle,
      homeNewsTitleInput: home.newsTitle,
      homeStatsInput: (home.stats || []).map(x => `${x.num} | ${x.label}`).join('\n'),
      homeCategoriesInput: (home.categories || []).map(x => `${x.title} | ${x.desc} | ${x.count}`).join('\n'),
      homePostsInput: (home.posts || []).map(x => `${x.title} | ${x.body}`).join('\n'),
      homeFaqInput: (home.faq || []).map(x => `${x.q} | ${x.a}`).join('\n'),
      homeHeroPillsInput: (home.heroPills || []).join('\n')
    };
    Object.entries(mapping).forEach(([id, val]) => {
      const node = el(id);
      if (node) node.value = val;
    });
  }

  function renderSiteJson(){
    const node = el('siteJsonEditor');
    if (node) node.value = JSON.stringify(state.config, null, 2);
  }

  function parseLinesToPairs(text){
    return String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
  }

  function parseDelimitedLine(line, expected){
    const parts = line.split('|').map(x => x.trim());
    while (parts.length < expected) parts.push('');
    return parts.slice(0, expected);
  }

  function saveAdminSettings(){
    const ep = el('sheetEndpoint');
    const su = el('sheetUrl');
    if (ep) state.config.sheetEndpoint = ep.value.trim();
    if (su) state.config.sheetUrl = su.value.trim();
    saveAll();
    toast('Pengaturan spreadsheet disimpan.');
  }

  function saveBranding(){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang dapat mengubah branding.');
      return;
    }
    const b = state.config.branding;
    b.title = el('brandingTitle')?.value.trim() || b.title;
    b.subtitle = el('brandingSubtitle')?.value.trim() || b.subtitle;
    b.primaryColor = el('primaryColor')?.value || b.primaryColor;
    b.textColor = el('textColor')?.value || b.textColor;
    b.bgColor = el('bgColor')?.value || b.bgColor;
    b.heroColor = el('heroColor')?.value || b.heroColor;
    saveAll();
    applyBranding();
    renderHome();
    toast('Branding disimpan.');
  }

  function saveHomepage(){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang dapat mengubah beranda.');
      return;
    }
    const home = state.config.home;
    home.heroTitle = el('homeHeroTitleInput')?.value.trim() || home.heroTitle;
    home.heroText = el('homeHeroTextInput')?.value.trim() || home.heroText;
    home.summaryBox = el('homeSummaryBoxInput')?.value.trim() || home.summaryBox;
    home.footerBox = el('homeFooterBoxInput')?.value.trim() || home.footerBox;
    home.categoryTitle = el('homeCategoryTitleInput')?.value.trim() || home.categoryTitle;
    home.newsTitle = el('homeNewsTitleInput')?.value.trim() || home.newsTitle;
    home.guide = el('homeGuideInput')?.value.trim() || home.guide;

    const feats = parseLinesToPairs(el('homeFeaturesInput')?.value);
    if (feats.length) home.features = feats;

    const pills = parseLinesToPairs(el('homeHeroPillsInput')?.value);
    if (pills.length) home.heroPills = pills;

    const statsLines = parseLinesToPairs(el('homeStatsInput')?.value);
    if (statsLines.length){
      home.stats = statsLines.map(line => {
        const [num,label] = parseDelimitedLine(line, 2);
        return { num, label };
      }).filter(x => x.num || x.label);
    }

    const categoryLines = parseLinesToPairs(el('homeCategoriesInput')?.value);
    if (categoryLines.length){
      home.categories = categoryLines.map(line => {
        const [title, desc, count] = parseDelimitedLine(line, 3);
        return { title, desc, count };
      }).filter(x => x.title || x.desc || x.count);
    }

    const postLines = parseLinesToPairs(el('homePostsInput')?.value);
    if (postLines.length){
      home.posts = postLines.map(line => {
        const [title, body] = parseDelimitedLine(line, 2);
        return { title, body };
      }).filter(x => x.title || x.body);
    }

    const faqLines = parseLinesToPairs(el('homeFaqInput')?.value);
    if (faqLines.length){
      home.faq = faqLines.map(line => {
        const [q, a] = parseDelimitedLine(line, 2);
        return { q, a };
      }).filter(x => x.q || x.a);
    }

    saveAll();
    renderHome();
    toast('Konten beranda disimpan.');
  }

  function saveSiteJson(){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang dapat menyimpan JSON situs.');
      return;
    }
    const node = el('siteJsonEditor');
    if (!node) return;
    try{
      state.config = JSON.parse(node.value);
      saveAll();
      applyBranding();
      renderHome();
      renderAdmin();
      toast('JSON situs disimpan.');
    } catch(err){
      toast('JSON tidak valid. Periksa tanda kurung dan koma.');
    }
  }

  function reloadSiteJson(){
    renderSiteJson();
    toast('JSON situs dimuat ulang.');
  }

  function resetBranding(){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang dapat mereset branding.');
      return;
    }
    state.config.branding = clone(DEFAULT_STATE.branding);
    saveAll();
    applyBranding();
    fillBrandingForm();
    renderHome();
    toast('Branding direset.');
  }

  async function fileToDataUrl(file){
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function setQuestionModal(q){
    const title = el('questionModalTitle');
    if (title) title.textContent = q ? 'Edit Soal' : 'Tambah Soal';
    if (el('qPrompt')) el('qPrompt').value = q?.prompt || '';
    if (el('qType')) el('qType').value = q?.type || 'mcq';
    if (el('qImageUrl')) el('qImageUrl').value = q?.image && q.image.startsWith('http') ? q.image : '';
    state.pendingQuestionImage = q?.image || '';
    const mcq = el('mcqEditor');
    const text = el('textEditor');
    if (mcq) mcq.classList.toggle('hidden', q?.type === 'text');
    if (text) text.classList.toggle('hidden', q?.type !== 'text');
    renderOptionEditor(q?.options?.length ? q.options : [
      { text: '', score: 0, image: '' },
      { text: '', score: 1, image: '' },
      { text: '', score: 2, image: '' },
      { text: '', score: 3, image: '' }
    ]);
  }

  function openQuestionModal(editId=null){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang bisa menambah atau mengubah soal.');
      return;
    }
    state.editingQuestionId = editId;
    const q = editId ? state.questions.find(x => x.id === editId) : null;
    setQuestionModal(q);
    el('questionModalBackdrop')?.classList.add('show');
  }

  function closeQuestionModal(){
    el('questionModalBackdrop')?.classList.remove('show');
  }

  function renderOptionEditor(options){
    const host = el('optionEditor');
    if (!host) return;
    host.innerHTML = (options && options.length ? options : [{ text:'', score:0, image:'' }]).map((opt, idx) => `
      <div class="choice-row">
        <div class="field" style="margin:0">
          <label>Teks opsi ${idx + 1}</label>
          <input class="input opt-text" placeholder="Teks opsi ${idx + 1}" value="${esc(opt.text || '')}">
        </div>
        <div class="field" style="margin:0">
          <label>Skor</label>
          <input class="input opt-score" type="number" min="0" step="1" value="${Number(opt.score || 0)}">
        </div>
        <div class="field" style="margin:0">
          <label>Gambar jawaban</label>
          <input class="input opt-image-url" type="url" placeholder="URL gambar (opsional)" value="${esc(opt.image && opt.image.startsWith('http') ? opt.image : '')}">
          <input class="input opt-image-file" type="file" accept="image/*" onchange="handleOptionImageFile(this)">
          <input type="hidden" class="opt-image-data" value="${esc(opt.image && opt.image.startsWith('data:') ? opt.image : '')}">
          ${opt.image ? `<img class="answer-thumb answer-thumb-inline" src="${opt.image}" alt="Preview gambar jawaban">` : ''}
        </div>
        <div class="field" style="margin:0">
          <label>Aksi</label>
          <button class="btn danger small" type="button" onclick="removeOptionRow(this)">Hapus</button>
        </div>
      </div>
    `).join('');
  }

  function removeOptionRow(btn){
    btn.closest('.choice-row')?.remove();
  }
  window.removeOptionRow = removeOptionRow;

  async function handleOptionImageFile(input){
    const file = input.files && input.files[0];
    const row = input.closest('.choice-row');
    if (!file || !row) return;
    const data = await fileToDataUrl(file);
    row.querySelector('.opt-image-data').value = data;
    row.querySelector('.opt-image-url').value = '';
    let img = row.querySelector('.answer-thumb-inline');
    if (!img){
      img = document.createElement('img');
      img.className = 'answer-thumb answer-thumb-inline';
      row.querySelector('.field:nth-child(3)').appendChild(img);
    }
    img.src = data;
    img.alt = 'Preview gambar jawaban';
  }
  window.handleOptionImageFile = handleOptionImageFile;

  function gatherOptions(){
    return $$('#optionEditor .choice-row').map(row => {
      const text = row.querySelector('.opt-text').value.trim();
      const score = Number(row.querySelector('.opt-score').value || 0);
      const url = row.querySelector('.opt-image-url').value.trim();
      const data = row.querySelector('.opt-image-data').value.trim();
      return { text, score, image: data || url };
    }).filter(x => x.text || x.image);
  }

  async function saveQuestion(){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang bisa menyimpan soal.');
      return;
    }
    const prompt = el('qPrompt').value.trim();
    const type = el('qType').value;
    if (!prompt){
      toast('Teks soal belum diisi.');
      return;
    }
    let image = state.pendingQuestionImage || el('qImageUrl').value.trim();
    if (el('qImageFile').files && el('qImageFile').files[0]){
      image = await fileToDataUrl(el('qImageFile').files[0]);
    }

    const question = {
      id: state.editingQuestionId || uid(),
      type,
      prompt,
      image,
      options: type === 'mcq' ? gatherOptions() : []
    };

    if (type === 'mcq' && question.options.length < 2){
      toast('Pilihan ganda minimal 2 opsi.');
      return;
    }

    if (state.editingQuestionId){
      state.questions = state.questions.map(q => q.id === state.editingQuestionId ? question : q);
    } else {
      state.questions.push(question);
    }
    saveAll();
    renderQuestions();
    renderHome();
    closeQuestionModal();
    toast('Soal berhasil disimpan.');
  }

  function editQuestion(id){ openQuestionModal(id); }
  function deleteQuestion(id){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang bisa menghapus soal.');
      return;
    }
    if (!confirm('Hapus soal ini?')) return;
    state.questions = state.questions.filter(q => q.id !== id);
    saveAll();
    renderQuestions();
    renderHome();
    toast('Soal dihapus.');
  }
  window.editQuestion = editQuestion;
  window.deleteQuestion = deleteQuestion;

  function renderAdminSettingsVisibility(){
    const role = state.session?.role;
    const canEdit = role === 'superadmin';
    const sections = ['adminQuestionsTab', 'adminBrandingTab', 'adminHomepageTab', 'adminRawTab'];
    sections.forEach(id => {
      const node = el(id);
      if (node) node.style.display = canEdit ? '' : 'none';
    });
  }

  function renderAdmin(){
    if (!state.session){
      openAdminLogin();
      return;
    }
    renderAdminHeader();
    fillAdminSettings();
    renderAdminTabs();
    renderResults();
    renderQuestions();
    if (state.session.role === 'superadmin'){
      fillBrandingForm();
      fillHomepageForm();
      renderSiteJson();
    }
    renderAdminSettingsVisibility();
    retryQueue();
  }

  function openSpreadsheet(){
    const url = state.config.sheetUrl || '';
    if (!url){
      toast('URL spreadsheet belum diisi.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  function initHome(){
    applyBranding();
    renderHome();
    retryQueue();

    const btnStart = el('btnStartStudent');
    if (btnStart) btnStart.addEventListener('click', startTest);
    const btnResume = el('btnResumeDraft');
    if (btnResume) btnResume.addEventListener('click', resumeDraft);
    const btnQuick = el('btnStudentQuick');
    if (btnQuick) btnQuick.addEventListener('click', startTest);

    const btnOpenAdmin = el('btnAdminLogin');
    if (btnOpenAdmin) btnOpenAdmin.addEventListener('click', openAdminLogin);
    const btnHome = el('btnHome');
    if (btnHome) btnHome.addEventListener('click', () => showPage('home'));

    if (el('btnBackHomeFromTest')) el('btnBackHomeFromTest').addEventListener('click', () => showPage('home'));
    if (el('btnPrevQ')) el('btnPrevQ').addEventListener('click', () => goQuestion(-1));
    if (el('btnNextQ')) el('btnNextQ').addEventListener('click', () => goQuestion(1));
    if (el('btnSaveDraft')) el('btnSaveDraft').addEventListener('click', () => { saveDraftOnly(); toast('Progres disimpan.'); });
    if (el('btnFinishTest')) el('btnFinishTest').addEventListener('click', () => {
      const q = state.questions[state.testIndex];
      if (q && q.type === 'text'){
        const ta = el('textAnswer');
        if (ta) state.answers[q.id] = ta.value;
      }
      submitTest();
    });

    if (el('loginOverlay')){
      el('loginOverlay').addEventListener('click', e => { if (e.target === el('loginOverlay')) closeAdminLogin(); });
    }
    if (el('btnCloseLogin')) el('btnCloseLogin').addEventListener('click', closeAdminLogin);
    if (el('btnDoLogin')) el('btnDoLogin').addEventListener('click', doLogin);

    if (el('btnBackHomeFromAdmin')) el('btnBackHomeFromAdmin').addEventListener('click', () => { logout(); });
    if (el('btnBackHomeFromSuper')) el('btnBackHomeFromSuper').addEventListener('click', () => { logout(); });

    showPage('home');
    localStorage.setItem('sp_student_email_v3', localStorage.getItem('sp_student_email_v3') || '');
  }

  function initAdmin(){
    loadSession();
    applyBranding();
    if (!state.session){
      openAdminLogin();
    } else {
      renderAdmin();
    }

    if (el('loginOverlay')){
      el('loginOverlay').addEventListener('click', e => { if (e.target === el('loginOverlay')) closeAdminLogin(); });
    }
    if (el('btnCloseLogin')) el('btnCloseLogin').addEventListener('click', closeAdminLogin);
    if (el('btnDoLogin')) el('btnDoLogin').addEventListener('click', doLogin);

    if (el('btnLogoutAdmin')) el('btnLogoutAdmin').addEventListener('click', logout);
    if (el('btnLogoutSuper')) el('btnLogoutSuper').addEventListener('click', logout);

    if (el('btnBackHomeFromAdmin')) el('btnBackHomeFromAdmin').addEventListener('click', logout);
    if (el('btnBackHomeFromSuper')) el('btnBackHomeFromSuper').addEventListener('click', logout);

    if (el('btnExportCSV')) el('btnExportCSV').addEventListener('click', exportCSV);
    if (el('btnSyncNow')) el('btnSyncNow').addEventListener('click', syncNow);
    if (el('btnOpenSpreadsheet')) el('btnOpenSpreadsheet').addEventListener('click', openSpreadsheet);
    if (el('btnSaveAdminSettings')) el('btnSaveAdminSettings').addEventListener('click', saveAdminSettings);
    if (el('btnTestEndpoint')) el('btnTestEndpoint').addEventListener('click', testEndpoint);

    if (el('btnSaveBranding')) el('btnSaveBranding').addEventListener('click', saveBranding);
    if (el('btnResetBranding')) el('btnResetBranding').addEventListener('click', resetBranding);
    if (el('brandingLogoFile')) el('brandingLogoFile').addEventListener('change', e => handleBrandingUpload(e.target, 'logoData'));
    if (el('brandingBackgroundFile')) el('brandingBackgroundFile').addEventListener('change', e => handleBrandingUpload(e.target, 'backgroundData'));
    if (el('btnSaveHomepage')) el('btnSaveHomepage').addEventListener('click', saveHomepage);
    if (el('btnSaveSiteJson')) el('btnSaveSiteJson').addEventListener('click', saveSiteJson);
    if (el('btnReloadSiteJson')) el('btnReloadSiteJson').addEventListener('click', reloadSiteJson);

    if (el('btnAddQuestion')) el('btnAddQuestion').addEventListener('click', () => openQuestionModal());
    if (el('btnSaveQuestion')) el('btnSaveQuestion').addEventListener('click', saveQuestion);
    if (el('btnCloseQuestionModal')) el('btnCloseQuestionModal').addEventListener('click', closeQuestionModal);
    if (el('questionModalBackdrop')) el('questionModalBackdrop').addEventListener('click', e => { if (e.target === el('questionModalBackdrop')) closeQuestionModal(); });
    if (el('btnAddOption')) el('btnAddOption').addEventListener('click', addOptionRow);
    if (el('qType')) el('qType').addEventListener('change', e => {
      const type = e.target.value;
      const mcq = el('mcqEditor');
      const text = el('textEditor');
      if (mcq) mcq.classList.toggle('hidden', type !== 'mcq');
      if (text) text.classList.toggle('hidden', type !== 'text');
    });

    $$('#pageAdmin .tab').forEach(btn => btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      renderAdminTabs();
      renderAdminSettingsVisibility();
    }));
    $$('#pageAdmin .tab[data-super-tab]').forEach(btn => btn.addEventListener('click', () => {
      state.superTab = btn.dataset.superTab;
      renderAdminTabs();
      renderAdminSettingsVisibility();
    }));

    renderAdmin();
  }

  async function handleBrandingUpload(input, key){
    if (!state.session || state.session.role !== 'superadmin'){
      toast('Hanya super admin yang bisa mengubah branding.');
      input.value = '';
      return;
    }
    const file = input.files && input.files[0];
    if (!file) return;
    const data = await fileToDataUrl(file);
    state.config.branding[key] = data;
    saveAll();
    applyBranding();
    toast(key === 'logoData' ? 'Logo diperbarui.' : 'Background diperbarui.');
  }

  function exportCSV(){
    if (!state.results.length){
      toast('Belum ada data untuk diekspor.');
      return;
    }
    const headers = ['time','email','score','summary'];
    const rows = state.results.map(r => headers.map(h => `"${String(r[h] ?? '').replaceAll('"','""')}"`).join(','));
    downloadFile('rekap_tes_psikologi.csv', [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8;');
  }

  function downloadFile(filename, content, mime){
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

  function syncNow(){
    if (!state.config.sheetEndpoint){
      toast('Isi spreadsheet endpoint dulu.');
      return;
    }
    sendBulkToSpreadsheet().then(ok => toast(ok ? 'Data dikirim ulang ke spreadsheet.' : 'Gagal mengirim ke spreadsheet.'));
  }

  async function sendBulkToSpreadsheet(){
    try{
      const res = await fetch(state.config.sheetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'SMK PGRI 2 Kediri Psychological Test',
          type: 'bulk-results',
          results: state.results
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    }catch(err){
      console.warn(err);
      return false;
    }
  }

  function testEndpoint(){
    if (!state.config.sheetEndpoint){
      toast('Masukkan URL endpoint terlebih dahulu.');
      return;
    }
    fetch(state.config.sheetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ping', time: new Date().toISOString() })
    })
    .then(res => toast(`Tes endpoint terkirim. Status: ${res.status}`))
    .catch(() => toast('Tes endpoint gagal.'));
  }

  function renderAdminSettingsVisibility(){
    const canEdit = state.session && state.session.role === 'superadmin';
    const show = id => { const node = el(id); if (node) node.classList.toggle('hidden', !canEdit); };
    show('adminQuestionsTab');
    show('adminBrandingTab');
    show('adminHomepageTab');
    show('adminRawTab');
    $$('#pageAdmin .tab[data-super-tab]').forEach(btn => btn.classList.toggle('hidden', !canEdit));
  }

  function openSpreadsheetIfAny(){
    if (state.config.sheetUrl) window.open(state.config.sheetUrl, '_blank', 'noopener');
  }

  function attachGlobal(){
    window.openQuestionModal = openQuestionModal;
    window.handleBrandingUpload = handleBrandingUpload;
  }

  function init(){
    loadSession();
    if (state.page === 'home'){
      initHome();
    } else if (state.page === 'admin'){
      initAdmin();
    }
    attachGlobal();
    if (state.page === 'home'){
      renderHome();
    }
    if (state.page === 'admin'){
      renderAdmin();
    }
  }

  // admin page extra helpers
  function renderAdminTabs(){
    const activeTab = state.tab;
    const tabs = $$('#pageAdmin .tab[data-tab]');
    const superTabs = $$('#pageAdmin .tab[data-super-tab]');
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === activeTab));
    superTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.superTab === state.superTab));
    const nodes = {
      results: el('adminResultsTab'),
      settings: el('adminSettingsTab'),
      questions: el('adminQuestionsTab'),
      branding: el('adminBrandingTab'),
      homepage: el('adminHomepageTab'),
      raw: el('adminRawTab')
    };
    Object.entries(nodes).forEach(([name,node]) => {
      if (!node) return;
      if (name === 'results' || name === 'settings'){
        node.classList.toggle('hidden', activeTab !== name);
      } else {
        node.classList.toggle('hidden', state.superTab !== name);
      }
    });
    if (activeTab === 'results' || activeTab === 'settings'){
      renderResults();
    }
    if (state.superTab === 'questions'){
      renderQuestions();
    }
    if (state.superTab === 'branding'){
      fillBrandingForm();
    }
    if (state.superTab === 'homepage'){
      fillHomepageForm();
    }
    if (state.superTab === 'raw'){
      renderSiteJson();
    }
  }

  function fillAdminAll(){
    fillAdminSettings();
    renderResults();
    renderQuestions();
    if (state.session && state.session.role === 'superadmin'){
      fillBrandingForm();
      fillHomepageForm();
      renderSiteJson();
    }
  }

  function renderAdmin(){
    if (!state.session){
      openAdminLogin();
      return;
    }
    renderAdminHeader();
    fillAdminAll();
    renderAdminSettingsVisibility();
    renderAdminTabs();
    retryQueue();
  }

  function renderAdminHeader(){
    const node = el('adminEmailLabel');
    if (node) node.textContent = `Login: ${state.session ? state.session.email : '-'}`;
    const label = el('adminRoleLabel') || el('superRoleLabel');
    if (label) label.textContent = `Peran: ${state.session ? state.session.label : '-'}`;
    if (el('sheetUrlValue')) el('sheetUrlValue').textContent = state.config.sheetUrl || '-';
    if (el('sheetEndpointValue')) el('sheetEndpointValue').textContent = state.config.sheetEndpoint || '-';
  }

  function fillAdminSettings(){
    if (el('sheetEndpoint')) el('sheetEndpoint').value = state.config.sheetEndpoint || '';
    if (el('sheetUrl')) el('sheetUrl').value = state.config.sheetUrl || '';
  }

  function syncSessionRedirect(){
    if (state.page === 'admin' && !state.session){
      openAdminLogin();
    }
  }

  function openSpreadsheetButton(){
    const btn = el('btnOpenSpreadsheet');
    if (btn) btn.addEventListener('click', openSpreadsheetIfAny);
  }

  function openSpreadsheetIfAny(){
    const url = state.config.sheetUrl || '';
    if (!url){
      toast('URL spreadsheet belum diisi.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  // Expose / bind the few functions referenced inline
  window.editQuestion = editQuestion;
  window.deleteQuestion = deleteQuestion;
  window.saveAnswer = saveAnswer;
  window.removeOptionRow = removeOptionRow;
  window.handleOptionImageFile = handleOptionImageFile;

  // page-specific bindings after DOM ready
    init();

})();
