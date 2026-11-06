const ROWS = 17;

class StageBuilder {
  constructor(meta) {
    this.meta = meta;
    this.width = meta.width;
    this.grid = Array.from({ length: ROWS }, () => Array(this.width).fill(null));
    this.blockContents = {};
    this.coins = [];
    this.enemies = [];
    this.platforms = [];
    this.firebars = [];
    this.checkpoint = null;
    this.goal = null;
    this.boss = null;
  }

  set(x, y, tile) {
    if (x >= 0 && x < this.width && y >= 0 && y < ROWS) {
      this.grid[y][x] = tile;
    }
  }

  rect(x0, y0, w, h, tile) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        this.set(x, y, tile);
      }
    }
  }

  ground(x0, x1, topTile = "G", subTile = "D", topY = 14) {
    for (let x = x0; x <= x1; x++) {
      this.set(x, topY, topTile);
      for (let y = topY + 1; y < ROWS; y++) {
        this.set(x, y, subTile);
      }
    }
  }

  lava(x0, x1, topY = 15) {
    for (let x = x0; x <= x1; x++) {
      this.set(x, topY, "LV1");
      for (let y = topY + 1; y < ROWS; y++) {
        this.set(x, y, "LV2");
      }
    }
  }

  pipe(x, groundY, height, hasChomp = false) {
    const topY = groundY - height;
    this.set(x, topY, "PTL");
    this.set(x + 1, topY, "PTR");
    for (let y = topY + 1; y < groundY; y++) {
      this.set(x, y, "PBL");
      this.set(x + 1, y, "PBR");
    }
    if (hasChomp) {
      this.enemies.push({ type: "chomp", x: x + 0.5, y: topY });
    }
  }

  qBlock(x, y, content = "coin") {
    this.set(x, y, "Q1");
    this.blockContents[`${x},${y}`] = content;
  }

  brick(x, y, tile = "B", content = null) {
    this.set(x, y, tile);
    if (content) {
      this.blockContents[`${x},${y}`] = content;
    }
  }

  stairs(startX, groundY, height, dir = 1, tile = "H") {
    for (let step = 0; step < height; step++) {
      const colH = dir > 0 ? step + 1 : height - step;
      for (let h = 0; h < colH; h++) {
        this.set(startX + step, groundY - 1 - h, tile);
      }
    }
  }

  coinRow(x0, y, count, step = 1) {
    for (let i = 0; i < count; i++) {
      this.coins.push({ x: x0 + i * step, y });
    }
  }

  coinArc(centerX, peakY, halfSpan = 2) {
    for (let dx = -halfSpan; dx <= halfSpan; dx++) {
      const dy = Math.round((dx * dx) / Math.max(1, halfSpan));
      this.coins.push({ x: centerX + dx, y: peakY + dy });
    }
  }

  enemy(type, x, y, extra = {}) {
    this.enemies.push({ type, x, y, ...extra });
  }

  movingPlatform(x, y, tilesWide, dxTiles, dyTiles, speed = 1.6) {
    this.platforms.push({
      x: x * 32,
      y: y * 32,
      w: tilesWide * 32,
      h: 18,
      dx: dxTiles * 32,
      dy: dyTiles * 32,
      speed
    });
  }

  firebar(x, y, length = 5, speed = 2.1, phase = 0) {
    this.set(x, y, "H");
    this.firebars.push({ cx: x * 32 + 16, cy: y * 32 + 16, length, speed, phase });
  }

  setCheckpoint(x, groundY = 14) {
    this.checkpoint = { x, y: groundY - 1, activated: false };
  }

  flagAndCastle(flagX, groundY = 14) {
    this.set(flagX, groundY - 1, "H");
    for (let y = groundY - 10; y <= groundY - 2; y++) {
      this.set(flagX, y, "FP");
    }
    this.set(flagX, groundY - 11, "FT");
    this.goal = { flagX, topY: groundY - 10, bottomY: groundY - 2, castleX: flagX + 6 };

    const cx = flagX + 4;
    this.rect(cx, groundY - 3, 5, 3, "CW");
    this.rect(cx, groundY - 4, 5, 1, "CB");
    this.rect(cx + 1, groundY - 5, 3, 1, "CW");
    this.rect(cx + 1, groundY - 6, 3, 1, "CB");
    this.set(cx + 2, groundY - 2, "CDT");
    this.set(cx + 2, groundY - 1, "CDB");
  }

  build() {
    return {
      ...this.meta,
      rows: ROWS,
      grid: this.grid,
      blockContents: this.blockContents,
      coins: this.coins,
      enemies: this.enemies,
      platforms: this.platforms,
      firebars: this.firebars,
      checkpoint: this.checkpoint,
      goal: this.goal,
      boss: this.boss
    };
  }
}

