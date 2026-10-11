// Vex Tag Server - Railway ready
// Endpoints: POST /register, GET /users, GET /
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
// Eintrag gilt als online solange alle 30s ein /register kommt
// (Script sendet alle 5s, siehe Vexzron_pink.lua:4235)
const TIMEOUT_MS = 30 * 1000;

// Map: userId -> { username, userId, placeId, jobId, theme, lastSeen }
const users = new Map();

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
