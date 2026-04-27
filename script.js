function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', isActive);
}

function plusBtnClick() {
    const value = document.getElementById('bet-value');
    const balance = Number(document.getElementById('balic').innerText);
    
    if(Number(balance) >= value.value + 1){
        value.value = Number(value.value) + 1;
    }
    else {
        value.value = balance;
    }
}

function minusBtnClick() {
    const value = document.getElementById('bet-value');

    if(Number(value.value) > 0){
        value.value = Number(value.value) - 1;
    }
}

function semiBtnClick() {
    const value = document.getElementById('bet-value');

    value.value = Math.round(Number(value.value) / 2 * 100) / 100;
}

function allinBtnClick() {
    const value = document.getElementById('bet-value');
    const balance = Number(document.getElementById('balic').innerText);

    value.value = balance;
}

function x2BtnClick() {
    const value = document.getElementById('bet-value');
    const balance = Number(document.getElementById('balic').innerText);

    if(Number(balance) > Math.round(Number(value.value) * 2 * 100) / 100){
        value.value = Math.round(Number(value.value) * 2 * 100) / 100;
    }
    else {
        value.value = balance;
    }
}

function betInputClick() {
    console.log('asdad');
}

// логика ленты

const numbers = [1, 14, 2, 13, 3, 12, 4, 0, 11, 5, 10, 6, 9, 7, 8];
const cardFullWidth = 80 + (5 * 2); 
let timerId = null;
let timeLeft = 5;

function startTimer() {
    timeLeft = 5;

    updateTimerDisplay();

    timerId = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerId);
            document.getElementById('timer').textContent = `Крутим...`;
            startSpin();
        }
    }, 1000);
}

function updateTimerDisplay() {
    document.getElementById('timer').textContent = `До начала: ${timeLeft} сек`;
}

function startSpin() {
    const tape = document.getElementById('tape');
    const wrapper = document.querySelector('.roulette-container');
    
    document.querySelectorAll('.card.winner').forEach(card => {
            card.classList.remove('winner');
        });

    const rouletteWidth = wrapper.offsetWidth; 
    
    const winningNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const setIndex = 70; 
    const numberIndexInSet = numbers.indexOf(winningNumber);
    const totalCardsIndex = (setIndex * numbers.length) + numberIndexInSet;
    
    const targetX = (totalCardsIndex * cardFullWidth) + (cardFullWidth / 2) - (rouletteWidth / 2);

    const randomInnerShift = Math.floor(Math.random() * 50) - 25; 
    const finalX = targetX + randomInnerShift;

    tape.style.transition = 'none';
    tape.style.transform = 'translateX(0)';
    tape.offsetHeight; 

    tape.style.transition = 'transform 6s cubic-bezier(0.1, 0, 0.1, 1)';
    tape.style.transform = `translateX(-${finalX}px)`;

    setTimeout(() => {
        const allCards = tape.querySelectorAll('.card');
        const winningCard = allCards[totalCardsIndex];
        if (winningCard) winningCard.classList.add('winner');
    }, 6000);

    setTimeout(() => {
        startTimer();
    }, 7500);
}

function initTape() {
    const tape = document.getElementById('tape');
    const numbers = [1, 14, 2, 13, 3, 12, 4, 0, 11, 5, 10, 6, 9, 7, 8];
    const cardFullWidth = 80 + (5 * 2);

    tape.innerHTML = '';
    for (let i = 0; i < 80; i++) {
        numbers.forEach(num => {
            const card = document.createElement('div');
            card.className = `card ${getColor(num)}`;
            card.textContent = num;
            tape.appendChild(card);
        });
    }
}

function getColor(num) {
    if (num === 0) return 'green';
    return [1, 2, 3, 4, 5, 6, 7].includes(num) ? 'red' : 'black';
}

initTape();
startTimer();