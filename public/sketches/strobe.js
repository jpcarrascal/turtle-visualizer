osc(20, 0.05, 1)
  .color(
    () => 1,
    () => 0.3 + (window.triggers?.kick ?? 0) * 0.6,
    () => 0.2 + (window.triggers?.kick ?? 0) * 0.6
  )
  .thresh(() => Math.max(0.08, (cc[1] ?? 64) / 128 - (window.triggers?.kick ?? 0) * 0.45))
  .out();
