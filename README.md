# Vex Tag-Server (Railway)

Backend für `Vexzron_pink.lua` – verbindet Spieler im gleichen Server für Nametags.

### Endpoints
- `POST /register` `{username, userId, placeId, jobId, theme}`
- `GET /users` → `{users:[...]}` – optional `?jobId=xxx` für nur gleichen Server
- `GET /` → Status

### Deploy auf Railway (2 Min)
1. Diesen Ordner `tag-server/` auf GitHub pushen (eigenes Repo)
2. Railway → New Project → Deploy from Repo → Repo wählen
3. Networking → Generate Domain → URL kopieren, z.B. `https://xxx.up.railway.app`
4. Test: `https://xxx.up.railway.app/users` muss `{"users":[]}` zeigen

### In Roblox-Lua ändern
In `Vexzron_pink.lua` Zeile 72:
```lua
local SERVER_URL = "https://xxx.up.railway.app"
```

Für nur-gleicher-Server in `updateTags()` filtern (siehe `lua-patch.lua`):
```lua
if data[uid] and (data[uid].jobId == "" or data[uid].jobId == game.JobId) then
```

Wichtig: Tags sieht nur wer das Script ausführt (BillboardGui wird lokal erstellt).

### Admin-Dashboard: Loader-Code selbst aktualisieren
1. Railway → Service → `Variables` → setzen:
   - `ADMIN_PASSWORD` = dein Passwort (frei wählen)
   - `LOADER_URL` = `https://load.vexyron-official.workers.dev`
   - `LOADER_TOKEN` = Token aus `worker.js`
2. Neu deployen lassen, dann `https://xxx.up.railway.app/admin` öffnen
3. Passwort eingeben → Code einfügen → `Loader aktualisieren`

Ohne diese 3 Variablen bleibt `/admin` deaktiviert (Tag-Server läuft trotzdem).
