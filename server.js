const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const { constants } = require('buffer');

const {setubDb, registerUser, getUserByLogin, registerGame, getGamesHistory, registerBet, getCurrentGame} = require('./database');
const { error } = require('console');
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
app.get('/get-history', async (req, res) => {
    const history = await getGamesHistory(db);
    res.json(history);
});

app.post('/api/bet', async (req, res) => {
    const { login, amount, color } = req.body;

    if (state !== "COUNTDOWN") {
        return res.status(400).json({ error: "Ставки закрыты, идет раунд!" });
    }
    if (amount <= 0) {
        return res.status(400).json({ error: "Сумма должна быть больше 0" });
    }

    try {
        const result = await registerBet(db, login, amount, color);
        res.json({ success: true, newBalance: result.newBalance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
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

async function startSpinning() {
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

    setTimeout(async() => {
        state = 'WAITING';
        lastRotation = targetRotation;
        timeLeft = WAIT_DURATION / 1000;
        gameState.state = 'WAITING';

        await registerGame(db, winnerColor, winnerIndex);
        
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