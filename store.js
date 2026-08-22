const { DatabaseSync } = require("node:sqlite");

function createStore(dbPath = "aniquiz.db") {
  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT, channel_id TEXT, role TEXT, content TEXT, ts INTEGER
    );
    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT, fact TEXT
    );
    CREATE TABLE IF NOT EXISTS scores (
      uid TEXT PRIMARY KEY, name TEXT, score INTEGER DEFAULT 0, matches INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, id);
  `);

  return {
    addMessage(userId, channelId, role, content) {
      db.prepare(
        "INSERT INTO messages (user_id, channel_id, role, content, ts) VALUES (?, ?, ?, ?, ?)"
      ).run(userId, channelId, role, content, Date.now());
    },
    getHistory(userId, limit = 16) {
      const rows = db
        .prepare(
          "SELECT role, content FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?"
        )
        .all(userId, limit);
      return rows.reverse();
    },
    clearUser(userId) {
      db.prepare("DELETE FROM messages WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM facts WHERE user_id = ?").run(userId);
    },
    addFact(userId, fact) {
      db.prepare("INSERT INTO facts (user_id, fact) VALUES (?, ?)").run(userId, fact);
    },
    getFacts(userId) {
      return db
        .prepare("SELECT fact FROM facts WHERE user_id = ? ORDER BY id")
        .all(userId)
        .map((r) => r.fact);
    },
    addScorePoint(uid, name) {
      db.prepare(
        `INSERT INTO scores (uid, name, score, matches) VALUES (?, ?, 1, 1)
         ON CONFLICT(uid) DO UPDATE SET score = score + 1, matches = matches + 1, name = excluded.name`
      ).run(uid, name);
    },
    topScores(limit = 10) {
      return db
        .prepare("SELECT uid, name, score, matches FROM scores ORDER BY score DESC LIMIT ?")
        .all(limit);
    },
    trimHistory(userId, keep = 200) {
      db.prepare(
        `DELETE FROM messages WHERE user_id = ? AND id NOT IN (
           SELECT id FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?
         )`
      ).run(userId, userId, keep);
    },
    close() {
      db.close();
    },
  };
}

module.exports = { createStore };
