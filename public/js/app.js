/**
 * 川渝麻研社 PWA — 主应用
 * vanilla JS SPA：hash 路由 + localStorage 进度
 * 业务规则与小程序版一致：每题型免费 15 题，答对记完成
 */

const APP_VERSION = 'v0.6.4';
const FREE_LIMIT = 15;
const STORE_KEYS = {
  COMPLETED: 'cymys_completedQuestions',
  ACTIVATED: 'cymys_activation_status',
  DEVICE_ID: 'cymys_deviceId',
};

// ---------- 题库加载 ----------

let questionCache = null;

function loadQuestions() {
  if (!questionCache) {
    const result = parseAndValidateCSV(QUESTIONS_CSV);
    if (result.errors.length) console.warn('CSV 校验提示:', result.errors);
    questionCache = result.data;
    console.log(`题库加载完成：${questionCache.length} 题`);
  }
  return questionCache;
}

function questionsByType(type) {
  return loadQuestions().filter(q => q.type === type);
}

// ---------- 本地存储 ----------

function getCompleted() {
  try { return JSON.parse(localStorage.getItem(STORE_KEYS.COMPLETED)) || []; }
  catch { return []; }
}

function saveCompleted(list) {
  localStorage.setItem(STORE_KEYS.COMPLETED, JSON.stringify(list));
}

function isCompleted(id) {
  return getCompleted().includes(id);
}

function completeQuestion(id) {
  const list = getCompleted();
  if (!list.includes(id)) { list.push(id); saveCompleted(list); }
}

function completedCount(type) {
  return getCompleted().filter(id => id.startsWith(type === 'basic' ? 'J' : 'Y')).length;
}

function isActivated() {
  // 激活码体系已退役：全站免费，新题额度由 DaoBox 统一配额管理
  return true;
}

function getDeviceId() {
  let id = localStorage.getItem(STORE_KEYS.DEVICE_ID);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    localStorage.setItem(STORE_KEYS.DEVICE_ID, id);
  }
  return id;
}

// ---------- 视图渲染工具 ----------

const $view = document.getElementById('view');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function tileImage(name) {
  return `assets/mahjong/${name}.jpg`;
}

/** 按花色分排（与小程序版逻辑一致：花色分组，按牌数降序，最多两排） */
function organizeTileRows(tiles) {
  const groups = { l: [], t: [], w: [] };
  tiles.forEach(name => {
    const suit = name.charAt(0);
    (groups[suit] || groups.l).push(name);
  });
  const sorted = Object.values(groups).filter(g => g.length > 0)
    .sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [sorted[0]];
  return [sorted[0], [...sorted[1], ...(sorted[2] || [])]];
}

// ---------- 页面：擂台（拆搭闯关） ----------

function renderPractice() {
  const activated = isActivated();
  const types = [
    { type: 'basic', label: '基础题', cls: 'easy' },
    { type: 'error_prone', label: '易错题', cls: 'hard' },
  ];

  const cards = types.map(({ type, label, cls }) => {
    const qs = questionsByType(type);
    const done = completedCount(type);
    const total = qs.length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const locked = !activated && done >= FREE_LIMIT;
    const nextQ = qs.find(q => !isCompleted(q.id)) || qs[0];

    return `
      <div class="question-card ${cls}">
        <div class="card-head">
          <span class="card-title">${label}</span>
          <span class="card-count">${done}/${total} 题已完成</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <button class="btn-start" data-action="start" data-type="${type}" ${locked ? 'disabled' : ''}>
          ${locked ? '免费额度已用完' : done === 0 ? '开始练习' : done >= total ? '再练一遍' : '继续练习'}
        </button>
      </div>`;
  }).join('');

  const freeTip = activated ? '' : `
    <div class="free-tip">
      未激活：每题型免费 ${FREE_LIMIT} 题（基础题剩 ${Math.max(0, FREE_LIMIT - completedCount('basic'))} / 易错题剩 ${Math.max(0, FREE_LIMIT - completedCount('error_prone'))}）
    </div>`;

  $view.innerHTML = `
    <div class="page">
      <header class="page-header home-head">
        <div>
          <h1>拆搭闯关</h1>
          <p class="subtitle">精选拆搭训练，提高川麻技巧</p>
        </div>
        <span class="ver">${APP_VERSION}</span>
      </header>
      ${freeTip}
      <div class="cards">${cards}</div>
    </div>`;
}

