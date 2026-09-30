/**
 * 川渝麻研社 PWA — 主应用
 * vanilla JS SPA：hash 路由 + localStorage 进度
 * 业务规则与小程序版一致：每题型免费 15 题，答对记完成
 */

const APP_VERSION = 'v0.1.0';
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
  try {
    const cached = JSON.parse(localStorage.getItem(STORE_KEYS.ACTIVATED));
    if (cached && cached.activated) {
      if (cached.type === 'yearly' && cached.expireAt && new Date(cached.expireAt) < new Date()) {
        localStorage.removeItem(STORE_KEYS.ACTIVATED);
        return false;
      }
      return true;
    }
  } catch { /* ignore */ }
  return false;
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

// ---------- 页面：拆搭闯关（首页） ----------

function renderHome() {
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
      <header class="page-header">
        <h1>拆搭闯关</h1>
        <p class="subtitle">精选拆搭训练，提高川麻技巧</p>
      </header>
      ${freeTip}
      <div class="cards">${cards}</div>
    </div>`;
}

// ---------- 页面：答题 ----------

function renderQuestion(type) {
  const qs = questionsByType(type);
  const activated = isActivated();

  // 免费额度：未激活且该题型已完成满 15 题 → 拦截
  if (!activated && completedCount(type) >= FREE_LIMIT) {
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

  // 当前题：第一道未完成的；全完成则从头开始
  const current = qs.find(q => !isCompleted(q.id)) || qs[0];
  const index = qs.indexOf(current) + 1;

  const rows = organizeTileRows(current.tiles).map(row => `
    <div class="tile-row">${row.map(name =>
      `<img class="tile-img" src="${tileImage(name)}" alt="${esc(name)}" draggable="false">`).join('')}
    </div>`).join('');

  // 选项（跳过空选项，保留原始槽位索引用于判定）
  const optionBtns = current.options.map((opt, slot) => {
    if (!opt) return '';
    return `
      <button class="option-btn" data-action="answer" data-slot="${slot}" data-opt="${esc(opt)}">
        <img class="option-img" src="${tileImage(opt)}" alt="${esc(opt)}" draggable="false">
        <span class="option-label">${'ABCD'[slot]}</span>
      </button>`;
  }).join('');

  $view.innerHTML = `
    <div class="page" id="question-page" data-type="${type}" data-id="${esc(current.id)}" data-correct="${current.correctOption}">
      <header class="page-header question-header">
        <button class="btn-back" data-action="nav" data-to="#/home">‹ 返回</button>
        <h1>${esc(current.title)}</h1>
        <span class="q-index">第${index}题</span>
      </header>
      <p class="q-desc">${esc(current.description)}</p>
      <div class="tiles">${rows}</div>
      <p class="q-prompt">选择要打出的牌：</p>
      <div class="options">${optionBtns}</div>
      <div class="answer-result" id="answer-result"></div>
    </div>`;
}

function handleAnswer(slot) {
  const page = document.getElementById('question-page');
  const correct = page.dataset.correct === slot;
  const type = page.dataset.type;
  const qid = page.dataset.id;
  const resultBox = document.getElementById('answer-result');

  if (navigator.vibrate) navigator.vibrate(correct ? 30 : [60, 40, 60]);

  if (correct) {
    completeQuestion(qid);
    const q = questionsByType(type).find(x => x.id === qid);
    const done = completedCount(type);
    const total = questionsByType(type).length;
    const next = questionsByType(type).find(x => !isCompleted(x.id));

    resultBox.innerHTML = `
      <div class="result correct">
        <div class="result-icon">✓</div>
        <p class="result-text">回答正确！（${done}/${total}）</p>
        ${q.explanation ? `<div class="explanation"><b>答题思路：</b>${esc(q.explanation)}</div>` : ''}
        <button class="btn-start" data-action="${next ? 'next' : 'nav'}" data-type="${type}" data-to="#/home">
          ${next ? '下一题 →' : '本题型已全部完成，返回'}
        </button>
      </div>`;
    page.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  } else {
    const btn = page.querySelector(`.option-btn[data-slot="${slot}"]`);
    if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
    resultBox.innerHTML = `<div class="result wrong"><p class="result-text">不对，再想想～</p></div>`;
  }
}

// ---------- 页面：我的 ----------

function renderProfile() {
  const basic = questionsByType('basic');
  const err = questionsByType('error_prone');
  const bDone = completedCount('basic');
  const eDone = completedCount('error_prone');
  const activated = isActivated();

  $view.innerHTML = `
    <div class="page">
      <header class="page-header"><h1>我的</h1></header>
      <div class="profile-card">
        <div class="avatar">🀄</div>
        <div>
          <b>麻友</b>
          <p class="muted">设备 ${esc(getDeviceId().slice(0, 8))}</p>
        </div>
        <span class="badge ${activated ? 'on' : ''}">${activated ? '已激活' : '未激活'}</span>
      </div>
      <div class="stats-row">
        <div class="stat"><b>${bDone}/${basic.length}</b><span>基础题</span></div>
        <div class="stat"><b>${eDone}/${err.length}</b><span>易错题</span></div>
      </div>
      <button class="btn-start" data-action="goto-activate">${activated ? '管理激活' : '输入注册码激活'}</button>
      <p class="version">${APP_VERSION}</p>
    </div>`;
}

function renderActivatePlaceholder() {
  $view.innerHTML = `
    <div class="page center">
      <div class="modal-card">
        <div class="modal-icon">🔑</div>
        <h2>激活注册码</h2>
        <p>激活功能即将开放（需要后端 cymys-api 部署后接入）。<br>当前版本为开发预览版。</p>
        <button class="btn-back" data-action="nav" data-to="#/home">返回</button>
      </div>
    </div>`;
}

// ---------- 路由 ----------

function router() {
  const hash = location.hash || '#/home';
  window.scrollTo(0, 0);
  if (hash.startsWith('#/question/')) {
    renderQuestion(hash.split('/')[2] === 'error_prone' ? 'error_prone' : 'basic');
  } else if (hash === '#/profile') {
    renderProfile();
  } else if (hash === '#/activate') {
    renderActivatePlaceholder();
  } else {
    renderHome();
  }
  // 底部导航高亮
  document.querySelectorAll('.tabbar .tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.to === hash || (hash.startsWith('#/question') && tab.dataset.to === '#/home'));
  });
}

// ---------- 事件委托 ----------

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const { action, type, to } = el.dataset;

  switch (action) {
    case 'start':
    case 'next':
      location.hash = `#/question/${type}`;
      break;
    case 'answer':
      handleAnswer(el.dataset.slot);
      break;
    case 'goto-activate':
      location.hash = '#/activate';
      break;
    case 'nav':
      location.hash = to || '#/home';
      break;
  }
});

window.addEventListener('hashchange', router);

// ---------- 启动 ----------

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW 注册失败:', err));
}
router();