function createWorld1() {
  const b = new StageBuilder({
    id: 0,
    code: "1-1",
    name: "Emerald Hills",
    subtitle: "Padang Rumput Klasik & Pipa Hijau",
    theme: "overworld",
    bgm: "overworld",
    bgKey: "bg_overworld",
    width: 196,
    timeLimit: 360,
    spawn: { x: 3, y: 13 }
  });

  b.ground(0, 62);
  b.ground(66, 86);
  b.ground(90, 146);
  b.ground(150, 195);

  b.qBlock(14, 10, "coin");
  b.brick(18, 10, "B");
  b.qBlock(19, 10, "power");
  b.brick(20, 10, "B");
  b.qBlock(21, 10, "coin");
  b.brick(22, 10, "B");
  b.qBlock(20, 6, "oneup");
  b.coinRow(18, 8, 5);

  b.enemy("shroomba", 20, 13);
  b.pipe(27, 14, 2, false);
  b.pipe(36, 14, 3, true);
  b.enemy("shroomba", 33, 13);
  b.pipe(45, 14, 4, true);
  b.enemy("shroomba", 41, 13);
  b.enemy("koopa", 52, 13);
  b.enemy("shroomba", 56, 13);
  b.enemy("shroomba", 58, 13);
  b.coinArc(55, 9, 2);

  b.coinArc(64, 9, 2);
  b.brick(71, 10, "B");
  b.qBlock(72, 10, "power");
  b.brick(73, 10, "B", "multicoin");
  b.rect(75, 6, 6, 1, "B");
  b.coinRow(75, 5, 6);
  b.enemy("koopa", 79, 13);
  b.enemy("shroomba", 83, 13);

  b.movingPlatform(87, 12, 3, 2, 0, 1.4);
  b.setCheckpoint(94, 14);

  b.brick(99, 10, "B");
  b.qBlock(100, 10, "star");
  b.brick(101, 10, "B");
  b.enemy("shroomba", 106, 13);
  b.enemy("shroomba", 108, 13);
  b.enemy("koopa", 111, 13);
  b.enemy("shroomba", 114, 13);

  b.set(119, 13, "SP1");
  b.rect(122, 7, 5, 1, "CL");
  b.coinRow(122, 5, 5);
  b.qBlock(124, 4, "power");

  b.stairs(131, 14, 4, 1, "H");
  b.stairs(138, 14, 4, -1, "H");
  b.coinArc(136, 7, 2);

  b.stairs(143, 14, 4, 1, "H");
  b.stairs(150, 14, 4, -1, "H");
  b.pipe(158, 14, 2, false);
  b.enemy("koopa", 164, 13);
  b.enemy("shroomba", 167, 13);

  b.stairs(171, 14, 7, 1, "H");
  b.flagAndCastle(182, 14);

  return b.build();
}

