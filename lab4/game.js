// Налаштування складності:
// time  — дозволений час між клікми (мс)
// size  — розмір фігури (px)
// far   — початкова ймовірність, що наступна фігура з’явиться далеко від попередньої
const LEVELS = {
  easy:   { time: 10000, size: 80, far: 0.10 },
  medium: { time: 5000,  size: 64, far: 0.30 },
  hard:   { time: 1000,  size: 52, far: 0.50 }
};

// Елементи сторінки
const area = document.getElementById("area");
const timerBar = document.getElementById("timer-bar");
const menu = document.getElementById("menu");
const menuTitle = document.getElementById("menu-title");
const menuText = document.getElementById("menu-text");
const menuBtn = document.getElementById("menu-btn");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const difficultySel = document.getElementById("difficulty");
const shapeSel = document.getElementById("shape");
const colorInput = document.getElementById("color");

// Клавіші, які відстежуються: блок на сторінці, лічильник і кількість натискань
const KEYS = {
  KeyZ: { box: document.getElementById("key-z"), counter: document.getElementById("count-z"), count: 0 },
  KeyX: { box: document.getElementById("key-x"), counter: document.getElementById("count-x"), count: 0 }
};

// Стан гри
let playing = false;
let score = 0;
let best = 0;
let target = null;       // поточний DOM-елемент фігури
let targetInfo = null;   // { x, y, size } — центр і розмір у координатах області
let prevPos = null;      // центр попередньої фігури
let timeoutId = null;
let mouse = null;        // останнє відоме положення курсора відносно області

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function setControlsDisabled(value) {
  difficultySel.disabled = value;
  shapeSel.disabled = value;
  colorInput.disabled = value;
}

// ----- Появa фігур -----

function randomPoint(size) {
  const half = size / 2 + 8;
  return {
    x: random(half, area.clientWidth - half),
    y: random(half, area.clientHeight - half)
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Чим більше очок, тим частіше фігура з’являється далеко від попередньої,
// але не завжди — інколи вона з’являється у випадковому місці.
function nextPoint(level) {
  let point = randomPoint(level.size);
  if (!prevPos) return point;

  const farChance = Math.min(0.9, level.far + score * 0.03);
  if (Math.random() < farChance) {
    // з кількох випадкових точок беремо найвіддаленішу
    for (let i = 0; i < 8; i++) {
      const candidate = randomPoint(level.size);
      if (distance(candidate, prevPos) > distance(point, prevPos)) {
        point = candidate;
      }
    }
  }
  return point;
}

function spawnTarget() {
  const level = LEVELS[difficultySel.value];
  const point = nextPoint(level);

  if (target) target.remove();

  target = document.createElement("div");
  target.className = "target " + shapeSel.value;
  target.style.width = level.size + "px";
  target.style.height = level.size + "px";
  target.style.left = point.x - level.size / 2 + "px";
  target.style.top = point.y - level.size / 2 + "px";
  area.appendChild(target);

  targetInfo = { x: point.x, y: point.y, size: level.size };
  prevPos = point;

  startTimer(level.time);
}

// ----- Таймер між клікми -----

function startTimer(ms) {
  clearTimeout(timeoutId);

  timerBar.style.transition = "none";
  timerBar.style.width = "100%";
  void timerBar.offsetWidth; // перезапуск анімації
  timerBar.style.transition = "width " + ms + "ms linear";
  timerBar.style.width = "0";

  timeoutId = setTimeout(function () {
    endGame("Час вийшов");
  }, ms);
}

// ----- Хід гри -----

function startGame() {
  score = 0;
  prevPos = null;
  scoreEl.textContent = score;
  for (const code in KEYS) {
    KEYS[code].count = 0;
    KEYS[code].counter.textContent = 0;
  }
  playing = true;

  document.documentElement.style.setProperty("--target", colorInput.value);
  setControlsDisabled(true);
  menu.classList.add("hidden");
  spawnTarget();
}

function endGame(reason) {
  if (!playing) return;
  playing = false;
  clearTimeout(timeoutId);

  timerBar.style.transition = "none";
  timerBar.style.width = "0";
  if (target) target.remove();
  target = null;
  targetInfo = null;

  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }

  menuTitle.textContent = "Гру закінчено";
  menuText.textContent = reason + ". Ваш результат: " + score;
  menuBtn.textContent = "Грати знову";
  menu.classList.remove("hidden");
  setControlsDisabled(false);
}

function hit() {
  score++;
  scoreEl.textContent = score;
  spawnTarget();
}

// ----- Ввід користувача: миша -----

menuBtn.addEventListener("click", startGame);

area.addEventListener("mousedown", function (e) {
  if (!playing) return;
  if (e.target === target) {
    hit();
  }
});

document.addEventListener("mousemove", function (e) {
  const rect = area.getBoundingClientRect();
  mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

// ----- Ввід користувача: клавіатура (Z / X) -----
// Клавіша «клікає» у тій точці, де зараз знаходиться курсор.

document.addEventListener("keydown", function (e) {
  if (!KEYS[e.code]) return;

  // підсвічування натиснутої клавіші (поки вона затиснута)
  KEYS[e.code].box.classList.add("active");

  if (e.repeat || !playing) return;

  // лічильник натискань
  KEYS[e.code].count++;
  KEYS[e.code].counter.textContent = KEYS[e.code].count;

  if (!mouse) return;

  const onTarget = distance(mouse, targetInfo) <= targetInfo.size / 2;
  if (onTarget) {
    hit();
  }
});

document.addEventListener("keyup", function (e) {
  if (KEYS[e.code]) KEYS[e.code].box.classList.remove("active");
});

// якщо вікно втратило фокус, прибираємо підсвічування
window.addEventListener("blur", function () {
  for (const code in KEYS) KEYS[code].box.classList.remove("active");
});

// Колір і форма застосовуються на початку гри
colorInput.addEventListener("input", function () {
  document.documentElement.style.setProperty("--target", colorInput.value);
});
