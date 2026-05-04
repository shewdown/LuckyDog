const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const {
    setubDb,
    registerUser,
    getUserByLogin,
    registerGame,
    getGamesHistory,
    registerBet
} = require('./database');

// ───────────────────────────── Константы ─────────────────────────────

const HISTORY_FILE = './history.json';
const TOTAL_ITEMS = 40;
const SPIN_DURATION = 10000;
const WAIT_DURATION = 5000;
const COUNTDOWN_DURATION = 10;

// ───────────────────────────── Состояние игры ─────────────────────────────

let db;
let gameState = {};
let state = 'COUNTDOWN';
let timeLeft = COUNTDOWN_DURATION;
let winnerIndex = null;
let winnerColor = null;
let lastRotation = 0;

// ───────────────────────────── Middleware ─────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ───────────────────────────── Роуты ─────────────────────────────

app.get('/get-history', async (req, res) => {
    const history = await getGamesHistory(db);
    res.json(history);
});

app.post('/api/register', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password)
        return res.status(400).json({ success: false, error: "Заполните все поля!" });

    if (login.length < 3)
        return res.status(400).json({ success: false, error: "Логин слишком короткий" });

    try {
        await registerUser(db, login, password);
        res.json({ success: true, message: "Регистрация успешна! Теперь вы можете войти." });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;

    if (!login || !password)
        return res.status(400).json({ success: false, error: "Заполните все поля!" });

    try {
        const user = await getUserByLogin(db, login);

        if (!user)
            return res.status(400).json({ success: false, error: "Пользователь не найден" });

        if (user.pass !== password)
            return res.status(400).json({ success: false, error: "Неверный пароль" });

        res.json({ success: true, login: user.login, balance: user.balance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

app.post('/api/bet', async (req, res) => {
    const { login, amount, color } = req.body;

    if (state !== 'COUNTDOWN')
        return res.status(400).json({ error: "Ставки закрыты, идёт раунд!" });

    if (amount <= 0)
        return res.status(400).json({ error: "Сумма должна быть больше 0" });

    try {
        const result = await registerBet(db, login, amount, color);
        res.json({ success: true, newBalance: result.newBalance });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// ───────────────────────────── Socket.IO ─────────────────────────────

io.on('connection', (socket) => {
    socket.emit('sync-game', gameState);
});

// ───────────────────────────── Игровой цикл ─────────────────────────────

setInterval(() => {
    if (state === 'COUNTDOWN') {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            startSpinning();
        }
    }

    if (state === 'WAITING') {
        timeLeft -= 0.1;
        if (timeLeft <= 0) resetGame();
    }

    io.emit('gameTick', {
        state,
        timeLeft: timeLeft.toFixed(1),
        winnerIndex,
        winnerColor
    });
}, 100);

async function startSpinning() {
    state = 'SPINNING';

    winnerIndex = Math.floor(Math.random() * TOTAL_ITEMS);
    winnerColor = getColorByIndex(winnerIndex);

    const ITEM_ANGLE = 360 / TOTAL_ITEMS;
    const targetRotation = Math.ceil(lastRotation / 360) * 360
        + 5 * 360
        + (360 - winnerIndex * ITEM_ANGLE);

    gameState = {
        state: 'SPINNING',
        startTime: Date.now(),
        startRotation: lastRotation,
        targetIndex: winnerIndex,
        targetRotation,
        duration: SPIN_DURATION
    };

    io.emit('commandSpin', gameState);

    setTimeout(async () => {
        state = 'WAITING';
        timeLeft = WAIT_DURATION / 1000;
        lastRotation = targetRotation;
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

// ───────────────────────────── Вспомогательные функции ─────────────────────────────

function getColorByIndex(i) {
    if (i % 10 === 0) return 'yellow';
    return i % 2 === 1 ? 'blue' : 'green';
}

function saveResultToFile(color) {
    let history = [];

    if (fs.existsSync(HISTORY_FILE)) {
        try {
            const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
            history = raw ? JSON.parse(raw) : [];
        } catch {
            history = [];
        }
    }

    history.unshift({ winnerColor: color, date: new Date().toLocaleString() });
    history = history.slice(0, 30);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// ───────────────────────────── Запуск ─────────────────────────────

setubDb().then((database) => {
    db = database;
    server.listen(3000, () => console.log('Сервер: http://localhost:3000'));
});