// Vex Tag Server - Railway ready
// Endpoints: POST /register, GET /users, GET /
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
// Eintrag gilt als online solange alle 90s ein /register kommt
// (Script sendet alle 5s, siehe Vexzron_pink.lua:4235)
// 90s puffert Railway-Neustarts und Lag, ohne Geister-Einträge ewig zu behalten
const TIMEOUT_MS = 90 * 1000;

// Map: userId -> { username, userId, placeId, jobId, theme, lastSeen }
const users = new Map();

// Persistenz: überlebt Railway-Neustarts (mit Volume auch Redeploys)
const fs = require("fs");
const DATA_FILE = process.env.DATA_FILE || "./users.json";
try {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const arr = JSON.parse(raw);
  if (Array.isArray(arr)) {
    for (const u of arr) {
      if (u && u.userId) users.set(String(u.userId), u);
    }
  }
  console.log("Geladen: " + users.size + " Einträge aus " + DATA_FILE);
} catch (e) {
  console.log("Kein Speicher gefunden, starte leer.");
}
function save() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...users.values()]));
  } catch (e) { /* ignorieren: läuft auch ohne Speichern */ }
}

app.get("/", (req, res) => {
  res.json({ ok: true, online: users.size, endpoints: ["GET /users", "POST /register"] });
});

app.post("/register", (req, res) => {
  const { username, userId, placeId, jobId, theme } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: "userId fehlt" });
  users.set(String(userId), {
    username: String(username || ""),
    userId: String(userId),
    placeId: String(placeId || ""),
    jobId: String(jobId || ""),
    theme: String(theme || "Yellow"),
    lastSeen: Date.now(),
  });
  save();
  res.json({ ok: true });
});

app.get("/users", (req, res) => {
  const now = Date.now();
  // abgelaufene rauswerfen
  for (const [k, v] of users) {
    if (now - v.lastSeen > TIMEOUT_MS) users.delete(k);
  }
  let list = [...users.values()];
  // optional: ?jobId=xxx -> nur gleicher Server
  if (req.query.jobId) {
    list = list.filter((u) => u.jobId === String(req.query.jobId));
  }
  res.json({ users: list });
});

// Cleanup alle 60s
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of users) {
    if (now - v.lastSeen > TIMEOUT_MS) users.delete(k);
  }
}, 60 * 1000);

app.listen(PORT, () => console.log("Tag-Server läuft auf Port " + PORT));
