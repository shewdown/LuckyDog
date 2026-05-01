const { getCurrentGame } = require("../database");

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
const balicDisplay = document.getElementById('balic');

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

requestAnimationFrame(updateLogic); // Запускаем цикл отрисовки анимаций

loadHistory();

socket.on('sync-game', (data) => {
    if (data.state === 'SPINNING') {
        const now = Date.now();
        const elapsed = now - data.startTime;

        timeDisplay.textContent = '';
        labelDisplay.textContent = 'Крутим...';

        if (elapsed < data.duration) {
            startSpinningFromServer(data.targetIndex, data.duration, elapsed);
        }
    }
    else{
        wheel.classList.add('is-active');
        currentRotation = data.targetRotation || 0;
        wheel.style.transform = `rotate(${currentRotation}deg)`;
    }
});

// Слушаем тики сервера
socket.on('gameTick', (data) => {
    state = data.state;
    
    if (state === 'COUNTDOWN') {
        timeLeft = data.timeLeft;
        wheel.classList.remove('is-active');
        timeDisplay.textContent = timeLeft + 's';
        labelDisplay.textContent = 'До начала раунда';
    }
    
    if (state === 'WAITING') {
        timeDisplay.textContent = '';
        labelDisplay.textContent = 'Поздравляем победителей!';
    }
});

// Слушаем команду на старт вращения
socket.on('commandSpin', (data) => {
    startSpinningFromServer(data.targetIndex, data.duration, 0, data.startRotation, data.targetRotation);
    
    timeDisplay.textContent = '';
    labelDisplay.textContent = 'Крутим...';
});

function startSpinningFromServer(targetIndex, duration, elapsed = 0) {
    state = 'SPINNING';
    wheel.classList.add('is-active');
    arrow.classList.add('visible');
    
    animationStartTime = performance.now() - elapsed; 
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
            if (i % 2 === 1) {
                type = 'blue';
                icon = iconWings;
            } else {
                type = 'green';
                icon = iconSwords;
            }
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
    if (targetIndex % 10 === 0) winnerColor = 'yellow';
    else winnerColor = (targetIndex % 2 === 1) ? 'blue' : 'green';
}

function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

function resetVisuals() {
    wheel.classList.remove('is-active');
    arrow.classList.remove('visible');
}

async function loadHistory() {
    const response = await fetch('http://localhost:3000/get-history');
    const history = await response.json();

    const historyContainer = document.getElementById('history-games-container');
    historyContainer.innerHTML = '';

    if(state === 'COUNTDOWN'){
        document.getElementById('total-bet-yellow').innerText = "0.00";
        document.getElementById('total-bet-blue').innerText = "0.00";
        document.getElementById('total-bet-green').innerText = "0.00";
    }

    history.forEach(game => {
        const div = document.createElement('div');
        div.classList.add('history-game');
        div.style.backgroundColor = `var(--${game.winner_color})`;
        historyContainer.appendChild(div);
    });
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

function plusBtnClick() { updateBetInput('plus'); }
function minusBtnClick() { updateBetInput('minus'); }
function semiBtnClick() { updateBetInput('half'); }
function x2BtnClick() { updateBetInput('x2'); }
function allinBtnClick() { updateBetInput('all'); }

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

async function placeBet(color) {
    const input = document.getElementById('bet-value');
    const amount = Number(input.value);
    
    const login = '1'; 

    try {
        const response = await fetch('/api/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, amount, color })
        });

        const data = await response.json();

        if (data.success) {
            balicDisplay.innerText = data.newBalance.toFixed(2);
            
            const displayId = `total-bet-${color}`;
            const currentTotal = Number(document.getElementById(displayId).innerText);
            document.getElementById(displayId).innerText = (currentTotal + amount).toFixed(2);
            
            console.log("Ставка принята!");
        } else {
            alert(data.error || "Ошибка при размещении ставки");
        }
    } catch (err) {
        console.error("Ошибка сети:", err);
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