// ---------- 页面：答题 ----------

function renderQuestion(type, indexParam) {
  const qs = questionsByType(type);
  const activated = isActivated();

  // 定位当前题：无参数 → 第一道未完成（全完成则第 1 题）
  let index;
  if (indexParam) {
    // hash 参数是 1-based 题号 → 内部 0-based 下标
    index = Math.min(Math.max((parseInt(indexParam, 10) || 1) - 1, 0), qs.length - 1);
  } else {
    const firstUn = qs.findIndex(q => !isCompleted(q.id));
    index = firstUn === -1 ? 0 : firstUn;
  }
  const current = qs[index];
  const done = isCompleted(current.id);

  // 免费额度：未激活且已答满 15 题，不能再答新题（已完成的题可回看）
  if (!activated && !done && completedCount(type) >= FREE_LIMIT) {
    $view.innerHTML = `
      <div class="page center">
        <div class="modal-card">
          <div class="modal-icon">🔐</div>
          <h2>免费额度已用完</h2>
          <p>每题型可免费体验 ${FREE_LIMIT} 题，激活注册码后解锁全部 ${qs.length} 题</p>
          <button class="btn-start" data-action="goto-activate">输入注册码激活</button>
          <button class="btn-back" data-action="nav" data-to="#/home">返回</button>
        </div>
      </div>`;
    return;
  }

  const rows = organizeTileRows(current.tiles).map(row => `
    <div class="tile-row">${row.map(name =>
      `<img class="tile-img" src="${tileImage(name)}" alt="${esc(name)}" loading="eager" decoding="async" draggable="false">`).join('')}
    </div>`).join('');

  // 选项：做过 → 复习模式（高亮正确答案、禁点）；没做 → 可答
  const optionBtns = current.options.map((opt, slot) => {
    if (!opt) return '';
    const reviewRight = done && slot === current.correctOption ? ' right' : '';
    return `
      <button class="option-btn${reviewRight}" data-action="answer" data-slot="${slot}" data-opt="${esc(opt)}" ${done ? 'disabled' : ''}>
        <img class="option-img" src="${tileImage(opt)}" alt="${esc(opt)}" loading="eager" decoding="async" draggable="false">
        <span class="option-label">${'ABCD'[slot]}</span>
      </button>`;
  }).join('');

  // 上一题/下一题
  const prevBtn = index > 0
    ? `<button class="q-nav-btn" data-action="navq" data-type="${type}" data-index="${index}">‹ 上一题</button>`
    : `<span></span>`;
  const nextBtn = index < qs.length - 1
    ? `<button class="q-nav-btn primary" data-action="navq" data-type="${type}" data-index="${index + 2}">下一题 ›</button>`
    : `<span class="q-nav-end">已是最后一题</span>`;

  // 复习模式直接展示解析
  const reviewBox = done ? `
    <div class="answer-result">
      <div class="result correct">
        <p class="result-text">✓ 已完成（复习模式）</p>
        ${current.explanation ? `<div class="explanation"><b>答题思路：</b>${esc(current.explanation)}</div>` : ''}
      </div>
    </div>` : '';

  $view.innerHTML = `
    <div class="page q-flow" id="question-page" data-type="${type}" data-id="${esc(current.id)}"
         data-correct="${current.correctOption}" data-index="${index}">
      <header class="page-header question-header">
        <button class="btn-back" data-action="nav" data-to="#/home">‹ 返回</button>
        <h1>${esc(current.title)}</h1>
        <span class="q-index">第${index + 1}题</span>
      </header>
      <p class="q-desc">${esc(current.description)}</p>
      <div class="tiles">${rows}</div>
      <p class="q-prompt">选择要打出的牌：</p>
      <div class="options">${optionBtns}</div>
      ${reviewBox}
      <div class="answer-result" id="answer-result"></div>
      <div class="q-nav">${prevBtn}${nextBtn}</div>
    </div>`;
}

