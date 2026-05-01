const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function setubDb() {
    const db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });
    await db.exec(`
        DROP TABLE users;
        DROP TABLE games;
        DROP TABLE bets;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT NOT NULL,
            pass TEXT NOT NULL,
            name TEXT,
            balance FLOAT DEFAULT 500,
            avatar_path TEXT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            winner_color TEXT NOT NULL,
            winner_index INTEGER NOT NULL,
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_id INTEGER,
            amount FLOAT NOT NULL,
            chosen_color TEXT NOT NULL,
            win_amount FLOAT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (game_id) REFERENCES games(id)
        );

        INSERT INTO users (login, pass) VALUES ('1', '1')
    `);

    return db;
}

// Функции для работы с БД

async function registerUser(db, login, password) {
    return db.run(
        'INSERT INTO users (login, pass) VALUES (?, ?)',
        [login, password]
    );
}

async function getUserByLogin(db, login) {
    try {
        const user = db.get(
            'SELECT * FROM users WHERE login = ?', [login]
        );

        return user;
    }
    catch(err){
        console.error("Ошибка при поиске пользователя:", err);
        throw err;
    }
}

async function registerGame(db, winner_color, winner_index) {
    return db.run(
        'INSERT INTO games (winner_color, winner_index) VALUES (?, ?)',
        [winner_color, winner_index]
    );
}

async function registerBet(db, login, amount, chosen_color) {
    const user = await getUserByLogin(db, login);
    if (!user) throw new Error('Пользователь не найден');
    const userId = user.id;

    if(user.balance < amount) {
        throw new Error('Недостаточно средств');
    }
    
    await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

    const result = await db.run(
        'INSERT INTO bets (user_id, amount, chosen_color) VALUES (?, ?, ?)',
        [userId, amount, chosen_color]
    );

    return { betId: result.lastID, newBalance: user.balance - amount };
}

async function getGamesHistory(db) {
    return db.all('SELECT winner_color FROM games ORDER BY played_at DESC LIMIT 30');
}

async function getCurrentGame(db) {
    return db.get('SELECT * FROM games');
}

module.exports = {
    setubDb,
    registerUser,
    getUserByLogin,
    registerGame,
    getGamesHistory,
    registerBet,
    getCurrentGame
};