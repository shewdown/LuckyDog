// ───────────────────────────── Константы ─────────────────────────────

const TOTAL_ITEMS   = 40;
const ITEM_ANGLE    = 360 / TOTAL_ITEMS;
const SPIN_DURATION = 10000;

// ───────────────────────────── SVG иконки ─────────────────────────────

const iconRunner = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>`;
const iconWings  = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M11.99 15.35c-1.42 0-2.82.5-3.9 1.45-1.57-4.04-4.83-7.23-8.09-8.47 1.54 1.57 2.68 3.55 3.32 5.75.5-1.73 1.57-3.21 3.03-4.14-1.25 1.5-1.63 3.66-1 5.58 2.36-1.53 4.96-1.12 6.64.18 1.68-1.3 4.28-1.71 6.64-.18.63-1.92.25-4.08-1-5.58 1.46.93 2.53 2.41 3.03 4.14.64-2.2 1.78-4.18 3.32-5.75-3.26 1.24-6.52 4.43-8.09 8.47-1.08-.95-2.48-1.45-3.9-1.45z"/></svg>`;
const iconSwords = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L12 2z" transform="scale(0.5) translate(12, 0)"/><path d="M7 21l10-10m-10 0l10 10" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round"/></svg>`;

// ───────────────────────────── Состояние ─────────────────────────────

let state         = 'COUNTDOWN';
let timeLeft      = 0;
let winnerColor   = null;

let currentRotation   = 0;
let startRotation     = 0;
let targetRotation    = 0;
let animationStartTime = 0;
let lastFrameTime     = performance.now();

// ───────────────────────────── DOM элементы ─────────────────────────────

const wheel        = document.getElementById('wheel');
const timeDisplay  = document.getElementById('timeDisplay');
const labelDisplay = document.getElementById('labelDisplay');
const arrow        = document.getElementById('arrow');
const balicDisplay = document.getElementById('balic');

const items = [];

// ───────────────────────────── Инициализация ─────────────────────────────

initWheel();
loadHistory();
requestAnimationFrame(updateLogic);

const socket = io();

socket.on('sync-game', (data) => {
    if (data.state === 'SPINNING') {
        const elapsed = Date.now() - data.startTime;

        timeDisplay.textContent  = '';
        labelDisplay.textContent = 'Крутим...';

        if (elapsed < data.duration)
            startSpinningFromServer(data.targetIndex, data.duration, elapsed);
    } else {
        wheel.classList.add('is-active');
        currentRotation = data.targetRotation || 0;
        wheel.style.transform = `rotate(${currentRotation}deg)`;
    }
});

socket.on('gameTick', (data) => {
    state = data.state;

    if (state === 'COUNTDOWN') {
        timeLeft = data.timeLeft;
        wheel.classList.remove('is-active');
        timeDisplay.textContent  = timeLeft + 's';
        labelDisplay.textContent = 'До начала раунда';
    }

    if (state === 'WAITING') {
        ['yellow', 'blue', 'green'].forEach(color => {
        document.getElementById(`total-bet-${color}`).innerText = '0.00';
        });
        timeDisplay.textContent  = '';
        labelDisplay.textContent = 'Поздравляем победителей!';
    }
});

socket.on('betTotals', (totals) => {
    ['yellow', 'blue', 'green'].forEach(color => {
        document.getElementById(`total-bet-${color}`).innerText = '0.00';
    });

    totals.forEach(({ chosen_color, total }) => {
        const el = document.getElementById(`total-bet-${chosen_color}`);
        if (el) el.innerText = Number(total).toFixed(2);
    });
});

socket.on('commandSpin', (data) => {
    startSpinningFromServer(data.targetIndex, data.duration, 0);
    timeDisplay.textContent  = '';
    labelDisplay.textContent = 'Крутим...';
});

socket.on('roundEnd', async ({ winnerColor }) => {
    const login = JSON.parse(localStorage.getItem('user'))?.login;
    if (!login) return;

    const response = await fetch(`/api/balance/${login}`);
    const data     = await response.json();

    balicDisplay.innerText = Number(data.balance).toFixed(2);

    const user = JSON.parse(localStorage.getItem('user'));
    user.balance = data.balance;
    localStorage.setItem('user', JSON.stringify(user));
});

// ───────────────────────────── Колесо ─────────────────────────────

function initWheel() {
    for (let i = 0; i < TOTAL_ITEMS; i++) {
        const item = document.createElement('div');
        item.classList.add('item');

        let type, icon;
        if (i % 10 === 0) {
            type = 'yellow'; icon = iconRunner;
        } else if (i % 2 === 1) {
            type = 'blue';   icon = iconWings;
        } else {
            type = 'green';  icon = iconSwords;
        }

        item.classList.add(type);
        item.innerHTML = icon;
        item.style.setProperty('--angle', `${i * ITEM_ANGLE}deg`);

        wheel.appendChild(item);
        items.push(item);
    }
}

function startSpinningFromServer(targetIndex, duration, elapsed = 0) {
    state = 'SPINNING';
    wheel.classList.add('is-active');
    arrow.classList.add('visible');

    animationStartTime = performance.now() - elapsed;
    startRotation      = currentRotation;
    targetRotation     = Math.ceil(startRotation / 360) * 360 + 5 * 360 + (360 - targetIndex * ITEM_ANGLE);

    setWinnerColor(targetIndex);
}

// ───────────────────────────── Игровой цикл ─────────────────────────────

function updateLogic(now) {
    lastFrameTime = now;

    if (state === 'SPINNING') {
        let progress = (now - animationStartTime) / SPIN_DURATION;

        if (progress >= 1) {
            progress = 1;
            state = 'WAITING';
            arrow.classList.remove('visible');
            loadHistory();
        }

        currentRotation = startRotation + (targetRotation - startRotation) * easeOutQuart(progress);
        wheel.style.transform = `rotate(${currentRotation}deg)`;
    }

    updateLiftingEffect();
    requestAnimationFrame(updateLogic);
}

function updateLiftingEffect() {
    if (state === 'COUNTDOWN') {
        items.forEach(item => item.classList.remove('lifted'));
        return;
    }

    let closestIndex  = -1;
    let minDifference = Infinity;

    for (let i = 0; i < TOTAL_ITEMS; i++) {
        let angle = (i * ITEM_ANGLE + currentRotation) % 360;
        if (angle < 0) angle += 360;

        const diff = Math.min(angle, 360 - angle);
        if (diff < minDifference) {
            minDifference = diff;
            closestIndex  = i;
        }
    }

    items.forEach((item, i) =>
        item.classList.toggle('lifted', i === closestIndex)
    );
}

// ───────────────────────────── Ставки ─────────────────────────────

async function placeBet(color) {
    const input  = document.getElementById('bet-value');
    const amount = Number(input.value);
    const login  = JSON.parse(localStorage.getItem('user'))?.login;

    if (amount <= 0) return alert("Введите сумму ставки");

    try {
        const response = await fetch('/api/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, amount, color })
        });

        const data = await response.json();

        if (data.success) {
            balicDisplay.innerText = data.newBalance.toFixed(2);

            const user = JSON.parse(localStorage.getItem('user'));
            user.balance = data.newBalance;
            localStorage.setItem('user', JSON.stringify(user));

            input.value = '0.00';
        } else {
            alert(data.error || "Ошибка при размещении ставки");
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
        alert("Нет соединения с сервером");
    }
}

function updateBetInput(modifier) {
    const input   = document.getElementById('bet-value');
    const balance = Number(balicDisplay.innerText);
    let val       = Number(input.value);

    switch (modifier) {
        case 'plus':  val += 1;           break;
        case 'minus': val -= 1;           break;
        case 'half':  val /= 2;           break;
        case 'x2':    val *= 2;           break;
        case 'all':   val = balance;      break;
    }

    input.value = Math.min(Math.max(0, val), balance).toFixed(2);
}

// ───────────────────────────── История ─────────────────────────────

async function loadHistory() {
    const response = await fetch('/get-history');
    const history  = await response.json();

    const container = document.getElementById('history-games-container');
    container.innerHTML = '';

    if (state === 'COUNTDOWN') {
        ['yellow', 'blue', 'green'].forEach(color => {
            document.getElementById(`total-bet-${color}`).innerText = '0.00';
        });
    }

    history.forEach(game => {
        const div = document.createElement('div');
        div.classList.add('history-game');
        div.style.backgroundColor = `var(--${game.winner_color})`;
        container.appendChild(div);
    });
}

// ───────────────────────────── Вспомогательные функции ─────────────────────────────

function getColorByIndex(i) {
    if (i % 10 === 0) return 'yellow';
    return i % 2 === 1 ? 'blue' : 'green';
}

function setWinnerColor(index) {
    winnerColor = getColorByIndex(index);
}

function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

function doButtonsToggleActive(isActive) {
    ['bet-yellow', 'bet-blue', 'bet-green'].forEach(id =>
        document.getElementById(id).classList.toggle('is-unactive', !isActive)
    );
}

// Обработчики кнопок
const choiseBtnYellow = () => placeBet('yellow');
const choiseBtnGreen  = () => placeBet('green');
const choiseBtnBlue   = () => placeBet('blue');

const plusBtnClick  = () => updateBetInput('plus');
const minusBtnClick = () => updateBetInput('minus');
const semiBtnClick  = () => updateBetInput('half');
const x2BtnClick    = () => updateBetInput('x2');
const allinBtnClick = () => updateBetInput('all');