async function handleAnswer(slot) {
  const page = document.getElementById('question-page');
  const correct = page.dataset.correct === slot;
  const type = page.dataset.type;
  const qid = page.dataset.id;
  const idx = parseInt(page.dataset.index, 10);
  const resultBox = document.getElementById('answer-result');

  if (navigator.vibrate) navigator.vibrate(correct ? 30 : [60, 40, 60]);

  if (correct) {
    const isNew = !isCompleted(qid);
    if (isNew) {
      try {
        await DaoBox.consume('practice', 1);
      } catch (e) {
        if (e && e.quota) {
          DaoBox.showQuotaModal(e.data);
          resultBox.innerHTML = '<div class="result wrong"><p class="result-text">今日新题额度已用完，注册登录享 3 倍，明天再来～</p></div>';
          page.querySelectorAll('.option-btn').forEach(b => { b.disabled = true; });
          return;
        }
        throw e;
      }
    }
    completeQuestion(qid);
    const q = questionsByType(type).find(x => x.id === qid);
    const done = completedCount(type);
    const total = questionsByType(type).length;

    // 底部导航栏已有"下一题"，结果卡不再重复放按钮
    resultBox.innerHTML = `
      <div class="result correct">
        <p class="result-text">✅ 回答正确！（${done}/${total}）${idx >= total - 1 ? '　本题型全部完成 🎉' : ''}</p>
        ${q.explanation ? `<div class="explanation"><b>答题思路：</b>${esc(q.explanation)}</div>` : ''}
      </div>`;
    page.querySelectorAll('.option-btn').forEach(b => { b.disabled = true; b.classList.remove('wrong'); });
    const rightBtn = page.querySelector(`.option-btn[data-slot="${page.dataset.correct}"]`);
    if (rightBtn) rightBtn.classList.add('right');
  } else {
    // 单选语义：清掉旧红框，只标最新选错的那个；不锁死按钮，可继续换选
    page.querySelectorAll('.option-btn').forEach(b => b.classList.remove('wrong'));
    const btn = page.querySelector(`.option-btn[data-slot="${slot}"]`);
    if (btn) btn.classList.add('wrong');
    resultBox.innerHTML = `<div class="result wrong"><p class="result-text">不对，再想想～</p></div>`;
  }
}

// ---------- 页面：茶馆（内容 hub） ----------

