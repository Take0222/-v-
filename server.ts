import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("knowledge.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age_distribution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS video_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    url TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Endpoints
  
  // Save Account Knowledge
  app.post("/api/accounts", (req, res) => {
    const { name, age_distribution, urls } = req.body;
    
    try {
      const insertAccount = db.prepare("INSERT INTO accounts (name, age_distribution) VALUES (?, ?)");
      const result = insertAccount.run(name, age_distribution);
      const accountId = result.lastInsertRowid;

      const insertUrl = db.prepare("INSERT INTO video_urls (account_id, url) VALUES (?, ?)");
      for (const url of urls) {
        if (url.trim()) {
          insertUrl.run(accountId, url.trim());
        }
      }

      res.json({ success: true, accountId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save account knowledge" });
    }
  });

  // List Accounts
  app.get("/api/accounts", (req, res) => {
    const accounts = db.prepare("SELECT * FROM accounts ORDER BY created_at DESC").all();
    res.json(accounts);
  });

  // Get Account Details
  app.get("/api/accounts/:id", (req, res) => {
    const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(req.params.id);
    if (!account) return res.status(404).json({ error: "Account not found" });

    const urls = db.prepare("SELECT url FROM video_urls WHERE account_id = ?").all(req.params.id);
    res.json({ ...account, urls: urls.map((u: any) => u.url) });
  });

  // Delete Account
  app.delete("/api/accounts/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM video_urls WHERE account_id = ?").run(req.params.id);
      db.prepare("DELETE FROM accounts WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
