const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function setubDb() {
    const db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });
    await db.exec(`
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
            is_win BOOLEAN DEFAULT 0,
            win_amount FLOAT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (game_id) REFERENCES games(id)
        );
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

async function getUserByLogin(bd, login) {
    try {
        const user = db.get(
            'SELECT * FROM users WHERE login = ?' [login]
        );
        return user;
    }
    catch(err){
        console.error("Ошибка при поиске пользователя:", error);
        throw error;
    }
}

async function registerGame(db, winner_color, winner_index) {
    return db.run(
        'INSERT INTO games (winner_color, winner_index) VALUES (?, ?)',
        [winner_color, winner_index]
    );
}

async function registerBet(db, login, game_id, amount, chosen_color, is_win, win_amount) {
    const user = getUserByLogin(login);
    const user_id = user.id;
    
    return db.run(
        'INSERT INTO bets (user_id, game_id, amount, chosen_color, is_win, win_amount) VALUES (?, ?)',
        []
    );
}

module.exports = {
    setubDb,
    registerUser,
    getUserByLogin,
    registerGame
};