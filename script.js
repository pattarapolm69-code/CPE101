/* ============================================================
   DEBUG ARCADE — CPE101 Workshop demo (game theme)
   Sections: Theme toggle · Boot log · Debug Rush game
   Quest Log (XP) · Character power calculator
   Guild contact form · Scroll reveal
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initBootLog();
  initDebugRush();
  initQuestLog();
  initCharacterCalculator();
  initContactForm();
  initScrollReveal();
});

/* ---------- Theme toggle ---------- */
function initThemeToggle() {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme');
  if (saved) root.setAttribute('data-theme', saved);

  toggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

/* ---------- Boot log typewriter ---------- */
function initBootLog() {
  const el = document.getElementById('bootLog');
  const lines = [
    'SYSTEM BOOT...',
    'LOADING HTML / CSS / JS MODULES...  OK',
    'PLAYER: CPE101 STUDENT',
    'STATUS: READY TO DEBUG'
  ];
  let li = 0, ci = 0;

  function typeNext() {
    if (li >= lines.length) return;
    const line = lines[li];
    if (ci === 0) el.innerHTML += `<div class="boot-line" id="active-boot"></div>`;
    const active = document.getElementById('active-boot');
    active.textContent = line.slice(0, ci + 1);
    ci++;
    if (ci >= line.length) {
      active.removeAttribute('id');
      if (line.includes('OK') || line.includes('READY')) active.classList.add('boot-ok');
      ci = 0; li++;
      setTimeout(typeNext, 320);
    } else {
      setTimeout(typeNext, 20);
    }
  }
  typeNext();
}

/* ---------- Debug Rush mini-game ---------- */
function initDebugRush() {
  const board = document.getElementById('gameBoard');
  const scoreEl = document.getElementById('score');
  const comboEl = document.getElementById('combo');
  const timeEl = document.getElementById('timeLeft');
  const bestEl = document.getElementById('bestScore');
  const startBtn = document.getElementById('gameStart');
  const statusEl = document.getElementById('gameStatus');

  const CELL_COUNT = 12;
  const GAME_SECONDS = 20;
  const BEST_KEY = 'debugRushBest';

  let score = 0, combo = 0, timeLeft = GAME_SECONDS;
  let playing = false;
  let spawnTimer = null, countdownTimer = null;
  let bugTimeouts = new Map();

  bestEl.textContent = localStorage.getItem(BEST_KEY) || '0';

  // Build board cells
  for (let i = 0; i < CELL_COUNT; i++) {
    const cell = document.createElement('div');
    cell.className = 'bug-cell';
    cell.dataset.index = i;
    cell.addEventListener('click', () => squash(cell));
    board.appendChild(cell);
  }
  const cells = Array.from(board.children);

  startBtn.addEventListener('click', startGame);

  function startGame() {
    if (playing) return;
    playing = true;
    score = 0; combo = 0; timeLeft = GAME_SECONDS;
    scoreEl.textContent = '0';
    comboEl.textContent = '0';
    timeEl.textContent = String(GAME_SECONDS);
    statusEl.textContent = 'ไปเลย! กดบั๊กก่อนมันหนี 🐛';
    startBtn.disabled = true;
    startBtn.textContent = 'กำลังเล่น...';

    spawnTimer = setInterval(spawnBug, 750);
    countdownTimer = setInterval(() => {
      timeLeft--;
      timeEl.textContent = String(timeLeft);
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  function spawnBug() {
    const empties = cells.filter(c => !c.classList.contains('active'));
    if (empties.length === 0) return;
    const cell = empties[Math.floor(Math.random() * empties.length)];
    cell.classList.add('active');
    cell.textContent = '🐛';

    const timeoutId = setTimeout(() => {
      if (cell.classList.contains('active')) {
        cell.classList.remove('active');
        cell.textContent = '';
        combo = 0;
        comboEl.textContent = '0';
      }
    }, 900);
    bugTimeouts.set(cell, timeoutId);
  }

  function squash(cell) {
    if (!playing || !cell.classList.contains('active')) return;
    clearTimeout(bugTimeouts.get(cell));
    bugTimeouts.delete(cell);

    combo++;
    const bonus = Math.floor(combo / 5);
    score += 1 + bonus;
    scoreEl.textContent = String(score);
    comboEl.textContent = String(combo);

    cell.classList.remove('active');
    cell.classList.add('squashed');
    cell.textContent = '💥';
    setTimeout(() => {
      cell.classList.remove('squashed');
      cell.textContent = '';
    }, 150);
  }

  function endGame() {
    playing = false;
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
    bugTimeouts.forEach(id => clearTimeout(id));
    bugTimeouts.clear();
    cells.forEach(c => { c.classList.remove('active', 'squashed'); c.textContent = ''; });

    const best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    if (score > best) {
      localStorage.setItem(BEST_KEY, String(score));
      bestEl.textContent = String(score);
      statusEl.textContent = `จบเกม! สกอร์ ${score} — สถิติใหม่ 🏆`;
    } else {
      statusEl.textContent = `จบเกม! สกอร์ ${score} (สถิติเดิม ${best})`;
    }
    startBtn.disabled = false;
    startBtn.textContent = 'เล่นอีกครั้ง';
  }
}

/* ---------- Quest Log (todo + XP) ---------- */
function initQuestLog() {
  const input = document.getElementById('todoInput');
  const addBtn = document.getElementById('todoAdd');
  const list = document.getElementById('todoList');
  const count = document.getElementById('todoCount');
  const clearBtn = document.getElementById('todoClear');
  const xpFill = document.getElementById('xpFill');
  const xpText = document.getElementById('xpText');
  const STORAGE_KEY = 'cpe101_quests';

  let quests = load();
  render();

  addBtn.addEventListener('click', addQuest);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addQuest(); });
  clearBtn.addEventListener('click', () => {
    quests = quests.filter(q => !q.done);
    save();
    render();
  });

  function addQuest() {
    const text = input.value.trim();
    if (!text) return;
    quests.push({ id: Date.now(), text, done: false });
    input.value = '';
    save();
    render();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(quests)); }

  function render() {
    list.innerHTML = '';
    if (quests.length === 0) {
      list.innerHTML = '<li class="empty-hint">ยังไม่มีเควส ลองรับเควสแรกดูสิ 👆</li>';
    }
    quests.forEach(q => {
      const li = document.createElement('li');
      if (q.done) li.classList.add('done');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = q.done;
      checkbox.addEventListener('change', () => {
        q.done = checkbox.checked;
        save();
        render();
      });

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = q.text;

      const del = document.createElement('button');
      del.className = 'todo-del';
      del.textContent = '✕';
      del.setAttribute('aria-label', 'ลบเควสนี้');
      del.addEventListener('click', () => {
        quests = quests.filter(t => t.id !== q.id);
        save();
        render();
      });

      li.append(checkbox, span, del);
      list.appendChild(li);
    });

    const done = quests.filter(q => q.done).length;
    const remaining = quests.length - done;
    count.textContent = quests.length === 0
      ? 'ยังไม่มีเควส'
      : `เหลือ ${remaining} เควส จากทั้งหมด ${quests.length} เควส`;

    const totalXp = done * 10;
    const level = Math.floor(totalXp / 100) + 1;
    const xpInLevel = totalXp % 100;
    xpFill.style.width = xpInLevel + '%';
    xpText.textContent = `LV.${level} — ${xpInLevel} / 100`;
  }
}

/* ---------- Character power calculator (GPA logic reskinned) ---------- */
function initCharacterCalculator() {
  const rowsWrap = document.getElementById('gpaRows');
  const addRowBtn = document.getElementById('gpaAddRow');
  const calcBtn = document.getElementById('gpaCalc');
  const resultEl = document.getElementById('gpaResult');

  const RANK_POINTS = {
    'A': 4, 'B+': 3.5, 'B': 3, 'C+': 2.5,
    'C': 2, 'D+': 1.5, 'D': 1, 'F': 0
  };

  function addRow(name = '', credit = 3, rank = 'A') {
    const row = document.createElement('div');
    row.className = 'gpa-row';
    row.innerHTML = `
      <input type="text" class="gpa-name" placeholder="ชื่อด่าน/วิชา" value="${name}">
      <input type="number" class="gpa-credit" min="0" max="10" value="${credit}">
      <select class="gpa-grade">
        ${Object.keys(RANK_POINTS).map(r =>
          `<option value="${r}" ${r === rank ? 'selected' : ''}>${r}</option>`
        ).join('')}
      </select>
      <button class="row-del" aria-label="ลบด่านนี้">✕</button>
    `;
    row.querySelector('.row-del').addEventListener('click', () => row.remove());
    rowsWrap.appendChild(row);
  }

  addRow('Programming Dungeon', 3, 'A');
  addRow('Calculus Boss', 3, 'B+');

  addRowBtn.addEventListener('click', () => addRow());

  calcBtn.addEventListener('click', () => {
    const rows = rowsWrap.querySelectorAll('.gpa-row');
    let totalCredits = 0;
    let totalPoints = 0;

    rows.forEach(row => {
      const credit = parseFloat(row.querySelector('.gpa-credit').value) || 0;
      const rank = row.querySelector('.gpa-grade').value;
      totalCredits += credit;
      totalPoints += credit * RANK_POINTS[rank];
    });

    if (totalCredits === 0) {
      resultEl.textContent = 'เพิ่มด่านก่อนนะ';
      return;
    }
    const power = (totalPoints / totalCredits).toFixed(2);
    resultEl.textContent = `PWR ${power}`;
  });
}

/* ---------- Guild contact form validation ---------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    valid = validateField('name', v => v.trim().length > 0, 'กรุณากรอกชื่อ') && valid;
    valid = validateField('email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'อีเมลไม่ถูกต้อง') && valid;
    valid = validateField('message', v => v.trim().length >= 5, 'ข้อความสั้นเกินไป (อย่างน้อย 5 ตัวอักษร)') && valid;

    if (valid) {
      status.textContent = 'ส่งข้อความถึงกิลด์เรียบร้อยแล้ว ยินดีต้อนรับ! 🎉';
      form.reset();
      document.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    } else {
      status.textContent = '';
    }
  });

  function validateField(id, testFn, message) {
    const field = document.getElementById(id);
    const errorEl = document.getElementById(id + 'Error');
    const wrapper = field.closest('.field');
    const ok = testFn(field.value);
    if (ok) {
      wrapper.classList.remove('invalid');
      errorEl.textContent = '';
    } else {
      wrapper.classList.add('invalid');
      errorEl.textContent = message;
    }
    return ok;
  }
}

/* ---------- Scroll reveal ---------- */
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach(t => t.classList.add('in-view'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach(t => observer.observe(t));
}