function createWorld2() {
  const b = new StageBuilder({
    id: 1,
    code: "1-2",
    name: "Crystal Cavern",
    subtitle: "Gua Kristal Bawah Tanah & Lift Rahasia",
    theme: "underground",
    bgm: "underground",
    bgKey: "bg_underground",
    width: 196,
    timeLimit: 360,
    spawn: { x: 3, y: 13 }
  });

  b.rect(8, 0, 165, 1, "UB");
  b.ground(0, 44, "UG", "UD");
  b.ground(49, 84, "UG", "UD");
  b.ground(94, 135, "UG", "UD");
  b.ground(144, 195, "UG", "UD");

  b.qBlock(11, 10, "power");
  b.brick(12, 10, "UB");
  b.qBlock(13, 10, "coin");
  b.brick(14, 10, "UB", "multicoin");
  b.coinRow(16, 12, 4);

  b.enemy("beetle", 20, 13);
  b.enemy("shroomba", 25, 13);
  b.rect(26, 9, 6, 1, "UB");
  b.coinRow(26, 8, 6);
  b.pipe(35, 14, 3, true);
  b.enemy("beetle", 41, 13);

  b.movingPlatform(45.5, 13, 3, 0, -4, 1.5);
  b.coinArc(47, 7, 1);

  b.rect(54, 10, 5, 1, "UB");
  b.qBlock(56, 6, "power");
  b.set(60, 13, "SK");
  b.set(61, 13, "SK");
  b.rect(59, 9, 4, 1, "CL");
  b.coinRow(59, 7, 4);

  b.enemy("beetle", 68, 13);
  b.enemy("shroomba", 72, 13);
  b.pipe(76, 14, 4, true);
  b.set(81, 13, "SP1");
  b.rect(83, 4, 10, 1, "UB");
  b.coinRow(84, 3, 8);

  b.movingPlatform(86, 12, 3, 5, 0, 1.6);
  b.setCheckpoint(97, 14);
  b.qBlock(101, 10, "power");
  b.qBlock(103, 10, "oneup");

  b.enemy("beetle", 108, 13);
  b.enemy("beetle", 113, 13);
  b.rect(110, 9, 7, 1, "UB");
  b.qBlock(113, 5, "star");
  b.enemy("shroomba", 120, 13);
  b.enemy("shroomba", 122, 13);
  b.enemy("koopa", 126, 13);
  b.pipe(130, 14, 3, true);

  b.movingPlatform(137, 12, 3, 4, -2, 1.6);
  b.coinArc(140, 8, 2);

  b.enemy("flyer", 152, 9);
  b.enemy("beetle", 158, 13);
  b.stairs(167, 14, 7, 1, "H");
  b.flagAndCastle(180, 14);

  return b.build();
}

function createWorld3() {
  const b = new StageBuilder({
    id: 2,
    code: "1-3",
    name: "Sky Kingdom",
    subtitle: "Jembatan Awan, Trampolin & Platform Jatuh",
    theme: "sky",
    bgm: "sky",
    bgKey: "bg_sky",
    width: 200,
    timeLimit: 360,
    spawn: { x: 3, y: 12 }
  });

  b.ground(0, 18, "G", "D", 13);
  b.qBlock(9, 9, "power");
  b.coinRow(12, 10, 4);

  b.rect(21, 12, 6, 1, "CL");
  b.enemy("koopa", 24, 11);
  b.rect(29, 10, 5, 1, "CL");
  b.coinArc(31, 7, 2);

  b.set(36, 11, "DN");
  b.set(37, 11, "DN");
  b.set(38, 11, "DN");
  b.rect(41, 12, 8, 1, "CL");
  b.qBlock(44, 8, "coin");
  b.qBlock(45, 8, "power");
  b.enemy("flyer", 49, 8);

  b.movingPlatform(51, 12, 3, 5, 0, 1.7);
  b.coinRow(53, 9, 4);

  b.rect(60, 13, 12, 1, "CL");
  b.set(69, 12, "SP1");
  b.rect(72, 6, 7, 1, "CL");
  b.coinRow(73, 4, 5);
  b.qBlock(75, 3, "oneup");

  b.rect(75, 13, 8, 1, "CL");
  b.enemy("shroomba", 78, 12);
  b.movingPlatform(85, 12, 3, 0, -4, 1.6);
  b.ground(91, 104, "G", "D", 14);
  b.setCheckpoint(94, 14);
  b.qBlock(98, 10, "power");

  b.set(107, 13, "DN");
  b.set(108, 13, "DN");
  b.set(111, 12, "DN");
  b.set(112, 12, "DN");
  b.coinArc(110, 9, 2);
  b.enemy("flyer", 115, 9);

  b.rect(117, 12, 10, 1, "CL");
  b.qBlock(121, 8, "star");
  b.enemy("koopa", 123, 11);
  b.rect(130, 11, 8, 1, "CL");
  b.enemy("shroomba", 133, 10);
  b.enemy("shroomba", 135, 10);

  b.movingPlatform(140, 12, 3, 6, -2, 1.8);
  b.coinArc(144, 7, 2);
  b.rect(150, 11, 9, 1, "CL");
  b.enemy("flyer", 155, 8);
  b.set(157, 10, "SP1");

  b.ground(162, 199, "G", "D", 14);
  b.stairs(171, 14, 7, 1, "H");
  b.flagAndCastle(184, 14);

  return b.build();
}

