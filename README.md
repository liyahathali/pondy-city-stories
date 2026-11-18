# Pondy City Stories — Open-world Pondicherry (Three.js)

A GTA Vice City-inspired 3D open-world action game set in Pondicherry (Puducherry), playable in your browser.
Available in **English and Tamil (தமிழ்)**.

## How to play on your PC (localhost)
You need **Node.js** (https://nodejs.org) *or* **Python 3**. No other installs, no internet needed.

- **Windows:** double-click `start-windows.bat` → your browser opens **http://localhost:8080**
- **Mac / Linux:** run `./start-mac-linux.sh`
- **Manual:** open a terminal in this folder and run `node server.js` (or `python -m http.server 8080`), then open http://localhost:8080

Use Chrome, Edge or Firefox. Click inside the game to capture the mouse.
Opening `index.html` directly (double-click) will NOT work: browsers block ES modules from `file://`.

## Language / மொழி
Title screen → **தமிழ்** button, or *Settings → Language*. Menus, HUD, prompts, missions, NPC dialogue and place names switch instantly. Your choice is remembered.

## New in this version
- **Promenade, Gandhi statue, Old Lighthouse and White Town rebuilt from reference photos**: blue-chevron sea wall, granite boulders, palms and hedges, Gandhi Mandapam with its white canopy, 8 carved pillars and iron fence; mustard-yellow colonial houses with white pilasters, shutters and potted plants.
- **People**: women in sarees (pallu, border, jasmine in the hair) or salwar, men in shirts, lungis and veshtis, elderly people, umbrellas in the rain. Families stroll the promenade in the evening, people sit on benches, tea and sundal vendors call out.
- **NPCs speak Tamil** (speech bubble in Tamil with an English line underneath). They greet you, react to honking and bumping, and chat. **For spoken Tamil voices use Microsoft Edge**, which has built-in Tamil voices (Settings → NPC Tamil voices to turn off).
- **Vehicles**: real car silhouettes (hatchback, sedan, SUV), PY number plates (yellow for taxis/autos/buses), bus destination boards in Tamil, helmets, bicycles. Two-wheeler-heavy Pondy traffic.
- **Car radio** (press **R** in any vehicle): Pondy FM 98.3 (kuthu), Kadal Osai 91.1 (melodies), Bakthi FM 104.2 (devotional) — original music generated live in Carnatic ragas, with a Tamil-speaking RJ between songs — plus **My Music**: put your own MP3s in the `music` folder. See `music/README.txt` to add internet radio streams.

## Controls
| On foot | | Driving | |
|---|---|---|---|
| WASD / arrows | Move | W / S | Accelerate / brake & reverse |
| Mouse | Look | A / D | Steer |
| Shift | Run | Space | Handbrake (drift) |
| Space | Jump | H | Horn |
| C / Ctrl | Crouch | G | Police siren |
| Left click / Q | Punch | F | Exit vehicle |
| F | Enter / carjack | Mouse wheel | Camera zoom |
| E | Talk · buy chai · start mission | R | Change radio station |

General: **M** map (click for GPS waypoint) · **V** vehicle selection · **N** toggle rain · **T** (hold) fast-forward time · **K / L** quick save / load · **Esc / P** pause.

## What's in the world
White Town (French colonial streets), Rock Beach & the Promenade with the Gandhi statue and Old Lighthouse,
Goubert Avenue, Bharathi Park with Aayi Mandapam, Raj Nivas, Manakula Vinayagar Temple (with its elephant),
the Grand Canal, Mission Street, MG Road, the Tamil Quarter with shops and signboards, Sacred Heart Basilica,
the Cathedral, General Hospital, Police Station, Bus Stand, Railway Station with a parked train,
Botanical Garden, East Coast Road to Paradise Beach, and Villianur with its temple gopuram, tank and temple car.

## Gameplay
- Vehicles: hatchback, taxi, police car, auto rickshaw, motorcycle, scooter, PRTC bus. Two-wheelers lean; handbrake drifts; damage, smoke, fire and explosions.
- Left-hand Indian traffic with signals, honking, two-wheelers weaving, parked vehicles. Pedestrians walk on pavements, talk, flee, fight back.
- Wanted level (1–5 stars), police cars that chase using road pathfinding, officers on foot, evasion, Busted / Wasted.
- 8 missions with timers, checkpoints, GPS route and rewards. 80+ hidden ₹ stashes, health packs, tea stalls (chai heals you).
- Day/night cycle (1 game day ≈ 14 min), sunset, street lights, lit windows, monsoon rain with lightning.
- Mini-map with rotating view and GPS, full map, autosave after missions, save/load (stored in your browser).

## Performance tips
Settings → Graphics quality → Medium/Low if the frame rate is low (laptops with integrated graphics).

## Project layout
`index.html`, `css/style.css`, `js/*.js` (game modules), `lib/` (Three.js r187, bundled for offline use), `server.js` (tiny static server).
Key modules: `world.js` / `landmarks.js` (map), `roads.js` (road graph, A*), `vehicle.js`, `traffic.js`, `peds.js`, `police.js`, `missions.js`, `hud.js`, `environment.js`, `i18n.js` (English/Tamil).

## Play on phones & tablets (Android / iOS)
* Touch controls appear automatically: left thumb = joystick (push to the edge to run), right thumb = drag to look,
  pinch = zoom, buttons for Jump / Punch / Get in / Talk / Crouch (Brake / Horn / Get out while driving),
  and a small bar for Pause, Map, Radio, Vehicles and Rain.
* Hold the phone sideways. Graphics are set to "Low" with a 60% render scale on phones for smooth play.
* Install it like an app: Android Chrome → menu → "Add to Home screen" / "Install app";
  iPhone Safari → Share → "Add to Home Screen". It then opens full screen.

## Play online (GitHub Pages)
This folder is a static website — no server needed. Upload everything to a GitHub repository and enable
Settings → Pages → "Deploy from a branch" → main / root. The game is then at https://<you>.github.io/<repo>/
(The drop-in folders `music/`, `models/vehicles/`, `models/chars/extra/` and `models/animals/` need the local
server to be auto-detected, so they work when playing on your PC with start-windows.bat.)
