(() => {
  const programs = window.programs || (window.programs = []);

  const purpleVerticalLines = function() {
    shape(50, 0.5, 1.5)
      .scale(() => envDrum[36] + 0.2, 0.5)
      .color([0.1, 0.3].smooth(2), 0, [0.25, 1].smooth(2))
      .modulate(noise(), () => envDrum[36] / 3, 0.1)
      .repeat(() => ranDrum[36] + 0.4, 0)
      .add(o0, () => ranDrum[36] / 3 + 0.5)
      .scale(0.9)
      .out();
  };

  const purpleNoisyVerticalLines = function() {
    s1.initVideo('images/premonicion.mp4');
    shape(50, 0.5, 1.5)
      .scale(() => envDrum[36] + envDrum[37] * 1.5 + 0.2, 0.5)
      .color(0.5, 0.3, 0.9)
      .modulate(noise(), () => envDrum[36] / 3 + envDrum[37] / 3, 0.1)
      .repeat(() => ranDrum[36] + 0.4, 0)
      .scale(0.9)
      .mult(noise(200, 10, 10).brightness(2))
      .mult(src(s1).saturate(0), () => envDrum[36] + envDrum[37])
      .out(o1);

    src(s1)
      .brightness(() => (envDrum[36] + envDrum[37]) * 2 - 2)
      .mult(o1)
      .out(o0);
  };

  const pinkBlobs = function() {
    speed = 0.3;
    shape(50, 0.2, 0.3)
      .color(10, 0.8, 5)
      .scale(() => envDrum[36] + envDrum[38] + 1)
      .repeat(3, 3)
      .modulateRotate(o0)
      .modulate(noise(2, () => ranDrum[36] * ranDrum[38] * 2))
      .rotate(() => time % 360)
      .out();
  };

  const blueSlowTentacles = function() {
    noise(20)
      .color(0, 0.8, 1)
      .scale(50, 0.1)
      .contrast(3)
      .blend(noise(40, 0.5, 0.5), 0.2)
      .out(o1);

    noise(5, 0.2)
      .color(0, () => ccs[17], 0)
      .brightness(() => ccs[17])
      .blend(o1)
      .out();
  };

  const blueSlowTentaclesBrighter = function() {
    noise(30)
      .color(0, 1, 2.5)
      .scale(80, 0.2)
      .contrast(2)
      .blend(noise(40, 0.5, 0.5), 0.2)
      .out(o1);

    noise(5, 0.2)
      .color(0, () => ccs[17], 0)
      .brightness(() => ccs[17])
      .blend(o1)
      .out();
  };

  const pinkSlowTentacles = function() {
    noise(50)
      .color(1, 0, 0.8)
      .scale(0.5, 50)
      .contrast(2)
      .blend(noise(40, 0.5, 0.5), 0.2)
      .out(o1);

    noise(50, 0.2)
      .color(0, 0, 0)
      .brightness(0.01)
      .blend(o1)
      .out();
  };

  const tvNoise = function() {
    noise(200, 10, 10)
      .color(0, 0.8, 1)
      .rotate(Math.PI / 4)
      .contrast(3)
      .out();
  };

  const qrIg = function() {
    s0.initImage('images/qr-ig.jpg');
    const ratioFactor = 0.9;
    src(s0)
      .scale(0.6, () => (innerHeight / innerWidth) * ratioFactor)
      .mask(shape(4, 0.5, 0).scale(1.2, () => (innerHeight / innerWidth) * ratioFactor).color(1, 1, 1))
      .out();
  };

  const logo = function() {
    s0.initImage('images/spacebarman-logo.png');
    src(s0)
      .scale(0.6, () => innerHeight / innerWidth)
      .mask(shape(2, 0.5, 0).scale(1.2, () => innerHeight / innerWidth).color(1, 1, 1))
      .out(o2);

    noise(400, 1, 10)
      .color(1, 1, 1)
      .contrast(() => 1.5 - envDrum[36])
      .brightness(() => envDrum[36] * 0.8 + 1.2)
      .out(o1);

    shape(4, 1, 1)
      .color(() => envDrum[36] * 0.1, 0, () => envDrum[36] * 0.7)
      .add(o2)
      .mult(o1)
      .out();
  };

  const slowNoise = function() {
    noise(200, 0.5, 1)
      .color(0.9, 1, 0.4)
      .scale(() => ccs[16] + 0.5)
      .brightness(() => ccs[17] - 1)
      .out();
  };

  const camera = function() {
    s0.initCam();
    src(s0)
      .saturate(0)
      .color(0, 0.3, 1)
      .diff(src(o0).scrollY(() => envDrum[36] / 10).saturate(0.5))
      .out(o0);
  };

  const thisBody = function() {
    s0.initImage('images/bodies.png');

    src(s0).scale(1, () => innerHeight / innerWidth).out(o2);
    solid(() => ccs[16], () => ccs[16], () => ccs[16]).out(o3);

    osc(() => envDrum[36] * 16 + 1, 0.1, 0)
      .color(() => envDrum[36] * 16 + 1, 0, 0.4)
      .mult(osc(20, 0.01, 0))
      .repeat(2, 20)
      .rotate(0.5)
      .modulate(o1)
      .scale(1, 1)
      .diff(o1)
      .mult(o2)
      .out(o0);

    osc(20, 0.2, 0)
      .color(() => envDrum[36] * 8 + 1, () => envDrum[36], () => envDrum[36] * 8 + 1)
      .mult(osc(() => ranDrum[36] * 10 + 20))
      .out(o1);
  };

  const architecture = function() {
    const images = [
      'images/upf_tanger.jpg',
      'images/upf_staircase2.jpg',
      'images/arab_world.jpg',
      'images/upf_staircase1.jpg'
    ];
    const index = Math.floor(Math.random() * images.length);
    s0.initImage(images[index]);
    s1.initVideo('images/monster.mp4');

    src(s0)
      .saturate(0)
      .contrast(1.2)
      .color(0.6, () => envDrum[38] + 0.6, () => envDrum[36] + 1.2)
      .brightness(() => envDrum[36] / 5)
      .scrollX(() => envDrum[38] / 3, 0.05)
      .kaleid(() => ranDrum[36] * 6)
      .mult(src(s1).saturate(0).scale(1, () => innerHeight / innerWidth))
      .out();
  };

  const sexy = function() {
    const images = [
      'images/paintings/processed/1b35b051-d5e9-444f-93d7-c69853bd349b-1024x768.jpg',
      'images/paintings/processed/2015-04-06_55226fa1791f7_pic4_666px-Rembrandt_Harmensz._van_Rijn_026.jpg',
      'images/paintings/processed/34926a.jpg',
      'images/paintings/processed/52325g1.jpg',
      'images/paintings/processed/CaressedByACloud.jpg',
      'images/paintings/processed/DreamFishermansWife.jpg',
      'images/paintings/processed/Shunga-Exhibition-Edo-Era-Erotic-Art-Kabukicho-Ukiyo-e-Japanese-Tokyo-Metropolis-Japan-2.jpg',
      'images/paintings/processed/Tizian_011.jpg',
      'images/paintings/processed/Untitled 3.jpg',
      'images/paintings/processed/c6cd1492-9f04-46d2-9f66-165eeee98a0d-1394x2040.jpg',
      'images/paintings/processed/child-spying-on-a-couple-shunga.jpg',
      'images/paintings/processed/erotic-paintings-bacchus-et-erigone.jpg',
      'images/paintings/processed/erotic-paintings-femme-damnee copy.jpg',
      'images/paintings/processed/images.jpg',
      'images/paintings/processed/jean-baptiste-marie-pierre-leda-e-o-cisne-e5a185-640.jpg',
      'images/paintings/processed/p01j0g86.jpg',
      'images/paintings/processed/shunga-exhibition-4.jpg'
    ];

    const index = Math.floor(Math.random() * images.length);
    s0.initImage(images[index]);

    noise(400, 10, 10)
      .color(0.8, 0.8, 0.8)
      .rotate(Math.PI / 4)
      .contrast(2)
      .out(o1);

    shape(4, 0.8, 0.2).out(o2);

    src(s0)
      .saturate(0)
      .brightness(() => envDrum[36] / 5)
      .scale(0.5)
      .repeat(() => ranDrum[36] * 1.5, () => ranDrum[36] * 1.5 * innerHeight / innerWidth)
      .scrollX(0, () => (ranDrum[36] > 0.5 ? 0.03 : -0.03))
      .scrollY(0, () => (ranDrum[38] > 0.5 ? 0.03 : -0.03))
      .blend(o1, () => 1 - (envDrum[36] + envDrum[38]))
      .mult(o2)
      .out();
  };

  const noiseFlash = function() {
    noise(4, 1, 10)
      .color(() => ccs[16], () => ccs[17], () => ccs[18])
      .rotate(Math.PI / 4)
      .contrast(2)
      .brightness(() => envDrum[36] - 1 + ccs[19] * 2)
      .modulate(osc(2).mult(osc(3)).rotate(1))
      .out();
  };

  const redKaleidBlobs = function() {
    const ratioFactor = 2.5;
    s0.initImage('images/handcuffs.png');

    solid(0, 0, 0).out(o1);

    src(s0)
      .scale(0.6, () => (innerHeight / innerWidth) * ratioFactor)
      .mask(shape(4, 0.5, 0).scale(1.2, () => (innerHeight / innerWidth) * ratioFactor).color(1, 1, 1))
      .out(o2);

    voronoi(3, 3, 1.5)
      .color(() => envDrum[36] * 5, () => envDrum[36] * 4, () => envDrum[36])
      .kaleid(() => ranDrum[36] * 10 + 2)
      .add(voronoi(1, 2, 2).rotate(2, 0.1).color(0, 1.5, 0.5))
      .saturate(() => ccs[18])
      .out(o3);

    src(o1)
      .add(o3, () => 1 - ccs[19])
      .add(o2, () => 0.05 - ccs[19])
      .out();
  };

  const nothing = function() {
    shape().color(0, 0, 0).out();
  };

  const skulls = function() {
    s0.initImage('images/littleSkull.png');
    src(s0)
      .scale(1, () => innerHeight / innerWidth)
      .rotate(Math.PI / 2)
      .repeat(4, 4)
      .scale(0.5, 0.5)
      .kaleid(10)
      .rotate(2, 0.5)
      .mask(shape(100, 0.05, 1.7).color(1, 1, 1).invert())
      .out();
  };

  const slowColor = function() {
    solid(1, 0, 0)
      .kaleid(() => ranDrum[36] * 8 * ccs[17])
      .blend(noise(20, 0.3), 0.1)
      .blend(osc(() => ranDrum[36] * ccs[17] * 20 + 10, 0, 0))
      .mult(noise(1, 1).brightness(() => envDrum[36] * ccs[17]))
      .add(solid(1, 0, 0), () => ccs[18]).brightness(() => ccs[18])
      .out();
  };

  const lockdown = function() {
    osc(() => ccs[16] * 5, () => ccs[17], 1)
      .posterize(5)
      .modulate(noise(() => envDrum[36] * 3, 0.1))
      .out();
  };

  const wrigglyBlueLines = function() {
    osc(20, 0)
      .color(0, 0, 1)
      .color(0.4, () => envDrum[36] * 0.4 + 0.4, () => envDrum[36] * 0.5 + 1)
      .modulate(noise(() => envDrum[36] * 0.2 + 0.3), 0.3)
      .posterize(4)
      .rotate(Math.PI / 4, 0.1)
      .scale(0.2)
      .brightness(() => envDrum[36] * 0.2)
      .out(o0);
  };

  const wrigglyBlueKaleid = function() {
    osc(20, -2)
      .color(() => envDrum[38] * 0.7 + 1, () => envDrum[38] * 0.2 + 0.4, 0.4)
      .modulate(noise(() => ranDrum[38] * 2.5), 0.3)
      .posterize(4)
      .scale(0.25)
      .kaleid(20)
      .brightness(() => envDrum[38] * 0.2)
      .rotate(2, 1)
      .scale(1, () => innerHeight / innerWidth)
      .out();
  };

  programs[1] = nothing;
  programs[2] = logo;
  programs[3] = tvNoise;
  programs[4] = camera;
  programs[10] = blueSlowTentacles;
  programs[11] = pinkBlobs;
  programs[12] = architecture;
  programs[13] = purpleVerticalLines;
  programs[14] = purpleNoisyVerticalLines;
  programs[15] = redKaleidBlobs;
  programs[16] = skulls;
  programs[17] = slowColor;
  programs[22] = architecture;
  programs[23] = thisBody;
  programs[24] = sexy;
  programs[25] = sexy;
  programs[26] = pinkSlowTentacles;
  programs[27] = noiseFlash;
  programs[28] = slowNoise;
  programs[29] = lockdown;
  programs[30] = wrigglyBlueLines;
  programs[31] = wrigglyBlueKaleid;
  programs[32] = qrIg;
  programs[100] = blueSlowTentaclesBrighter;

  const selectedProgram = Number(window.__selectedProgram);
  const selectedSketch = Number.isFinite(selectedProgram) && programs[selectedProgram]
    ? programs[selectedProgram]
    : tvNoise;

  selectedSketch();
})();
