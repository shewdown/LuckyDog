const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// ───────────────────────────── Инициализация БД ─────────────────────────────

async function setubDb() {
    const db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER  PRIMARY KEY AUTOINCREMENT,
            login        TEXT     NOT NULL UNIQUE,
            pass         TEXT     NOT NULL,
            name         TEXT,
            balance      FLOAT    DEFAULT 500,
            avatar_path  TEXT     DEFAULT 0,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS games (
            id           INTEGER  PRIMARY KEY AUTOINCREMENT,
            winner_color TEXT     NOT NULL,
            winner_index INTEGER  NOT NULL,
            played_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bets (
            id           INTEGER  PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER  NOT NULL,
            game_id      INTEGER,
            amount       FLOAT    NOT NULL,
            chosen_color TEXT     NOT NULL,
            win_amount   FLOAT    DEFAULT 0,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (game_id) REFERENCES games(id)
        );
    `);

    return db;
}

// ───────────────────────────── Пользователи ─────────────────────────────

async function registerUser(db, login, password) {
    return db.run(
        'INSERT INTO users (login, pass) VALUES (?, ?)',
        [login, password]
    );
}

async function getUserByLogin(db, login) {
    try {
        return await db.get('SELECT * FROM users WHERE login = ?', [login]);
    } catch (err) {
        console.error("Ошибка при поиске пользователя:", err);
        throw err;
    }
}

// ───────────────────────────── Игры ─────────────────────────────

async function registerGame(db, winner_color, winner_index) {
    const result = await db.run(
        'INSERT INTO games (winner_color, winner_index) VALUES (?, ?)',
        [winner_color, winner_index]
    );
    return result.lastID;
}

async function getGamesHistory(db) {
    return db.all(
        'SELECT winner_color FROM games ORDER BY played_at DESC LIMIT 30'
    );
}

async function getCurrentGame(db) {
    return db.get('SELECT * FROM games');
}

// ───────────────────────────── Ставки ─────────────────────────────

async function registerBet(db, login, amount, chosen_color) {
    const user = await getUserByLogin(db, login);

    if (!user) throw new Error('Пользователь не найден');
    if (user.balance < amount) throw new Error('Недостаточно средств');

    await db.run(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [amount, user.id]
    );

    const result = await db.run(
        'INSERT INTO bets (user_id, amount, chosen_color) VALUES (?, ?, ?)',
        [user.id, amount, chosen_color]
    );

    const updated = await getUserByLogin(db, login);

    return { betId: result.lastID, newBalance: updated.balance };
}

async function payoutWinners(db, winnerColor, gameId) {
    const multiplier = winnerColor === 'yellow' ? 14 : 2;

    await db.run(
        'UPDATE bets SET game_id = ? WHERE game_id IS NULL',
        [gameId]
    );

    const winners = await db.all(
        'SELECT * FROM bets WHERE game_id = ? AND chosen_color = ?',
        [gameId, winnerColor]
    );

    for (const bet of winners) {
        const winAmount = bet.amount * multiplier;

        await db.run(
            'UPDATE users SET balance = balance + ? WHERE id = ?',
            [winAmount, bet.user_id]
        );

        await db.run(
            'UPDATE bets SET win_amount = ? WHERE id = ?',
            [winAmount, bet.id]
        );
    }
}
// ───────────────────────────── Экспорт ─────────────────────────────

module.exports = {
    setubDb,
    registerUser,
    getUserByLogin,
    registerGame,
    getGamesHistory,
    registerBet,
    getCurrentGame,
    payoutWinners
};