const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./repurposeflow.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT, -- 'url' or 'transcript'
        content TEXT,
        extracted_insights TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER,
        platform TEXT,
        content TEXT,
        status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'published'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_id) REFERENCES sources (id)
    )`);
});

module.exports = db;
