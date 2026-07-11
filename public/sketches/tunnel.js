shape(4, 0.4, 0.02)
  .rotate(() => (cc[74] ?? 0) / 20)
  .scale(() => 1 + (window.triggers?.kick ?? 0) * 0.18)
  .color(
    () => 0.2 + (window.triggers?.kick ?? 0) * 0.5,
    () => 0.9 - (window.triggers?.kick ?? 0) * 0.5,
    () => 0.7
  )
  .out();