function renderTeahouse() {
  const qs = questionsByType('basic');
  const firstUn = qs.find(q => !isCompleted(q.id));
  const todayIndex = Math.floor(Date.now() / 86400000) % HANGHUA.length;
  const term = HANGHUA[todayIndex];

  // 今日一题
  const dailyCard = firstUn ? `
    <div class="daily-card" data-action="start" data-type="basic" role="button">
      <div class="daily-left">
        <span class="daily-label">今日一题</span>
        <b>${esc(firstUn.title)}</b>
      </div>
      <span class="daily-go">开练 ›</span>
    </div>` : `
    <div class="daily-card done" data-action="navq-jump" role="button">
      <div class="daily-left"><span class="daily-label">今日一题</span><b>今日题目已全部完成 🎉</b></div>
    </div>`;

  const svg = {
    practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',
    paijing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/><path d="M9 7.5h7M9 11h5"/></svg>',
    paipu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="9" height="14" rx="1.8"/><rect x="10" y="4" width="9" height="14" rx="1.8"/><path d="M13.5 8h2.5M13.5 11.5h2.5" stroke-width="1.4"/></svg>',
    shuchang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none"/></svg>',
  };
  const pillars = [
    { to: '#/practice', icon: svg.practice, title: '拆搭练习', desc: '川麻拆搭与听牌闯关，每日一题练手感，逐步提高实战判断力。', sub: `${completedCount('basic') + completedCount('error_prone')} 题已完成`, accent: '#1a6b3c' },
    { to: '#/paijing', icon: svg.paijing, title: '牌经', desc: '牌理课堂系统讲解打法思路，从基础规则到进阶技巧，循序渐进。', sub: `${PAIJING.length} 课`, accent: '#8a5a2b' },
    { to: '#/paipu', icon: svg.paipu, title: '牌谱', desc: '常见牌型图鉴与解析，配牌面示意和行牌思路，遇到类似局面有参考。', sub: `${PAIPU.length} 种牌型`, accent: '#8a2f2b' },
    { to: '#/shuchang', icon: svg.shuchang, title: '书场', desc: '视频讲堂由浅入深讲解川麻打法，配合实战案例更容易理解吸收。', sub: VIDEOS.length ? '陆续开讲' : '筹备中', accent: '#2b5f8a' },
  ];

  $view.innerHTML = `
    <div class="page">
      <header class="page-header home-head">
        <div><h1>川麻茶馆</h1><p class="subtitle">围炉论牌，且吃茶来</p></div>
        <span class="ver">${APP_VERSION}</span>
      </header>
      ${dailyCard}
      <div class="hub-cards">
        ${pillars.map(p => `
          <div class="pillar-card" data-action="nav" data-to="${p.to}" role="button" style="--accent:${p.accent}">
            <span class="pillar-icon">${p.icon}</span>
            <div class="pillar-body">
              <b>${p.title}</b>
              ${p.desc ? `<span class="pillar-desc">${p.desc}</span>` : ''}
              <span class="pillar-sub">${p.sub}</span>
            </div>
            <span class="pillar-arrow">›</span>
          </div>`).join('')}
      </div>
      <div class="term-daily" data-action="nav" data-to="#/hanghua" role="button">
        <span class="term-tag">今日行话</span>
        <div class="term-body">
          <b>${esc(term.term)}</b>
          <span class="term-py">${esc(term.pinyin)}</span>
          <p>${esc(term.meaning)}</p>
        </div>
      </div>
      <p style="text-align:center;margin:16px 0 0;"><a href="https://daobox.app?src=cymys" style="color:inherit;text-decoration:none;border-bottom:1px solid currentColor;">← 返回 DaoBox 工具箱</a></p>
      <p class="disclaimer">本站为麻将学习交流工具，仅供娱乐，不涉及任何博彩行为。理性游戏，未满18周岁不建议使用。</p>
    </div>`;
}

// ---------- 页面：牌谱（常见牌型） ----------

