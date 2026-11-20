# Twirlwood

An original, colorful fairy-tale platformer for phones and desktop browsers. Run along a winding forest path, jump, stomp enemies, and collect coins and star gems. The game is an offline-capable PWA written in plain HTML, CSS and JavaScript with Canvas 2D. All art and sound are generated in code.

**Play:** https://kkruk93-ux.github.io/twirlwood/

## Version 1.1.0
- Low-poly 3D (three.js r187, vendored, MIT) with a retro 32-bit look: low-res rendering, procedural pixel textures (nearest filtering), Gouraud lighting, ordered dithering and vertex snapping (optional), per-world coloured fog, gradient skies, layered backgrounds (mountains, castles, waterfalls), swaying foliage.
- Swooping camera: locked on the hero, turns with the path through bends, look-ahead, pulls back on jumps/falls, wider framing in boss arenas.
- The camera follows the hero along a winding 3D path (CatmullRomCurve3) that turns, rises and drops. Movement stays on the path.
- 3 worlds × 5 levels: Lanternleaf Forest, Glimmerfrost Caverns, Skyspire Castle. Each world ends with a boss (Bramblecrown, Frost Warden, Storm Rook).
- Two switchable heroes: **Wren** (double jump, dash, backflip) and **Bobble** (glide, hat swing, ground-pound).
- Enemies: thornbug, puffshroom, wisp, batling, bramble roller, crystal crab. Springs, crates, moving, vertical and crumbling planks, bouncy clouds, ice, upper/lower routes, secret alcoves, checkpoints, hearts, lives, 1-ups, 3 star gems and 3 stars per level, world map.
- Controls: on-screen gamepad (analog stick + A/B/X/Y), Bluetooth gamepads (Gamepad API), keyboard.
- Settings: graphics preset with auto-fallback, retro wobble, sound, music, vibration, shake, control size/opacity, left-handed layout.
- No ads, no purchases, no tracking (monetization is a stub only).

## Development
```
python3 -m http.server 4180   # then open http://127.0.0.1:4180/
node tools/bot-check.mjs         # bot plays all 15 levels with both heroes (Node only)
node tests/play.mjs screenshots  # headless WebGL run + screenshots (needs Playwright)
python3 tools/make-icons.py      # regenerate icons
```

## Links
YouTube [@RoviHere](https://www.youtube.com/@RoviHere) · X [@RoviHere](https://x.com/RoviHere) · Suno https://suno.com/@kkruk93  
Support (BTC): bc1qd05h6spuj8dqf9rs9fu4re9rh4q6k0gflfqum8

Code is under the MIT license (see LICENSE). three.js is MIT (vendor/three/LICENSE). [Privacy policy](https://kkruk93-ux.github.io/twirlwood/privacy.html)
