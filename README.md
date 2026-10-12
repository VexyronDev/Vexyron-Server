# Vexyron-Server (Railway)

Backend für `Vexyron.lua` – verbindet Spieler im gleichen Server für Nametags.

Gepflegt wird nur noch `Vexyron.v2.lua` (enthält zusätzlich „Hide Nametags“).

### Was der Server tut
- `POST /register` – Spieler meldet sich an (`username, userId, placeId, jobId, theme`)
- `GET /users` – alle angemeldeten Spieler, optional `?jobId=xxx` für nur den gleichen Server
- `GET /` – Status (`online`-Zähler)
- Einträge laufen nach 90s ohne Update ab und werden in `users.json` zwischengespeichert (überlebt Neustarts)

### Live
- Server: `https://web-production-563dd.up.railway.app`
- Loader: `https://load.vexyron-official.workers.dev`
- Test: `/users` muss `{"users":[...]}` zeigen (leer wenn keiner im Spiel ist)

### Script verteilen (Loader)
1. `Vexyron.v2.lua` ändern
2. Auf Obfuskat-Website verschleiern
3. Als `loader/obfuscated.lua` ins Repo legen (oder per `curl` auf `/update` laden)
4. Gleicher Loadstring, keine Änderung im Spiel nötig:
```lua
loadstring(game:HttpGet("https://load.vexyron-official.workers.dev/?v=" .. os.time(), true))()
```

### Wichtig
- Tags sieht nur, wer das Script ausführt (BillboardGui wird lokal erstellt)
- Jeder im Server braucht das Script mit gleicher `SERVER_URL`, sonst fehlt er in `/users`
