// Default sketch with MIDI test hook:
// note-on 36 raises window.triggers.kick in app.js.

osc(10, 0.1, 1.2)
  .color(
    () => 0.15 + (window.triggers?.kick ?? 0) * 0.7,
    0.6,
    () => 0.95 - (window.triggers?.kick ?? 0) * 0.25
  )
  .modulate(noise(2, 0.1), () => 0.15 + (window.triggers?.kick ?? 0) * 0.45)
  .scale(() => 1 + (window.triggers?.kick ?? 0) * 0.12)
  .out();
