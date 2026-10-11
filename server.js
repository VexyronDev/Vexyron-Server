// Vex Tag Server - Railway ready
// Endpoints: POST /register, GET /users, GET /
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Loader-Code kann mehrere 100KB groß sein

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

//============================================================
// ADMIN-DASHBOARD: Loader-Code selbst aktualisieren
// Env in Railway setzen: ADMIN_PASSWORD, LOADER_URL, LOADER_TOKEN
//============================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const LOADER_URL = (process.env.LOADER_URL || "").replace(/\/$/, "");
const LOADER_TOKEN = process.env.LOADER_TOKEN || "";
const adminReady = Boolean(ADMIN_PASSWORD && LOADER_URL && LOADER_TOKEN);
console.log("Admin-Dashboard: " + (adminReady ? "aktiv (/admin)" : "aus (Env fehlt)"));

function checkAdmin(req, res) {
  if (!adminReady) {
    res.status(503).json({ ok: false, error: "Admin nicht konfiguriert (Env fehlt)" });
    return null;
  }
  if ((req.body && req.body.password) !== ADMIN_PASSWORD) {
    res.status(401).json({ ok: false, error: "Falsches Passwort" });
    return null;
  }
  return true;
}

app.get("/admin", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vex Admin</title>
<style>
body{background:#0f0e13;color:#e8e4da;font-family:system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px}
h1{font-size:20px} .row{margin:12px 0}
input,textarea,button{width:100%;box-sizing:border-box;background:#1a1822;color:#e8e4da;border:1px solid #3a3548;border-radius:8px;padding:10px;font-size:14px}
textarea{height:220px;font-family:monospace;font-size:12px}
button{background:#6d28d9;border:none;font-weight:700;cursor:pointer;margin-top:8px}
button.ghost{background:#26232f}
#status{margin:12px 0;min-height:22px;font-size:14px}
.ok{color:#4ade80}.err{color:#f87171}
</style></head><body>
<h1>Vex Loader Admin</h1>
<div class="row">Online: <b id="online">-</b></div>
<div class="row"><input id="pw" type="password" placeholder="Admin-Passwort"></div>
<div class="row"><button class="ghost" onclick="loadCurrent()">Aktuellen Loader-Code laden</button></div>
<div class="row"><textarea id="code" placeholder="-- Lua-Code hier einfügen (plain oder obfuskiert)"></textarea></div>
<div class="row"><button onclick="pushUpdate()">Loader aktualisieren</button></div>
<div id="status"></div>
<script>
const say=(t,ok)=>{const s=document.getElementById('status');s.textContent=t;s.className=ok===true?'ok':ok===false?'err':'';};
async function refresh(){try{const r=await fetch('/');const j=await r.json();document.getElementById('online').textContent=j.online;}catch(e){}}
async function loadCurrent(){
  say('Lade...');const pw=document.getElementById('pw').value;
  const r=await fetch('/admin/current',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  const j=await r.json();
  if(!r.ok){say(j.error||'Fehler',false);return;}
  document.getElementById('code').value=j.code;say('Geladen ('+j.bytes+' Bytes)',true);
}
async function pushUpdate(){
  const pw=document.getElementById('pw').value;const code=document.getElementById('code').value;
  if(!code){say('Kein Code eingefügt',false);return;}
  if(!confirm('Loader wirklich mit '+code.length+' Bytes überschreiben?'))return;
  say('Lade hoch...');
  const r=await fetch('/admin/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw,code})});
  const j=await r.json();say(j.ok?'Loader aktualisiert':('Fehler: '+(j.error||'unbekannt')),!!j.ok);
}
refresh();setInterval(refresh,10000);
</script></body></html>`);
});

// Aktuellen Loader-Code lesen (nur mit Passwort)
app.post("/admin/current", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const r = await fetch(LOADER_URL + "/?v=" + Date.now());
    const code = await r.text();
    res.json({ ok: true, bytes: code.length, code });
  } catch (e) {
    res.status(502).json({ ok: false, error: "Loader nicht erreichbar" });
  }
});

// Neuen Loader-Code hochladen (nur mit Passwort)
app.post("/admin/update", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  const code = req.body && req.body.code;
  if (typeof code !== "string" || code.length === 0) {
    return res.status(400).json({ ok: false, error: "Kein Code" });
  }
  try {
    const r = await fetch(LOADER_URL + "/update", {
      method: "POST",
      headers: { "Authorization": "Bearer " + LOADER_TOKEN, "Content-Type": "text/plain" },
      body: code,
    });
    const text = await r.text();
    if (!r.ok) return res.status(502).json({ ok: false, error: "Loader: " + text });
    res.json({ ok: true, bytes: code.length });
  } catch (e) {
    res.status(502).json({ ok: false, error: "Loader nicht erreichbar" });
  }
});

// JSON-Fehler sauber als JSON melden (statt HTML-Stack)
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ ok: false, error: "Ungültiges JSON" });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ ok: false, error: "Code zu groß (max 10MB)" });
  }
  next(err);
});

app.listen(PORT, () => console.log("Tag-Server läuft auf Port " + PORT));
