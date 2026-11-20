# Twirlwood

An original, colorful fairy-tale platformer for phones and desktop browsers. Run along a winding forest path, jump, stomp enemies, and collect coins and star gems. The game is an offline-capable PWA written in plain HTML, CSS and JavaScript with Canvas 2D. All art and sound are generated in code.

**Play:** https://kkruk93-ux.github.io/twirlwood/

## Prototype 0.1.0
- Two heroes: **Wren** the acrobat (double jump, air dash) and **Bobble** the jester (glide, ground-pound).
- One world, Lanternleaf Forest, with 3 levels: Sunny Glade, Mushroom Hollow, and Thornspire Bridge, which ends in a boss fight with the Bramblecrown.
- Enemies: thornbug, puffshroom, wisp. Also spikes, springs, crates, moving and crumbling planks, checkpoints, hearts.
- Touch controls (multitouch) and keyboard: arrows/A-D move, Space/Z/W jump, X/Shift/J action, Esc/P pause.
- Progress, settings and the chosen hero are saved in localStorage. There are no ads, no purchases and no tracking.

## Development
```
python3 -m http.server 4180   # then open http://127.0.0.1:4180/
node tests/play.mjs screenshots  # headless bot playthrough + screenshots (needs Playwright)
python3 tools/make-icons.py      # regenerate icons
```

## Links
YouTube [@RoviHere](https://www.youtube.com/@RoviHere) · X [@RoviHere](https://x.com/RoviHere) · Suno https://suno.com/@kkruk93  
Support (BTC): bc1qd05h6spuj8dqf9rs9fu4re9rh4q6k0gflfqum8

Code is under the MIT license (see LICENSE). [Privacy policy](https://kkruk93-ux.github.io/twirlwood/privacy.html)
