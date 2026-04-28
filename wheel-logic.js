const wheel = document.getElementById('wheel');
const timeDisplay = document.getElementById('timeDisplay');
const labelDisplay = document.getElementById('labelDisplay');
const arrow = document.getElementById('arrow');

const totalItems = 36;
const items = [];

let winnerColor = null;

const iconRunner = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>`;
const iconWings = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M11.99 15.35c-1.42 0-2.82.5-3.9 1.45-1.57-4.04-4.83-7.23-8.09-8.47 1.54 1.57 2.68 3.55 3.32 5.75.5-1.73 1.57-3.21 3.03-4.14-1.25 1.5-1.63 3.66-1 5.58 2.36-1.53 4.96-1.12 6.64.18 1.68-1.3 4.28-1.71 6.64-.18.63-1.92.25-4.08-1-5.58 1.46.93 2.53 2.41 3.03 4.14.64-2.2 1.78-4.18 3.32-5.75-3.26 1.24-6.52 4.43-8.09 8.47-1.08-.95-2.48-1.45-3.9-1.45z"/></svg>`;
const iconSwords = `<svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.4-4.6 2.4.9-5.2-3.8-3.7 5.2-.8L12 2z" transform="scale(0.5) translate(12, 0)"/><path d="M7 21l10-10m-10 0l10 10" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round"/></svg>`;

let currentType = 0;

// Генерация ячеек
for (let i = 0; i < totalItems; i++) {
    const item = document.createElement('div');
    item.classList.add('item');

    let type, icon;
    // 4 желтых секции, остальные чередуются
    if (i % 9 === 0) {
        type = 'yellow';
        icon = iconRunner;
    } else {
        type = currentType === 0 ? 'blue' : 'teal';
        icon = currentType === 0 ? iconWings : iconSwords;
        currentType = 1 - currentType;
    }

    item.classList.add(type);
    item.innerHTML = icon;

    const angle = i * 10; // 360 / 36 = 10 градусов
    item.style.setProperty('--angle', `${angle}deg`);
    
    wheel.appendChild(item);
    items.push(item);
}

// Состояния: COUNTDOWN (отсчет 10с), SPINNING (крутится), WAITING (пауза 5с)
let state = 'COUNTDOWN';
let timeLeft = 10.0;

let currentRotation = 0;
let startRotation = 0;
let targetRotation = 0;
let animationStartTime = 0;

const SPIN_DURATION = 6000; // 6 секунд на прокрутку

// Функция плавного торможения
function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}

let lastFrameTime = performance.now();

function updateLogic(now) {
    let dt = now - lastFrameTime;
    lastFrameTime = now;

    if (state === 'COUNTDOWN') {
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
        
        if (progress >= 1) {
            getWinner();
            progress = 1;
            state = 'WAITING';
            labelDisplay.textContent = 'Ожидание...';
            animationStartTime = now; // Переиспользуем переменную для таймера ожидания
        }

        // Вычисляем текущий угол с плавным замедлением
        currentRotation = startRotation + (targetRotation - startRotation) * easeOutQuart(progress);
        wheel.style.transform = `rotate(${currentRotation}deg)`;
        
        updateLiftingEffect();
    } 
    else if (state === 'WAITING') {
        let waitProgress = (now - animationStartTime) / 1000;
        if (waitProgress >= 5) { // Ждем 5 секунд
            resetToCountdown();
        }
        // Ячейка-победитель остается приподнятой
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

    // Выбираем случайного победителя (индекс от 0 до 35)
    const targetIndex = Math.floor(Math.random() * totalItems);
    
    getWinnerColor(targetIndex);

    // Вращение по часовой стрелке. Ячейка с углом (i*10) будет в самом низу (0 градусов),
    // если итоговый поворот колеса компенсирует её угол.
    const rotations = 5; // Минимум 5 полных оборотов
    const baseSpins = rotations * 360;

    const randomOffset = (Math.random() - 0.5) * 9;
    
    targetRotation = Math.ceil(startRotation / 360) * 360 + baseSpins + (360 - targetIndex * 10) + randomOffset;
}

function resetToCountdown() {
    state = 'COUNTDOWN';
    wheel.classList.remove('is-active');
    timeLeft = 10.0;
    arrow.classList.remove('visible');
    labelDisplay.textContent = 'До начала раунда';
}

function updateLiftingEffect() {
    // Если идет отсчет до старта, убираем эффект со всех ячеек
    if (state === 'COUNTDOWN') {
        items.forEach(item => item.classList.remove('lifted'));
        return;
    }

    let closestIndex = -1;
    let minDifference = Infinity;

    // Находим ячейку, которая ближе всего к позиции 0 градусов (строго внизу под стрелкой)
    for (let i = 0; i < totalItems; i++) {
        let itemAbsoluteAngle = (i * 10 + currentRotation) % 360;
        if (itemAbsoluteAngle < 0) itemAbsoluteAngle += 360;

        // Расстояние до 0 (или 360) градусов
        let difference = Math.min(itemAbsoluteAngle, 360 - itemAbsoluteAngle);
        
        if (difference < minDifference) {
            minDifference = difference;
            closestIndex = i;
        }
    }

    // Применяем класс только к ближайшей ячейке
    items.forEach((item, index) => {
        if (index === closestIndex) {
            item.classList.add('lifted');
        } else {
            item.classList.remove('lifted');
        }
    });
}

// ставки

let choisenColor = null;

function getWinner() {
    if(winnerColor === choisenColor) {
        alert('победа, был цвет ' + winnerColor)
    }
    else if(winnerColor !== choisenColor) {
        alert('поражение, был цвет ' + winnerColor)
    }
    else if(choisenColor === null) {
        alert('цвет не выбран ' + winnerColor) 
    }

    winnerColor = null;
}

function choiseYellow() {
    if(state === "COUNTDOWN") {
        choisenColor = 'yellow'
    }
}

function choiseTeal() {
    if(state === "COUNTDOWN") {
        choisenColor = 'teal'
    }
}

function choiseBlue() {
    if(state === "COUNTDOWN") {
        choisenColor = 'blue'
    }
}

function getWinnerColor(targetIndex){
    if (items[targetIndex].classList.contains('yellow')) {
    winnerColor = 'yellow'
    } else if (items[targetIndex].classList.contains('blue')) {
    winnerColor = 'blue'
    } else if (items[targetIndex].classList.contains('teal')) {
    winnerColor = 'teal'
    }
}

// Запуск цикла
requestAnimationFrame(updateLogic);