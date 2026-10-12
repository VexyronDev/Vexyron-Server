// Vexyron-Server — läuft auf Railway
// POST /register {username,userId,placeId,jobId,theme} — Spieler meldet sich an
// GET  /users[?jobId=...]                              — wer ist online
// GET  /                                               — Status

const express = require("express");
const cors = require("cors");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || "./users.json";

// Eintrag bleibt 90s gültig (Script meldet sich alle 5s).
// Puffert Neustarts und Lag, ohne Geister-Einträge ewig zu behalten.
const TIMEOUT_MS = 90 * 1000;

// Aufräum-Intervall
const CLEANUP_MS = 60 * 1000;

// userId -> { username, userId, placeId, jobId, theme, lastSeen }
const users = new Map();

function loadUsers() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!Array.isArray(saved)) return;
    for (const entry of saved) {
      if (entry && entry.userId) users.set(String(entry.userId), entry);
    }
    console.log(`Geladen: ${users.size} Einträge aus ${DATA_FILE}`);
  } catch {
    console.log("Kein Speicher gefunden, starte leer.");
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...users.values()]));
  } catch {
    // egal — läuft auch ohne Speichern weiter
  }
}

function pruneUsers() {
  const now = Date.now();
  for (const [id, entry] of users) {
    if (now - entry.lastSeen > TIMEOUT_MS) users.delete(id);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, online: users.size, endpoints: ["GET /users", "POST /register"] });
});

app.post("/register", (req, res) => {
  const { username, userId, placeId, jobId, theme } = req.body || {};
  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId fehlt" });
  }
  users.set(String(userId), {
    username: String(username || ""),
    userId: String(userId),
    placeId: String(placeId || ""),
    jobId: String(jobId || ""),
    theme: String(theme || "Yellow"),
    lastSeen: Date.now(),
  });
  saveUsers();
  res.json({ ok: true });
});

app.get("/users", (req, res) => {
  pruneUsers();
  let list = [...users.values()];
  if (req.query.jobId) {
    list = list.filter((entry) => entry.jobId === String(req.query.jobId));
  }
  res.json({ users: list });
});

loadUsers();
setInterval(pruneUsers, CLEANUP_MS);

app.listen(PORT, () => console.log(`Tag-Server läuft auf Port ${PORT}`));
