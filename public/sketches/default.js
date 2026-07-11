// Hydra sketch placeholder.
// This file becomes active once the Hydra runtime is wired in.

osc(10, 0.1, 1.2)
  .color(0.15, 0.6, 0.95)
  .modulate(noise(2, 0.1), 0.15)
  .out();
