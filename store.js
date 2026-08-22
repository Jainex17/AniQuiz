const sqlite3 = require("sqlite3");

function createStore(dbPath = "aniquiz.db") {
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, channel_id TEXT, role TEXT, content TEXT, ts INTEGER)"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS facts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, fact TEXT)"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS scores (uid TEXT PRIMARY KEY, name TEXT, score INTEGER DEFAULT 0, matches INTEGER DEFAULT 0)"
    );
    db.run("CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, id)");
  });

  const run = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      })
    );

  const all = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
    );

  return {
    async addMessage(userId, channelId, role, content) {
      await run(
        "INSERT INTO messages (user_id, channel_id, role, content, ts) VALUES (?, ?, ?, ?, ?)",
        [userId, channelId, role, content, Date.now()]
      );
    },
    async getHistory(userId, limit = 16) {
      const rows = await all(
        "SELECT role, content FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?",
        [userId, limit]
      );
      return rows.reverse();
    },
    async clearUser(userId) {
      await run("DELETE FROM messages WHERE user_id = ?", [userId]);
      await run("DELETE FROM facts WHERE user_id = ?", [userId]);
    },
    async addFact(userId, fact) {
      await run("INSERT INTO facts (user_id, fact) VALUES (?, ?)", [userId, fact]);
    },
    async getFacts(userId) {
      const rows = await all("SELECT fact FROM facts WHERE user_id = ? ORDER BY id", [userId]);
      return rows.map((r) => r.fact);
    },
    async addScorePoint(uid, name) {
      await run(
        `INSERT INTO scores (uid, name, score, matches) VALUES (?, ?, 1, 1)
         ON CONFLICT(uid) DO UPDATE SET score = score + 1, matches = matches + 1, name = excluded.name`,
        [uid, name]
      );
    },
    async topScores(limit = 10) {
      return all("SELECT uid, name, score, matches FROM scores ORDER BY score DESC LIMIT ?", [
        limit,
      ]);
    },
    async trimHistory(userId, keep = 200) {
      await run(
        `DELETE FROM messages WHERE user_id = ? AND id NOT IN (
           SELECT id FROM messages WHERE user_id = ? ORDER BY id DESC LIMIT ?
         )`,
        [userId, userId, keep]
      );
    },
    close() {
      return new Promise((resolve) => db.close(resolve));
    },
  };
}

module.exports = { createStore };