function renderPaipu(id) {
  if (id) {
    const item = PAIPU.find(p => p.id === id);
    if (!item) { location.hash = '#/paipu'; return; }
    const rows = organizeTileRows(item.tiles);
    $view.innerHTML = `
      <div class="page">
        <header class="page-header question-header">
          <button class="btn-back" data-action="nav" data-to="#/paipu">‹ 图鉴</button>
          <h1>${esc(item.name)}</h1>
          <span class="fan-badge">${esc(item.fan)}</span>
        </header>
        ${item.tags && item.tags.length ? `<div class="paipu-tags">${item.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="tiles">${rows.map(row => `
          <div class="tile-row">${row.map(n =>
            `<img class="tile-img" src="${tileImage(n)}" alt="${esc(n)}" loading="eager" decoding="async" draggable="false">`).join('')}</div>`).join('')}
        </div>
        <p class="paipu-desc">${esc(item.desc)}</p>
        ${item.points && item.points.length ? `<ul class="paipu-points">${item.points.map(pt => `<li>${esc(pt)}</li>`).join('')}</ul>` : ''}
        ${item.note ? `<p class="paipu-note">${esc(item.note)}</p>` : ''}
      </div>`;
    return;
  }
  $view.innerHTML = `
    <div class="page">
      <header class="page-header home-head"><div><h1>常见牌型</h1><p class="subtitle">一图一乾坤</p></div></header>
      <div class="paipu-list">
        ${PAIPU.map(p => `
          <div class="paipu-card" data-action="paipu-open" data-id="${p.id}" role="button">
            <div class="paipu-preview">${p.tiles.slice(0, 4).map(n =>
              `<img src="${tileImage(n)}" alt="" loading="lazy" decoding="async">`).join('')}</div>
            <div class="paipu-info">
              <b>${esc(p.name)}</b>
              <span class="fan-badge small">${esc(p.fan)}</span>
            </div>
          </div>`).join('')}
      </div>
      <p class="coming-tip">更多番种整理中……</p>
    </div>`;
}

// ---------- 页面：牌经（牌理课堂） ----------

function renderPaijing(id) {
  if (id) {
    const lesson = PAIJING.find(l => l.id === id);
    if (!lesson) { location.hash = '#/paijing'; return; }
    $view.innerHTML = `
      <div class="page">
        <header class="page-header question-header">
          <button class="btn-back" data-action="nav" data-to="#/paijing">‹ 牌经</button>
          <h1>第${lesson.no}课</h1>
        </header>
        <div class="lesson-detail">
          <h2>${esc(lesson.title)}</h2>
          ${lesson.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}
        </div>
      </div>`;
    return;
  }
  $view.innerHTML = `
    <div class="page">
      <header class="page-header home-head"><div><h1>牌经</h1><p class="subtitle">牌理课堂，从数字到算牌</p></div></header>
      <div class="lesson-list">
        ${PAIJING.map(l => `
          <div class="lesson-card" data-action="paijing-open" data-id="${l.id}" role="button">
            <span class="lesson-no">第${l.no}课</span>
            <div class="lesson-info"><b>${esc(l.title)}</b><p>${esc(l.digest)}</p></div>
            <span class="lesson-arrow">›</span>
          </div>`).join('')}
      </div>
      <p class="coming-tip">更多课程编写中……</p>
    </div>`;
}

// ---------- 页面：书场（视频讲堂） ----------

function renderShuchang() {
  $view.innerHTML = `
    <div class="page">
      <header class="page-header home-head"><div><h1>书场</h1><p class="subtitle">视频讲堂，听牌理故事</p></div></header>
      <div class="video-list">
        ${VIDEOS.map(v => `
          <div class="video-card ${v.status === 'pending' ? 'pending' : ''}">
            <div class="video-thumb"><span>▶</span></div>
            <div class="video-info">
              <b>${esc(v.title)}</b>
              <p>${esc(v.desc)}</p>
              <span class="video-meta">${v.status === 'pending' ? '筹备中' : esc(v.duration)}</span>
            </div>
          </div>`).join('')}
      </div>
      <p class="coming-tip">视频陆续上架，敬请期待</p>
    </div>`;
}

// ---------- 页面：行话（川麻词典） ----------

let hanghuaKeyword = '';

function renderHanghua(id) {
  if (id) {
    const idx = HANGHUA.findIndex(t => t.id === id);
    if (idx < 0) { location.hash = '#/hanghua'; return; }
    const item = HANGHUA[idx];
    $view.innerHTML = `
      <div class="page">
        <header class="page-header question-header">
          <button class="btn-back" data-action="nav" data-to="#/hanghua">‹ 行话</button>
          <h1>${esc(item.term)}</h1>
          <span class="fan-badge">第 ${idx + 1} 条</span>
        </header>
        <div class="term-detail">
          <div class="term-py">${esc(item.pinyin)}</div>
          <p>${esc(item.meaning)}</p>
        </div>
      </div>`;
    return;
  }

  const kw = hanghuaKeyword.trim().toLowerCase();
  const list = HANGHUA.filter(t =>
    !kw || t.term.includes(kw) || t.pinyin.includes(kw) || t.meaning.toLowerCase().includes(kw));

  $view.innerHTML = `
    <div class="page">
      <header class="page-header home-head"><div><h1>行话</h1><p class="subtitle">川麻将江湖的黑话与门道</p></div></header>
      <input class="search-box" id="hanghua-search" type="search"
             placeholder="搜术语，比如：定缺" value="${esc(hanghuaKeyword)}">
      <div class="term-grid">
        ${list.map(t => {
          const idx = HANGHUA.findIndex(x => x.id === t.id);
          return `
          <div class="term-card" data-action="hanghua-open" data-id="${t.id}" role="button">
            <div class="term-head">
              <span class="term-no">${String(idx + 1).padStart(2, '0')}</span>
              <b>${esc(t.term)}</b>
            </div>
            <span class="term-py">${esc(t.pinyin)}</span>
          </div>`;}).join('') || '<p class="coming-tip">没找到这个词，换个关键字试试</p>'}
      </div>
    </div>`;

  const search = document.getElementById('hanghua-search');
  if (search) {
    search.addEventListener('input', (e) => {
      hanghuaKeyword = e.target.value;
      const pos = e.target.selectionStart;
      renderHanghua();
      const el = document.getElementById('hanghua-search');
      if (el) { el.focus(); el.setSelectionRange(pos, pos); }
    });
  }
}

// ---------- 页面：我的 ----------

async function renderProfile() {
  const basic = questionsByType('basic');
  const err = questionsByType('error_prone');
  const bDone = completedCount('basic');
  const eDone = completedCount('error_prone');
  const user = window.DaoBox ? DaoBox.user : null;

  // 先渲染骨架，再异步拉配额
  $view.innerHTML = `
    <div class="page">
      <header class="page-header"><h1>我的</h1></header>
      <div class="profile-card">
        <div class="avatar">🀄</div>
        <div>
          <b id="profile-name">${user ? esc(user.nickname || user.phone.slice(7)) : '麻友（未登录）'}</b>
          <p class="muted" id="profile-sub">${user ? 'DaoBox 账号' : '登录后每日额度 ×3'}</p>
        </div>
      </div>
      <div class="quota-row" id="profile-quota">
        <div class="stat"><b>—</b><span>今日剩余</span></div>
        <div class="stat"><b>—</b><span>每日上限</span></div>
      </div>
      <div class="stats-row">
        <div class="stat"><b>${bDone}/${basic.length}</b><span>基础题</span></div>
        <div class="stat"><b>${eDone}/${err.length}</b><span>易错题</span></div>
      </div>
      ${user
        ? '<button class="btn-start" id="btn-checkin" style="margin-bottom:10px;">每日打卡 +2 次</button>'
        : `<a class="btn-start" id="btn-login" href="${DaoBox ? esc(DaoBox.loginUrl()) : 'https://daobox.app/login'}" style="text-decoration:none;display:block;text-align:center;">注册 / 登录 → 额度 ×3</a>`}
      <p class="disclaimer">本站为麻将学习交流工具，仅供娱乐，不涉及任何博彩行为。理性游戏，未满18周岁不建议使用。</p>
      <p class="version">${APP_VERSION}</p>
    </div>`;

  // 异步拉取剩余配额
  if (window.DaoBox) {
    try {
      const q = await DaoBox.quota('practice');
      if (q && q.ok) {
        const el = document.getElementById('profile-quota');
        if (el) el.innerHTML = `
          <div class="stat"><b>${q.remaining}</b><span>今日剩余</span></div>
          <div class="stat"><b>${q.limit}</b><span>每日上限</span></div>`;
      }
    } catch (e) { /* fail-open：网络不通时保持 — */ }
  }

  // 打卡按钮
  const checkinBtn = document.getElementById('btn-checkin');
  if (checkinBtn) {
    checkinBtn.addEventListener('click', async () => {
      checkinBtn.disabled = true;
      checkinBtn.textContent = '打卡中…';
      try {
        const r = await DaoBox.checkin();
        if (r && r.ok) {
          checkinBtn.textContent = '✅ 已打卡 +2 次';
          // 刷新配额显示
          const q2 = await DaoBox.quota('practice');
          if (q2 && q2.ok) {
            const el = document.getElementById('profile-quota');
            if (el) el.innerHTML = `
              <div class="stat"><b>${q2.remaining}</b><span>今日剩余</span></div>
              <div class="stat"><b>${q2.limit}</b><span>每日上限</span></div>`;
          }
        } else {
          checkinBtn.textContent = r && r.reason === '今日已打卡' ? '今日已打卡' : '打卡失败，明天再来';
        }
      } catch (e) {
        checkinBtn.textContent = '打卡失败，请重试';
        checkinBtn.disabled = false;
      }
    });
  }
}

// ---------- 路由 ----------

function router() {
  const hash = location.hash || '#/home';
  window.scrollTo(0, 0);
  if (hash.startsWith('#/question/')) {
    const parts = hash.split('/');
    const type = parts[2] === 'error_prone' ? 'error_prone' : 'basic';
    renderQuestion(type, parts[3]);
  } else if (hash.startsWith('#/paipu')) {
    renderPaipu(hash.split('/')[2]);
  } else if (hash.startsWith('#/paijing')) {
    renderPaijing(hash.split('/')[2]);
  } else if (hash === '#/shuchang') {
    renderShuchang();
  } else if (hash.startsWith('#/hanghua')) {
    renderHanghua(hash.split('/')[2]);
  } else if (hash === '#/practice') {
    renderPractice();
  } else if (hash === '#/profile') {
    renderProfile();
  } else {
    renderTeahouse();
  }
  // 导航高亮：按路径前缀匹配
  const section = hash.split('/')[1] === 'question' ? 'practice' : hash.split('/')[1] || 'home';
  document.querySelectorAll('.tabbar .tab').forEach(tab => {
    tab.classList.toggle('active', (tab.dataset.to || '').startsWith('#/' + section));
  });
}

// ---------- 事件委托 ----------

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const { action, type, to } = el.dataset;

  // 目标 hash 与当前相同时 hashchange 不触发，手动重渲染
  const goto = (target) => {
    if (location.hash === target) router();
    else location.hash = target;
  };

  switch (action) {
    case 'start':
      goto(`#/question/${type}`);
      break;
    case 'navq': {
      const qs = questionsByType(el.dataset.type);
      const target = Math.min(Math.max(parseInt(el.dataset.index, 10) - 1, 0), qs.length - 1);
      goto(`#/question/${el.dataset.type}/${target + 1}`);
      break;
    }
    case 'paipu-open':
      goto('#/paipu/' + el.dataset.id);
      break;
    case 'paijing-open':
      goto('#/paijing/' + el.dataset.id);
      break;
    case 'hanghua-open':
      goto('#/hanghua/' + el.dataset.id);
      break;
    case 'navq-jump':
      goto('#/practice');
      break;
    case 'answer':
      handleAnswer(el.dataset.slot);
      break;
    case 'nav':
      goto(to || '#/home');
      break;
  }
});

window.addEventListener('hashchange', router);

// ---------- 启动 ----------

// 后台预加载全部牌图，之后切题零延迟
setTimeout(() => {
  const names = new Set();
  loadQuestions().forEach(q => {
    q.tiles.forEach(t => names.add(t));
    q.options.forEach(o => { if (o) names.add(o); });
  });
  names.forEach(n => { const img = new Image(); img.src = tileImage(n); });
}, 300);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW 注册失败:', err));
}
router();
