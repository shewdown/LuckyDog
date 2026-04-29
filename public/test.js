let state = 'COUNTDOWN';
let timeLeft = 0;
let winnerColor = null;

const TOTAL_ITEMS = 40;
const ITEM_ANGLE = 360 / TOTAL_ITEMS;
const SPIN_DURATION = 10000;
const WAIT_DURATION = 5000;

const wheel = document.getElementById('wheel');
const timeDisplay = document.getElementById('timeDisplay');
const labelDisplay = document.getElementById('labelDisplay');
const arrow = document.getElementById('arrow');

const iconRunner = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>`;
const iconWings = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M11.99 15.35c-1.42 0-2.82.5-3.9 1.45-1.57-4.04-4.83-7.23-8.09-8.47 1.54 1.57 2.68 3.55 3.32 5.75.5-1.73 1.57-3.21 3.03-4.14-1.25 1.5-1.63 3.66-1 5.58 2.36-1.53 4.96-1.12 6.64.18 1.68-1.3 4.28-1.71 6.64-.18.63-1.92.25-4.08-1-5.58 1.46.93 2.53 2.41 3.03 4.14.64-2.2 1.78-4.18 3.32-5.75-3.26 1.24-6.52 4.43-8.09 8.47-1.08-.95-2.48-1.45-3.9-1.45z"/></svg>`;
const iconSwords = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L12 2z" transform="scale(0.5) translate(12, 0)"/><path d="M7 21l10-10m-10 0l10 10" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round"/></svg>`;

const items = [];
let currentRotation = 0;
let startRotation = 0;
let targetRotation = 0;
let animationStartTime = 0;
let lastFrameTime = performance.now();

initWheel(); // Инициализируем колесо

const socket = io(); // Подключаемся к серверу

requestAnimationFrame(updateLogic); // запускаем цикл отрисовки анимаций

// Слушаем тики сервера
socket.on('gameTick', (data) => {
    state = data.state;
    
    if (state === 'COUNTDOWN') {
        timeLeft = data.timeLeft;
        timeDisplay.textContent = timeLeft + 's';
        labelDisplay.textContent = 'До начала раунда';
    }
    
    if (state === 'WAITING') {
        labelDisplay.textContent = 'Поздравляем победителей!';
    }
});

// Слушаем конкретную команду на старт вращения
socket.on('commandSpin', (data) => {
    startSpinningFromServer(data.targetIndex);
});

function startSpinningFromServer(targetIndex) {
    state = 'SPINNING';
    wheel.classList.add('is-active');
    arrow.classList.add('visible');
    labelDisplay.textContent = 'Крутим...';
    
    animationStartTime = performance.now();
    startRotation = currentRotation;

    setWinnerColor(targetIndex);

    const rotations = 5; 
    const baseSpins = rotations * 360;

    targetRotation = Math.ceil(startRotation / 360) * 360 + baseSpins + (360 - targetIndex * ITEM_ANGLE);
}

// Инициализация колеса
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

// цикл отрисовки анимаций
function updateLogic(now) {
    const dt = now - lastFrameTime;
    lastFrameTime = now;

    if (state === 'SPINNING') {
        let progress = (now - animationStartTime) / SPIN_DURATION;
        
        if (progress >= 1) {
            progress = 1;
            state = 'WAITING';
            
            addToHistory(winnerColor);
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

function setWinnerColor(targetIndex) {
    const item = items[targetIndex];
    if (item.classList.contains('yellow'))winnerColor = 'yellow';
    else if (item.classList.contains('blue')) winnerColor = 'blue';
    else if (item.classList.contains('green')) winnerColor = 'green';
}

function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

function resetVisuals() {
    wheel.classList.remove('is-active');
    arrow.classList.remove('visible');
}

function addToHistory(winnerColor){
    const history_games = document.getElementById('history-games-container');
    const history_game = document.createElement('div');
    history_game.classList.add('history-game');
    history_game.style.backgroundColor = `var(--${winnerColor})`;
    history_games.prepend(history_game);
}