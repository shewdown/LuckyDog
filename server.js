const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const { constants } = require('buffer');

const {setubDb, registerUser, getUserByLogin, registerGame} = require('./database');
let db;

const TOTAL_ITEMS = 40;
const SPIN_DURATION = 10000;
const WAIT_DURATION = 5000;
const COUNTDOWN_DURATION = 10;

let gameHistory = [];
let state = 'COUNTDOWN'; 
let timeLeft = COUNTDOWN_DURATION;
let winnerIndex = null;
let winnerColor = null;
let lastRotation = 0;

let gameState = {};

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

const FILE_PATH = './history.json';

// 1. Получение истории (GET)
app.get('/get-history', (req, res) => {
    if (!fs.existsSync(FILE_PATH)) {
        return res.json([]);
    }
    const data = fs.readFileSync(FILE_PATH);
    res.json(JSON.parse(data));
});

io.on('connection', (socket) => {
    socket.emit('sync-game', gameState);
});

function getColorByIndex(i) {
    if (i % 10 === 0) return 'yellow';
    return (i % 2 === 1) ? 'blue' : 'green';
}

setInterval(() => {
    if (state === 'COUNTDOWN') {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            startSpinning();
        }
    } else if (state === 'WAITING') {
        timeLeft -= 0.1;
        if (timeLeft <= 0) resetGame();
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

    const ITEM_ANGLE = 360 / TOTAL_ITEMS;
    const rotations = 5;
    const baseSpins = rotations * 360;
    const targetRotation = Math.ceil(lastRotation / 360) * 360 + baseSpins + (360 - winnerIndex * ITEM_ANGLE);

    gameState = {
        state: 'SPINNING',
        startTime: Date.now(),
        targetIndex: winnerIndex,
        targetRotation: targetRotation,
        startRotation: lastRotation,
        duration: SPIN_DURATION
    };

    io.emit('commandSpin', gameState);

    setTimeout(() => {
        state = 'WAITING';
        lastRotation = targetRotation;
        timeLeft = WAIT_DURATION / 1000;
        gameState.state = 'WAITING';
        saveResultToFile(winnerColor);
    }, SPIN_DURATION);
}

function resetGame() {
    state = 'COUNTDOWN';
    timeLeft = COUNTDOWN_DURATION;
    winnerIndex = null;
    winnerColor = null;
}

function saveResultToFile(color) {
    let history = [];
    if (fs.existsSync(FILE_PATH)) {
        try {
            const data = fs.readFileSync(FILE_PATH, 'utf8');
            history = data ? JSON.parse(data) : [];
        } catch (e) { history = []; }
    }

    history.unshift({ winnerColor: color, date: new Date().toLocaleString() });
    history = history.slice(0, 30);
    fs.writeFileSync(FILE_PATH, JSON.stringify(history, null, 2));
}

// База данных

app.post('/api/register', async (req, res) => {
    try {
        const { login, password } = req.body;
        await registerUser(db, login, password);
        res.json({ success: true, message: "Пользователь создан!" });
    } catch (err) {
        res.status(400).json({ success: false, error: "Логин занят или ошибка БД" });
    }
});

// Запуск
setubDb().then((database) => {
    db = database;

    http.listen(3000, () => {
        console.log('Сервер: http://localhost:3000');
    });
});