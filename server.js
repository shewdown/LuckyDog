const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

// --- КОНСТАНТЫ ---
const TOTAL_ITEMS = 40;
const SPIN_DURATION = 10000;
const WAIT_DURATION = 5000;
const COUNTDOWN_DURATION = 10;

// Состояние игры на сервере
let state = 'COUNTDOWN'; 
let timeLeft = COUNTDOWN_DURATION;
let winnerIndex = null;
let winnerColor = null;

setInterval(() => {
    if (state === 'COUNTDOWN') {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            startSpinning();
        }
    } else if (state === 'WAITING') {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            resetGame();
        }
    }

    io.emit('gameTick', {
        state: state,
        timeLeft: timeLeft.toFixed(1),
        winnerIndex: winnerIndex,
        winnerColor: winnerColor
    });
}, 100);

function startSpinning() {
    state = 'SPINNING';
    winnerIndex = Math.floor(Math.random() * TOTAL_ITEMS);
    winnerColor = getColorByIndex(winnerIndex);

    io.emit('commandSpin', {
        targetIndex: winnerIndex,
        duration: SPIN_DURATION
    });

    setTimeout(() => {
        state = 'WAITING';
        timeLeft = WAIT_DURATION / 1000;
    }, SPIN_DURATION);
}

function resetGame() {
    state = 'COUNTDOWN';
    timeLeft = COUNTDOWN_DURATION;
    winnerIndex = null;
    winnerColor = null;
}