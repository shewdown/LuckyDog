// --- КОНСТАНТЫ И НАСТРОЙКИ ---
const wheel = document.getElementById('wheel');
const timeDisplay = document.getElementById('timeDisplay');
const labelDisplay = document.getElementById('labelDisplay');
const arrow = document.getElementById('arrow');
const balicDisplay = document.getElementById('balic');

const TOTAL_ITEMS = 40;
const ITEM_ANGLE = 360 / TOTAL_ITEMS;
const SPIN_DURATION = 10000;
const WAIT_DURATION = 5000;
const COUNTDOWN_DURATION = 10.0;

const items = [];
let currentRotation = 0;
let startRotation = 0;
let targetRotation = 0;
let animationStartTime = 0;
let state = 'COUNTDOWN'; // COUNTDOWN, SPINNING, WAITING
let timeLeft = COUNTDOWN_DURATION;
let lastFrameTime = performance.now();
let winnerColor = null;

window.onload = function() {
    const savedHistory = localStorage.getItem('colorHistory');
    
    if (savedHistory) {
        // Превращаем строку обратно в массив
        history = JSON.parse(savedHistory);
        
        renderHistory(); 
    }
};

// Хранилище ставок: цвет -> сумма
let possibleWnnings = new Map();

// --- ИКОНКИ ---
const iconRunner = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>`;
const iconWings = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M11.99 15.35c-1.42 0-2.82.5-3.9 1.45-1.57-4.04-4.83-7.23-8.09-8.47 1.54 1.57 2.68 3.55 3.32 5.75.5-1.73 1.57-3.21 3.03-4.14-1.25 1.5-1.63 3.66-1 5.58 2.36-1.53 4.96-1.12 6.64.18 1.68-1.3 4.28-1.71 6.64-.18.63-1.92.25-4.08-1-5.58 1.46.93 2.53 2.41 3.03 4.14.64-2.2 1.78-4.18 3.32-5.75-3.26 1.24-6.52 4.43-8.09 8.47-1.08-.95-2.48-1.45-3.9-1.45z"/></svg>`;
const iconSwords = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L12 2z" transform="scale(0.5) translate(12, 0)"/><path d="M7 21l10-10m-10 0l10 10" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round"/></svg>`;

// --- ИНИЦИАЛИЗАЦИЯ КОЛЕСА ---
function initWheel() {
    let currentType = 0;

    for (let i = 0; i < TOTAL_ITEMS; i++) {
        const item = document.createElement('div');
        item.classList.add('item');

        let type, icon;
        if (i % 10 === 0) {
            type = 'yellow';
            icon = iconRunner;
        } else {
            type = currentType === 0 ? 'blue' : 'green';
            icon = currentType === 0 ? iconWings : iconSwords;
            currentType = 1 - currentType;
        }

        item.classList.add(type);
        item.innerHTML = icon;

        const angle = i * ITEM_ANGLE;
        item.style.setProperty('--angle', `${angle}deg`);
        
        wheel.appendChild(item);
        items.push(item);
    }
}

// --- ЛОГИКА АНИМАЦИИ ---
function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

function updateLogic(now) {
    const dt = now - lastFrameTime;
    lastFrameTime = now;

    if (state === 'COUNTDOWN') {
        doButtonsToggleActive(true);
        timeLeft -= dt / 1000;
        if (timeLeft <= 0) {
            timeLeft = 0;
            startSpinning(now);
        } else {
            timeDisplay.textContent = timeLeft.toFixed(2) + 's';
        }
        updateLiftingEffect();
    } 
    else if (state === 'SPINNING') {
        timeDisplay.textContent = '0.00s';
        let progress = (now - animationStartTime) / SPIN_DURATION;
        doButtonsToggleActive(false);

        if (progress >= 1) {
            // Добавление игры в историю
            const history_games = document.getElementById('history-games-container');
            const history_game = document.createElement('div');
            history_game.classList.add('history-game');
            history_game.style.backgroundColor = `var(--${winnerColor})`;
            history_games.prepend(history_game);

            progress = 1;
            calculateResult();
            state = 'WAITING';
            labelDisplay.textContent = 'Поздравляем победителей!';
            animationStartTime = now;
        }

        currentRotation = startRotation + (targetRotation - startRotation) * easeOutQuart(progress);
        wheel.style.transform = `rotate(${currentRotation}deg)`;
        updateLiftingEffect();
    } 
    else if (state === 'WAITING') {
        let waitProgress = (now - animationStartTime);
        if (waitProgress >= WAIT_DURATION) {
            resetToCountdown();
        }
        updateLiftingEffect();
    }

    requestAnimationFrame(updateLogic);
}

function startSpinning(now) {
    state = 'SPINNING';
    wheel.classList.add('is-active');
    arrow.classList.add('visible');
    labelDisplay.textContent = 'Крутим...';
    
    animationStartTime = now;
    startRotation = currentRotation;

    const targetIndex = Math.floor(Math.random() * TOTAL_ITEMS);
    setWinnerColor(targetIndex);

    const rotations = 5; 
    const baseSpins = rotations * 360;
    const randomOffset = (Math.random() - 0.5) * (ITEM_ANGLE - 1); 
    
    // Формула: текущий круг + обороты + (360 - угол целевой ячейки)
    targetRotation = Math.ceil(startRotation / 360) * 360 + baseSpins + (360 - targetIndex * ITEM_ANGLE) + randomOffset;
}

function resetToCountdown() {
    state = 'COUNTDOWN';
    wheel.classList.remove('is-active');
    timeLeft = COUNTDOWN_DURATION;
    arrow.classList.remove('visible');
    labelDisplay.textContent = 'До начала раунда';
    
    // Сброс визуальных ставок
    document.getElementById('total-bet-yellow').innerText = "0.00";
    document.getElementById('total-bet-blue').innerText = "0.00";
    document.getElementById('total-bet-green').innerText = "0.00";
}

function updateLiftingEffect() {
    if (state === 'COUNTDOWN') {
        items.forEach(item => item.classList.remove('lifted'));
        return;
    }

    let closestIndex = -1;
    let minDifference = Infinity;

    for (let i = 0; i < TOTAL_ITEMS; i++) {
        let itemAbsoluteAngle = (i * ITEM_ANGLE + currentRotation) % 360;
        if (itemAbsoluteAngle < 0) itemAbsoluteAngle += 360;

        let difference = Math.min(itemAbsoluteAngle, 360 - itemAbsoluteAngle);
        if (difference < minDifference) {
            minDifference = difference;
            closestIndex = i;
        }
    }

    items.forEach((item, index) => {
        index === closestIndex ? item.classList.add('lifted') : item.classList.remove('lifted');
    });
}

// --- ЛОГИКА СТАВОК И ВЫИГРЫША ---
function setWinnerColor(targetIndex) {
    const item = items[targetIndex];
    if (item.classList.contains('yellow'))winnerColor = 'yellow';
    else if (item.classList.contains('blue')) winnerColor = 'blue';
    else if (item.classList.contains('green')) winnerColor = 'green';
}

function calculateResult() {
    let currentBalance = Number(balicDisplay.innerText);

    for (let [color, betAmount] of possibleWnnings) {
        if (winnerColor === color) {
            const multiplier = (color === 'yellow') ? 14 : 2;
            currentBalance += betAmount * multiplier;
        }
    }

    balicDisplay.innerText = currentBalance.toFixed(2);
    possibleWnnings.clear();
    winnerColor = null;
}

// --- ОБРАБОТЧИКИ КНОПОК ---
function updateBetInput(modifier) {
    const input = document.getElementById('bet-value');
    const balance = Number(balicDisplay.innerText);
    let val = Number(input.value);

    switch(modifier) {
        case 'plus': val += 1; break;
        case 'minus': val = Math.max(0, val - 1); break;
        case 'half': val = val / 2; break;
        case 'x2': val = val * 2; break;
        case 'all': val = balance; break;
    }

    input.value = Math.min(val, balance).toFixed(2);
}

// Привязка к вашим старым названиям функций для совместимости
function plusBtnClick() { updateBetInput('plus'); }
function minusBtnClick() { updateBetInput('minus'); }
function semiBtnClick() { updateBetInput('half'); }
function x2BtnClick() { updateBetInput('x2'); }
function allinBtnClick() { updateBetInput('all'); }

function placeBet(color) {
    const input = document.getElementById('bet-value');
    const amount = Number(input.value);
    const balance = Number(balicDisplay.innerText);

    if (state === "COUNTDOWN" && amount > 0 && balance >= amount) {
        balicDisplay.innerText = (balance - amount).toFixed(2);
        
        // Суммируем ставку, если игрок ставит несколько раз на один цвет
        const existingBet = possibleWnnings.get(color) || 0;
        possibleWnnings.set(color, existingBet + amount);
        
        const displayId = `total-bet-${color}`;
        document.getElementById(displayId).innerText = (Number(document.getElementById(displayId).innerText) + amount).toFixed(2);
        
        input.value = 0;
    }
}

function choiseBtnYellow() { placeBet('yellow'); }
function choiseBtnGreen() { placeBet('green'); }
function choiseBtnBlue() { placeBet('blue'); }

function doButtonsToggleActive(isActive) {
    const buttons = ['bet-yellow', 'bet-blue', 'bet-green'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        isActive ? btn.classList.remove('is-unactive') : btn.classList.add('is-unactive');
    });
}

// --- ЗАПУСК ---

initWheel();
requestAnimationFrame(updateLogic);