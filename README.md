# Twirlwood

An original, colorful fairy-tale platformer for phones and desktop browsers. Run along a winding forest path, jump, stomp enemies, and collect coins and star gems. The game is an offline-capable PWA written in plain HTML, CSS and JavaScript with three.js (WebGL). All art and sound are generated in code.

**Play:** https://kkruk93-ux.github.io/twirlwood/

## Version 2.0.0
- **4 worlds × 5 levels:** Lanternleaf Forest, Glimmerfrost Caverns, Skyspire Castle and the new Emberpeak Mines. Longer levels with upper/lower routes, secret rooms behind doors, swinging platforms, rotating wheels, lava, conveyor belts, ice slides and ember enemies.
- **Multi-phase bosses** with telegraphed attacks (Bramblecrown, Frost Warden, Storm Rook, Cinder Golem), plus their own boss music.
- **Three heroes:** Wren (double jump, dash, backflip), Bobble (glide, hat swing, ground-pound) and the new unlockable **Pip** (fast runner, tail spin with hover, super jump).
- **Meta:** costume shop (cosmetic only, paid with coins earned in play), 14 achievements, Time Trial with gold/silver/bronze medals, results screen, intro story.
- **Look:** low-poly 3D (three.js r187, vendored, MIT) with a retro 32-bit style: low-res rendering, procedural textures (bark, needles, rock, brick), alpha-card foliage, animated waterfalls and lava, painted panoramas, dithering and vertex snapping, Retro 4:3 (240p) preset with lite-scenery fallback.
- **Sound:** procedural music for each world plus boss themes, synthesized effects. All art and audio are generated in code.
- **Mobile:** on-screen gamepad with haptics, Bluetooth gamepads, keyboard, auto pause when the app goes to the background, backup save slot.
- No ads, no purchases, no tracking (monetization is a stub only).

## Development
```
python3 -m http.server 4180   # then open http://127.0.0.1:4180/
node tools/bot-check.mjs         # bot plays all 20 levels with all three heroes (Node only)
node tests/play.mjs screenshots  # headless WebGL run + screenshots (needs Playwright)
python3 tools/make-icons.py      # regenerate icons
```

## Links
YouTube [@RoviHere](https://www.youtube.com/@RoviHere) · X [@RoviHere](https://x.com/RoviHere) · Suno https://suno.com/@kkruk93  
Support (BTC): bc1qd05h6spuj8dqf9rs9fu4re9rh4q6k0gflfqum8

Code is under the MIT license (see LICENSE). three.js is MIT (vendor/three/LICENSE). [Privacy policy](https://kkruk93-ux.github.io/twirlwood/privacy.html)