function createWorld4() {
  const b = new StageBuilder({
    id: 3,
    code: "1-4",
    name: "Magma Keep",
    subtitle: "Benteng Lava & Raja Koopatron",
    theme: "castle",
    bgm: "castle",
    bgKey: "bg_castle",
    width: 186,
    timeLimit: 400,
    isBossStage: true,
    spawn: { x: 3, y: 12 }
  });

  b.rect(0, 0, 148, 2, "CS");
  b.ground(0, 21, "CS", "CS", 13);
  b.qBlock(10, 9, "power");
  b.enemy("shroomba", 16, 12);

  b.lava(22, 24, 15);
  b.ground(25, 44, "CS", "CS", 13);
  b.firebar(32, 10, 4, 2.1, 0);
  b.coinArc(32, 6, 2);
  b.enemy("beetle", 39, 12);

  b.lava(45, 53, 15);
  b.movingPlatform(46, 12, 3, 4, 0, 1.6);
  b.ground(54, 78, "CS", "CS", 13);
  b.enemy("crusher", 61, 4);
  b.coinRow(59, 11, 5);
  b.firebar(69, 10, 4, -2.2, 1.5);
  b.qBlock(74, 9, "power");

  b.lava(79, 86, 15);
  b.set(81, 12, "DN");
  b.set(82, 12, "DN");
  b.set(84, 11, "DN");
  b.ground(87, 112, "CS", "CS", 13);
  b.setCheckpoint(90, 13);
  b.qBlock(94, 9, "power");
  b.qBlock(96, 9, "oneup");
  b.enemy("crusher", 103, 4);
  b.enemy("beetle", 108, 12);

  b.lava(113, 124, 15);
  b.movingPlatform(114, 12, 3, 6, 0, 1.8);
  b.coinArc(118, 8, 2);

  b.ground(125, 149, "CS", "CS", 13);
  b.firebar(132, 9, 4, 2.3, 0.7);
  b.qBlock(143, 9, "power");
  b.coinRow(141, 7, 5);

  b.lava(150, 171, 15);
  for (let x = 150; x <= 170; x++) {
    b.set(x, 13, "BR");
  }
  b.rect(155, 8, 4, 1, "H");
  b.qBlock(157, 4, "power");
  b.set(170, 12, "AX");

  b.ground(171, 185, "CS", "CS", 13);
  b.rect(176, 9, 5, 4, "CW");
  b.rect(176, 8, 5, 1, "CB");
  b.set(178, 11, "CDT");
  b.set(178, 12, "CDB");

  b.boss = {
    name: "KING KOOPATRON",
    x: 164,
    y: 11,
    minX: 152,
    maxX: 168,
    axeX: 170,
    axeY: 12,
    bridgeStartX: 150,
    bridgeEndX: 170,
    bridgeY: 13,
    doorX: 178,
    maxHp: 10
  };

  return b.build();
}

export const WORLDS = [
  createWorld1,
  createWorld2,
  createWorld3,
  createWorld4
];

export const WORLD_METADATA = [
  { id: 0, code: "1-1", name: "Emerald Hills", desc: "Padang rumput klasik, pipa hijau & rahasia 1-UP" },
  { id: 1, code: "1-2", name: "Crystal Cavern", desc: "Gua kristal bawah tanah, kumbang baja & rute atap" },
  { id: 2, code: "1-3", name: "Sky Kingdom", desc: "Jembatan awan atletik, trampolin & platform jatuh" },
  { id: 3, code: "1-4", name: "Magma Keep (Boss)", desc: "Kastil lava berapi & duel akhir King Koopatron" }
];
