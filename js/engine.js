import { WORLDS } from "./levels.js";

const TILE = 32;
const VIEW_W = 960;
const VIEW_H = 544;

const SOLID_TILES = new Set([
  "G", "D", "B", "H", "Q1", "E",
  "PTL", "PTR", "PBL", "PBR",
  "CL", "SP1", "SP2",
  "UG", "UD", "UB",
  "CS", "BR", "DN"
]);

export class SuperGameEngine {
  constructor(canvas, assets, audio, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.assets = assets;
    this.audio = audio;
    this.callbacks = callbacks;

    this.state = "menu";
    this.worldIndex = 0;
    this.score = 0;
    this.highScore = Number(localStorage.getItem("snb_highscore") || 0);
    this.coins = 0;
    this.lives = 3;
    this.unlockedWorld = Math.max(3, Number(localStorage.getItem("snb_unlocked") || 0));
    this.clearedWorlds = JSON.parse(localStorage.getItem("snb_cleared") || "[]");

    this.keys = new Set();
    this.touchState = { left: false, right: false, down: false, jump: false, action: false };
    this.prevJumpDown = false;
    this.prevActionDown = false;
    this.gamepadPauseLatch = false;

    this.animTick = 0;
    this.lastFrameTime = 0;
    this.accumulator = 0;
    this.screenShake = 0;

    this.savedCheckpoint = null;
    this.carriedPower = 0;

    this.bindKeyboard();
  }

  bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      this.audio.unlock();
      if (e.code === "KeyP" || e.code === "Escape") {
        if (this.state === "playing" || this.state === "paused") {
          this.togglePause();
        }
        return;
      }
      if (e.code === "KeyM") {
        if (this.callbacks.onMuteToggle) this.callbacks.onMuteToggle();
        return;
      }
      if (e.code === "KeyR" && (this.state === "playing" || this.state === "paused")) {
        this.restartCurrentWorld();
        return;
      }
      this.keys.add(e.code);
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener("blur", () => {
      this.keys.clear();
      this.touchState = { left: false, right: false, down: false, jump: false, action: false };
    });
  }

  readInput() {
    let left = this.keys.has("ArrowLeft") || this.keys.has("KeyA") || this.touchState.left;
    let right = this.keys.has("ArrowRight") || this.keys.has("KeyD") || this.touchState.right;
    let down = this.keys.has("ArrowDown") || this.keys.has("KeyS") || this.touchState.down;
    let jump =
      this.keys.has("Space") ||
      this.keys.has("ArrowUp") ||
      this.keys.has("KeyW") ||
      this.keys.has("KeyZ") ||
      this.keys.has("KeyK") ||
      this.touchState.jump;
    let action =
      this.keys.has("ShiftLeft") ||
      this.keys.has("ShiftRight") ||
      this.keys.has("KeyX") ||
      this.keys.has("KeyJ") ||
      this.touchState.action;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (pad) {
      const ax = pad.axes[0] || 0;
      const ay = pad.axes[1] || 0;
      if (ax < -0.35 || pad.buttons[14]?.pressed) left = true;
      if (ax > 0.35 || pad.buttons[15]?.pressed) right = true;
      if (ay > 0.45 || pad.buttons[13]?.pressed) down = true;
      if (pad.buttons[0]?.pressed || pad.buttons[1]?.pressed) jump = true;
      if (pad.buttons[2]?.pressed || pad.buttons[3]?.pressed || pad.buttons[5]?.pressed) action = true;
      if (pad.buttons[9]?.pressed) {
        if (!this.gamepadPauseLatch && (this.state === "playing" || this.state === "paused")) {
          this.togglePause();
        }
        this.gamepadPauseLatch = true;
      } else {
        this.gamepadPauseLatch = false;
      }
    }

    const jumpJustPressed = jump && !this.prevJumpDown;
    const actionJustPressed = action && !this.prevActionDown;
    this.prevJumpDown = jump;
    this.prevActionDown = action;

    return { left, right, down, jump, action, jumpJustPressed, actionJustPressed };
  }

  startNewGame(worldIdx = 0) {
    this.audio.unlock();
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.carriedPower = 0;
    this.savedCheckpoint = null;
    this.loadWorld(worldIdx, false);
  }

  restartCurrentWorld() {
    this.savedCheckpoint = null;
    this.carriedPower = 0;
    this.lives = Math.max(3, this.lives);
    this.loadWorld(this.worldIndex, false);
  }

  loadWorld(worldIdx, useCheckpoint = false) {
    this.worldIndex = worldIdx;
    const raw = WORLDS[worldIdx]();
    this.level = raw;
    this.timeLeft = raw.timeLimit;
    this.cameraX = 0;
    this.screenShake = 0;

    const spawnX =
      useCheckpoint && this.savedCheckpoint && this.savedCheckpoint.worldIdx === worldIdx
        ? this.savedCheckpoint.x
        : raw.spawn.x;
    const spawnY =
      useCheckpoint && this.savedCheckpoint && this.savedCheckpoint.worldIdx === worldIdx
        ? this.savedCheckpoint.y
        : raw.spawn.y;

    if (this.level.checkpoint && useCheckpoint && this.savedCheckpoint?.worldIdx === worldIdx) {
      this.level.checkpoint.activated = true;
    }

    const pPower = useCheckpoint ? 0 : this.carriedPower;
    const pH = pPower > 0 ? 42 : 26;
    const pW = pPower > 0 ? 22 : 20;

    this.player = {
      x: spawnX * TILE + 5,
      y: (spawnY + 1) * TILE - pH,
      vx: 0,
      vy: 0,
      w: pW,
      h: pH,
      power: pPower,
      facing: 1,
      onGround: true,
      coyoteTimer: 0.1,
      jumpBuffer: 0,
      hurtTimer: 0,
      starTimer: 0,
      fireCooldown: 0,
      castTimer: 0,
      stompCombo: 0,
      walkCycle: 0,
      dead: false,
      deathTimer: 0
    };

    this.cameraX = Math.max(0, Math.min(this.player.x - 260, this.level.width * TILE - VIEW_W));

    this.coinsList = raw.coins.map((c) => ({
      x: c.x * TILE + 4,
      y: c.y * TILE + 4,
      w: 24,
      h: 24,
      collected: false
    }));

    this.platforms = raw.platforms.map((p) => ({
      ...p,
      ox: p.x,
      oy: p.y,
      t: 0,
      vx: 0,
      vy: 0
    }));

    this.enemies = raw.enemies.map((e) => this.instantiateEnemy(e));
    this.items = [];
    this.projectiles = [];
    this.particles = [];
    this.popups = [];
    this.bumps = new Map();
    this.donutTimers = new Map();
    this.fallingDonuts = [];
    this.springTimers = new Map();

    this.flagSequence = null;
    this.bridgeCollapse = null;
    this.boss = raw.boss ? this.instantiateBoss(raw.boss) : null;

    this.state = "playing";
    this.audio.playBgm(raw.bgm);
    this.emitHud();
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.state, this.getSummary());
  }

  instantiateEnemy(def) {
    if (def.type === "chomp") {
      return {
        type: "chomp",
        x: def.x * TILE,
        baseY: def.y * TILE,
        y: def.y * TILE + 28,
        w: 28,
        h: 30,
        vx: 0,
        vy: 0,
        timer: 1.2,
        phase: "hidden",
        alive: true,
        facing: -1
      };
    }
    if (def.type === "flyer") {
      return {
        type: "flyer",
        x: def.x * TILE,
        baseY: def.y * TILE,
        y: def.y * TILE,
        w: 26,
        h: 24,
        vx: -1.15,
        vy: 0,
        t: Math.random() * Math.PI * 2,
        alive: true,
        facing: -1
      };
    }
    if (def.type === "crusher") {
      return {
        type: "crusher",
        x: def.x * TILE,
        homeY: def.y * TILE,
        y: def.y * TILE,
        w: 30,
        h: 30,
        vx: 0,
        vy: 0,
        phase: "idle",
        timer: 0,
        alive: true,
        facing: -1
      };
    }
    return {
      type: def.type,
      x: def.x * TILE + 2,
      y: def.y * TILE + 4,
      w: 26,
      h: 28,
      vx: -1.15,
      vy: 0,
      onGround: false,
      state: "walk",
      stateTimer: 0,
      kickGrace: 0,
      shellCombo: 0,
      alive: true,
      flipped: false,
      facing: -1
    };
  }

  instantiateBoss(cfg) {
    return {
      ...cfg,
      px: cfg.x * TILE,
      py: cfg.y * TILE,
      w: 54,
      h: 58,
      vx: -1.35,
      vy: 0,
      hp: cfg.maxHp,
      onGround: false,
      facing: -1,
      jumpTimer: 2.2,
      fireTimer: 1.6,
      roarTimer: 0,
      hurtFlash: 0,
      alive: true,
      fallingInLava: false
    };
  }

  togglePause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.audio.stopBgm(false);
    } else if (this.state === "paused") {
      this.state = "playing";
      this.audio.playBgm(this.player.starTimer > 0 ? "starman" : this.level.bgm);
    }
    if (this.callbacks.onStateChange) this.callbacks.onStateChange(this.state, this.getSummary());
  }

  startLoop() {
    const loop = (ts) => {
      if (!this.lastFrameTime) this.lastFrameTime = ts;
      const elapsed = Math.min(0.05, (ts - this.lastFrameTime) / 1000);
      this.lastFrameTime = ts;

      if (this.state === "playing") {
        this.accumulator += elapsed;
        const step = 1 / 60;
        while (this.accumulator >= step) {
          this.fixedUpdate(step);
          this.accumulator -= step;
          if (this.state !== "playing") {
            this.accumulator = 0;
            break;
          }
        }
      }

      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  getTile(tx, ty) {
    if (!this.level) return null;
    if (tx < 0 || tx >= this.level.width) return "H";
    if (ty < 0 || ty >= this.level.rows) return null;
    return this.level.grid[ty][tx];
  }

  isSolid(tx, ty) {
    if (tx < 0 || tx >= this.level.width) return true;
    if (ty < 0) return false;
    if (ty >= this.level.rows) return false;
    const t = this.level.grid[ty][tx];
    return SOLID_TILES.has(t);
  }

  addScore(pts, popupX = null, popupY = null, customLabel = null) {
    this.score += pts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("snb_highscore", String(this.highScore));
    }
    if (popupX !== null && popupY !== null) {
      this.popups.push({
        x: popupX,
        y: popupY,
        text: customLabel || `+${pts}`,
        color: customLabel === "1-UP!" ? "#5eff82" : "#ffe45e",
        life: 0.85
      });
    }
  }

  addCoin(worldX, worldY) {
    this.coins++;
    this.audio.sfx("coin");
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives++;
      this.audio.sfx("one_up");
      this.addScore(1000, worldX, worldY - 16, "1-UP!");
    } else {
      this.addScore(200, worldX, worldY);
    }
  }

  spawnParticles(x, y, color, count = 8, speed = 3.5, gravity = 0.22, size = 5) {
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const spd = speed * (0.5 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.4,
        gravity,
        color,
        size,
        life: 0.45 + Math.random() * 0.35
      });
    }
  }

  fixedUpdate(dt) {
    this.animTick++;
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 28);
    }

    const input = this.readInput();

    if (this.player.dead) {
      this.player.deathTimer -= dt;
      this.player.vy += 0.42;
      this.player.y += this.player.vy;
      this.updateParticlesAndPopups(dt);
      if (this.player.deathTimer <= 0) {
        if (this.lives > 0) {
          this.loadWorld(this.worldIndex, Boolean(this.savedCheckpoint && this.savedCheckpoint.worldIdx === this.worldIndex));
        } else {
          this.state = "gameover";
          this.audio.sfx("gameover");
          if (this.callbacks.onStateChange) this.callbacks.onStateChange("gameover", this.getSummary());
        }
      }
      return;
    }

    if (this.flagSequence) {
      this.updateFlagSequence(dt);
      this.updateParticlesAndPopups(dt);
      this.emitHudThrottled();
      return;
    }

    if (this.bridgeCollapse) {
      this.updateBridgeCollapse(dt);
      this.updateParticlesAndPopups(dt);
      this.emitHudThrottled();
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.killPlayer();
      return;
    }

    this.updatePlatforms(dt);
    this.updateDonutsAndSprings(dt);
    this.updateBumps(dt);
    this.updatePlayer(dt, input);
    this.updateItems(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    if (this.boss) this.updateBoss(dt);
    this.updateFirebars();
    this.updateParticlesAndPopups(dt);

    const targetCam = this.player.x + this.player.facing * 56 - VIEW_W * 0.36;
    const maxCam = this.level.width * TILE - VIEW_W;
    this.cameraX += (Math.max(0, Math.min(maxCam, targetCam)) - this.cameraX) * 0.14;

    this.emitHudThrottled();
  }

  emitHudThrottled() {
    if (this.animTick % 6 === 0) {
      this.emitHud();
    }
  }

  emitHud() {
    if (!this.callbacks.onHudUpdate || !this.level || !this.player) return;
    const powerNames = ["SMALL", "SUPER", "FIRE"];
    this.callbacks.onHudUpdate({
      score: this.score,
      highScore: this.highScore,
      coins: this.coins,
      world: this.level.code,
      worldName: this.level.name,
      time: Math.ceil(this.timeLeft),
      lives: this.lives,
      power: this.player.starTimer > 0 ? "STAR" : powerNames[this.player.power],
      boss:
        this.boss && this.boss.alive && this.cameraX >= 134 * TILE
          ? { name: this.boss.name, hp: Math.max(0, this.boss.hp), maxHp: this.boss.maxHp }
          : null
    });
  }

  updatePlatforms(dt) {
    for (const p of this.platforms) {
      const prevX = p.x;
      const prevY = p.y;
      p.t += dt * p.speed;
      const factor = (1 - Math.cos(p.t)) * 0.5;
      p.x = p.ox + p.dx * factor;
      p.y = p.oy + p.dy * factor;
      p.vx = p.x - prevX;
      p.vy = p.y - prevY;
    }
  }

  updateDonutsAndSprings(dt) {
    for (const [key, t] of this.springTimers.entries()) {
      const next = t - dt;
      if (next <= 0) {
        const [sx, sy] = key.split(",").map(Number);
        if (this.level.grid[sy]?.[sx] === "SP2") this.level.grid[sy][sx] = "SP1";
        this.springTimers.delete(key);
      } else {
        this.springTimers.set(key, next);
      }
    }

    for (let i = this.fallingDonuts.length - 1; i >= 0; i--) {
      const fd = this.fallingDonuts[i];
      fd.vy = Math.min(9, fd.vy + 0.34);
      fd.y += fd.vy;
      fd.respawn -= dt;
      if (fd.respawn <= 0) {
        this.level.grid[fd.gy][fd.gx] = "DN";
        this.fallingDonuts.splice(i, 1);
      }
    }
  }

  updateBumps(dt) {
    for (const [key, b] of this.bumps.entries()) {
      b.t += dt * 9.5;
      if (b.t >= Math.PI) {
        this.bumps.delete(key);
      }
    }
  }

  updatePlayer(dt, input) {
    const p = this.player;
    if (p.hurtTimer > 0) p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);
    if (p.castTimer > 0) p.castTimer = Math.max(0, p.castTimer - dt);

    if (p.starTimer > 0) {
      p.starTimer = Math.max(0, p.starTimer - dt);
      if (this.animTick % 4 === 0) {
        const starColors = ["#ffe45e", "#ff6b6b", "#5ef2ff", "#7dff7a"];
        this.spawnParticles(
          p.x + p.w * 0.5,
          p.y + p.h * 0.5,
          starColors[this.animTick % starColors.length],
          1,
          1.4,
          0.03,
          4
        );
      }
      if (p.starTimer === 0) {
        this.audio.playBgm(this.level.bgm);
      }
    }

    const maxSpeed = input.action ? 5.35 : 3.75;
    const accel = p.onGround ? 0.38 : 0.24;
    const friction = p.onGround ? 0.82 : 0.94;

    if (input.left && !input.right) {
      if (p.vx > 0.9 && p.onGround && this.animTick % 5 === 0) {
        this.spawnParticles(p.x + p.w, p.y + p.h - 2, "#f1efe7", 2, 1.4, -0.02, 4);
      }
      p.vx = Math.max(-maxSpeed, p.vx - accel);
      p.facing = -1;
    } else if (input.right && !input.left) {
      if (p.vx < -0.9 && p.onGround && this.animTick % 5 === 0) {
        this.spawnParticles(p.x, p.y + p.h - 2, "#f1efe7", 2, 1.4, -0.02, 4);
      }
      p.vx = Math.min(maxSpeed, p.vx + accel);
      p.facing = 1;
    } else {
      p.vx *= friction;
      if (Math.abs(p.vx) < 0.08) p.vx = 0;
    }

    if (Math.abs(p.vx) > 0.3 && p.onGround) {
      p.walkCycle += Math.abs(p.vx) * 0.09;
    } else {
      p.walkCycle = 0;
    }

    if (p.onGround) {
      p.coyoteTimer = 0.1;
      p.stompCombo = 0;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
    }

    if (input.jumpJustPressed) {
      p.jumpBuffer = 0.12;
    } else {
      p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    }

    if (p.jumpBuffer > 0 && p.coyoteTimer > 0) {
      const speedBonus = Math.abs(p.vx) > 4.1 ? 0.95 : 0;
      p.vy = -(10.65 + speedBonus);
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBuffer = 0;
      this.audio.sfx(p.power > 0 ? "super_jump" : "jump");
    }

    if (!input.jump && p.vy < -3.8) {
      p.vy *= 0.62;
    }

    if (input.actionJustPressed && p.power === 2 && p.fireCooldown <= 0) {
      const activePlayerFire = this.projectiles.filter((pr) => pr.fromPlayer).length;
      if (activePlayerFire < 3) {
        p.fireCooldown = 0.22;
        p.castTimer = 0.16;
        this.audio.sfx("fireball");
        this.projectiles.push({
          fromPlayer: true,
          x: p.facing > 0 ? p.x + p.w : p.x - 14,
          y: p.y + p.h * 0.36,
          w: 14,
          h: 14,
          vx: p.facing * 7.4,
          vy: 2.2,
          bounces: 0,
          life: 2.6
        });
      }
    }

    const grav = p.vy < 0 && input.jump ? 0.42 : 0.62;
    p.vy = Math.min(12.5, p.vy + grav);

    p.x += p.vx;
    this.resolvePlayerX(p);

    const prevBottom = p.y + p.h;
    p.y += p.vy;
    p.onGround = false;
    this.resolvePlayerY(p, prevBottom, input.jump);

    if (p.y > VIEW_H + 40) {
      this.killPlayer();
      return;
    }

    this.checkPlayerTileInteractions(p);
    this.checkCoinsAndCheckpoint(p);
  }

  resolvePlayerX(p) {
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    const maxRight = this.level.width * TILE - p.w;
    if (p.x > maxRight) {
      p.x = maxRight;
      p.vx = 0;
    }

    const top = Math.floor((p.y + 2) / TILE);
    const bottom = Math.floor((p.y + p.h - 2) / TILE);

    if (p.vx > 0) {
      const rightTile = Math.floor((p.x + p.w) / TILE);
      for (let ty = top; ty <= bottom; ty++) {
        if (this.isSolid(rightTile, ty)) {
          p.x = rightTile * TILE - p.w - 0.01;
          p.vx = 0;
          break;
        }
      }
    } else if (p.vx < 0) {
      const leftTile = Math.floor(p.x / TILE);
      for (let ty = top; ty <= bottom; ty++) {
        if (this.isSolid(leftTile, ty)) {
          p.x = (leftTile + 1) * TILE + 0.01;
          p.vx = 0;
          break;
        }
      }
    }
  }

  resolvePlayerY(p, prevBottom, jumpHeld) {
    const left = Math.floor((p.x + 2) / TILE);
    const right = Math.floor((p.x + p.w - 2) / TILE);

    if (p.vy >= 0) {
      const bottomTile = Math.floor((p.y + p.h) / TILE);
      for (let tx = left; tx <= right; tx++) {
        if (this.isSolid(tx, bottomTile)) {
          const tileCode = this.getTile(tx, bottomTile);
          p.y = bottomTile * TILE - p.h;
          if (tileCode === "SP1" || tileCode === "SP2") {
            this.level.grid[bottomTile][tx] = "SP2";
            this.springTimers.set(`${tx},${bottomTile}`, 0.22);
            p.vy = jumpHeld ? -16.8 : -13.4;
            p.onGround = false;
            this.audio.sfx("spring");
            return;
          }
          p.vy = 0;
          p.onGround = true;

          if (tileCode === "DN") {
            const dKey = `${tx},${bottomTile}`;
            const cur = (this.donutTimers.get(dKey) || 0) + 1 / 60;
            if (cur >= 0.42) {
              this.donutTimers.delete(dKey);
              this.level.grid[bottomTile][tx] = null;
              this.fallingDonuts.push({
                gx: tx,
                gy: bottomTile,
                x: tx * TILE,
                y: bottomTile * TILE,
                vy: 1.2,
                respawn: 4.5
              });
            } else {
              this.donutTimers.set(dKey, cur);
            }
          }
          break;
        }
      }

      for (const plat of this.platforms) {
        const overlapsX = p.x + p.w > plat.x + 2 && p.x < plat.x + plat.w - 2;
        if (overlapsX && prevBottom <= plat.y + 8 && p.y + p.h >= plat.y) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.x += plat.vx;
          this.resolvePlayerX(p);
          break;
        }
      }
    } else {
      const topTile = Math.floor(p.y / TILE);
      const centerTx = Math.floor((p.x + p.w * 0.5) / TILE);
      const candidateCols = [centerTx, left, right];
      for (const tx of candidateCols) {
        if (tx >= left && tx <= right && this.isSolid(tx, topTile)) {
          p.y = (topTile + 1) * TILE + 0.01;
          p.vy = 0.8;
          this.handleBlockHit(tx, topTile);
          break;
        }
      }
    }
  }

  handleBlockHit(tx, ty) {
    const tile = this.getTile(tx, ty);
    const key = `${tx},${ty}`;
    const content = this.level.blockContents[key];

    // Knock enemies standing on this block
    const bx = tx * TILE;
    const by = ty * TILE;
    for (const e of this.enemies) {
      if (!e.alive || e.type === "chomp" || e.type === "crusher") continue;
      if (e.x + e.w > bx - 4 && e.x < bx + TILE + 4 && Math.abs(e.y + e.h - by) <= 10) {
        this.defeatEnemyWithFlip(e, 200);
      }
    }

    if (tile === "Q1" || content) {
      this.bumps.set(key, { t: 0.01 });
      if (content === "coin") {
        delete this.level.blockContents[key];
        this.level.grid[ty][tx] = "E";
        this.addCoin(bx + 8, by - 20);
        this.spawnParticles(bx + 16, by - 8, "#ffe45e", 6, 2.8);
      } else if (content === "multicoin") {
        this.multiCoinLeft = this.multiCoinLeft || {};
        this.multiCoinLeft[key] = (this.multiCoinLeft[key] ?? 5) - 1;
        this.addCoin(bx + 8, by - 20);
        this.spawnParticles(bx + 16, by - 8, "#ffe45e", 5, 2.5);
        if (this.multiCoinLeft[key] <= 0) {
          delete this.level.blockContents[key];
          this.level.grid[ty][tx] = "E";
        }
      } else if (content === "power" || content === "oneup" || content === "star") {
        delete this.level.blockContents[key];
        this.level.grid[ty][tx] = "E";
        let kind = content;
        if (content === "power") {
          kind = this.player.power === 0 ? "mushroom" : "flower";
        }
        this.audio.sfx("powerup_spawn");
        this.items.push({
          kind,
          x: bx + 3,
          y: by,
          targetY: by - 28,
          emerging: true,
          w: 26,
          h: 26,
          vx: kind === "flower" ? 0 : 1.55,
          vy: 0
        });
      }
      return;
    }

    if (tile === "B" || tile === "UB") {
      if (this.player.power > 0) {
        this.level.grid[ty][tx] = null;
        this.audio.sfx("brick");
        this.addScore(50);
        const shardCol = tile === "UB" ? "#589ee6" : "#d86436";
        this.spawnParticles(bx + 16, by + 16, shardCol, 10, 4.6, 0.28, 7);
      } else {
        this.bumps.set(key, { t: 0.01 });
        this.audio.sfx("bump");
      }
    } else {
      this.audio.sfx("bump");
    }
  }

  checkPlayerTileInteractions(p) {
    const x0 = Math.floor((p.x + 3) / TILE);
    const x1 = Math.floor((p.x + p.w - 3) / TILE);
    const y0 = Math.floor((p.y + 3) / TILE);
    const y1 = Math.floor((p.y + p.h - 3) / TILE);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.getTile(tx, ty);
        if (t === "LV1" || t === "LV2") {
          this.killPlayer();
          return;
        }
        if (t === "SK") {
          this.damagePlayer();
          return;
        }
        if (t === "FP" || t === "FT") {
          this.triggerFlagpole(tx);
          return;
        }
        if (t === "AX" && !this.bridgeCollapse) {
          this.triggerAxeCollapse(tx, ty);
          return;
        }
      }
    }

    // If Boss was defeated via fireballs/stomps, reaching the Royal Door finishes World 1-4
    if (this.boss && !this.boss.alive && !this.bridgeCollapse && !this.flagSequence) {
      const doorWorldX = this.boss.doorX * TILE;
      if (p.x + p.w >= doorWorldX) {
        this.completeStage(5000);
      }
    }
  }

  checkCoinsAndCheckpoint(p) {
    for (const c of this.coinsList) {
      if (!c.collected && this.aabb(p, c)) {
        c.collected = true;
        this.addCoin(c.x, c.y);
        this.spawnParticles(c.x + 12, c.y + 12, "#ffe45e", 5, 2.2, 0.1, 4);
      }
    }

    const cp = this.level.checkpoint;
    if (cp && !cp.activated) {
      const cpBox = { x: cp.x * TILE, y: (cp.y - 1) * TILE, w: 32, h: 64 };
      if (this.aabb(p, cpBox)) {
        cp.activated = true;
        this.savedCheckpoint = { worldIdx: this.worldIndex, x: cp.x, y: cp.y };
        this.audio.sfx("checkpoint");
        this.addScore(500, cpBox.x, cpBox.y, "CHECKPOINT!");
        this.spawnParticles(cpBox.x + 16, cpBox.y + 16, "#5eff82", 12, 3.4);
      }
    }
  }

  triggerFlagpole(flagTx) {
    if (this.flagSequence) return;
    const g = this.level.goal;
    const p = this.player;
    const poleTopPx = g.topY * TILE;
    const poleBottomPx = (g.bottomY + 1) * TILE - p.h;
    const ratio = Math.max(0, Math.min(1, 1 - (p.y - poleTopPx) / Math.max(1, poleBottomPx - poleTopPx)));
    const bonus = [100, 400, 800, 2000, 5000][Math.min(4, Math.floor(ratio * 5))];

    this.audio.sfx("flagpole");
    this.addScore(bonus, flagTx * TILE, p.y, `+${bonus}`);

    p.x = flagTx * TILE - p.w + 14;
    p.vx = 0;
    p.vy = 0;

    this.flagSequence = {
      phase: "slide",
      flagY: g.topY * TILE + 8,
      poleBottomPx,
      castleDoorX: (g.castleX) * TILE + 4,
      timer: 0
    };
  }

  updateFlagSequence(dt) {
    const seq = this.flagSequence;
    const p = this.player;
    if (seq.phase === "slide") {
      p.y = Math.min(seq.poleBottomPx, p.y + 3.6);
      seq.flagY = Math.min((this.level.goal.bottomY) * TILE, seq.flagY + 3.8);
      if (p.y >= seq.poleBottomPx && seq.flagY >= (this.level.goal.bottomY) * TILE) {
        seq.phase = "march";
        p.facing = 1;
        this.audio.sfx("victory");
      }
    } else if (seq.phase === "march") {
      p.vx = 2.2;
      p.walkCycle += 0.22;
      p.x += p.vx;
      p.vy = Math.min(10, p.vy + 0.55);
      p.y += p.vy;
      this.resolvePlayerY(p, p.y + p.h - p.vy, false);

      if (Math.random() < 0.14) {
        const fwColors = ["#ffe45e", "#ff5e7e", "#5ee6ff", "#6bff89"];
        this.spawnParticles(
          seq.castleDoorX - 40 + Math.random() * 120,
          90 + Math.random() * 110,
          fwColors[Math.floor(Math.random() * fwColors.length)],
          12,
          3.8,
          0.08,
          5
        );
      }

      if (p.x >= seq.castleDoorX) {
        seq.phase = "done";
        seq.timer = 0.85;
      }
    } else if (seq.phase === "done") {
      seq.timer -= dt;
      if (seq.timer <= 0) {
        const timeBonus = Math.ceil(this.timeLeft) * 10;
        this.flagSequence = null;
        this.completeStage(timeBonus);
      }
    }
  }

  triggerAxeCollapse(axTx, axTy) {
    this.level.grid[axTy][axTx] = null;
    this.audio.stopBgm(false);
    this.audio.sfx("explosion");
    this.screenShake = 12;
    this.player.vx = 0;

    this.bridgeCollapse = {
      currentX: this.boss.bridgeEndX,
      startX: this.boss.bridgeStartX,
      y: this.boss.bridgeY,
      stepTimer: 0.05,
      phase: "collapsing",
      doorX: this.boss.doorX * TILE,
      waitTimer: 0
    };
  }

  updateBridgeCollapse(dt) {
    const bc = this.bridgeCollapse;
    if (bc.phase === "collapsing") {
      bc.stepTimer -= dt;
      if (bc.stepTimer <= 0) {
        bc.stepTimer = 0.055;
        if (bc.currentX >= bc.startX) {
          this.level.grid[bc.y][bc.currentX] = null;
          this.spawnParticles(bc.currentX * TILE + 16, bc.y * TILE + 16, "#e49e4e", 6, 3.2);
          this.audio.tone(180 + (bc.currentX - bc.startX) * 18, 0.05, "sawtooth", 0.1);
          bc.currentX--;
        } else {
          bc.phase = "boss_fall";
          if (this.boss && this.boss.alive) {
            this.boss.fallingInLava = true;
            this.boss.vy = -3;
            this.audio.sfx("boss_roar");
          }
        }
      }
    } else if (bc.phase === "boss_fall") {
      if (this.boss && this.boss.alive) {
        this.boss.vy += 0.48;
        this.boss.py += this.boss.vy;
        if (this.boss.py > VIEW_H) {
          this.boss.alive = false;
          this.addScore(5000, this.player.x, this.player.y - 24, "+5000 BOSS KO!");
          this.audio.sfx("victory");
          bc.phase = "march";
        }
      } else {
        this.audio.sfx("victory");
        bc.phase = "march";
      }
    } else if (bc.phase === "march") {
      const p = this.player;
      p.facing = 1;
      p.vx = 2.3;
      p.walkCycle += 0.22;
      p.x += p.vx;
      p.vy = Math.min(10, p.vy + 0.55);
      p.y += p.vy;
      this.resolvePlayerY(p, p.y + p.h - p.vy, false);

      if (Math.random() < 0.18) {
        const cols = ["#ffe45e", "#ff5e7e", "#5ee6ff", "#7dff7a"];
        this.spawnParticles(
          bc.doorX - 80 + Math.random() * 140,
          80 + Math.random() * 120,
          cols[Math.floor(Math.random() * cols.length)],
          14,
          4.2,
          0.08,
          5
        );
      }

      if (p.x >= bc.doorX) {
        this.bridgeCollapse = null;
        this.completeStage(Math.ceil(this.timeLeft) * 15 + 3000);
      }
    }
  }

  completeStage(bonusScore = 0) {
    this.addScore(bonusScore);
    this.carriedPower = this.player.power;
    this.savedCheckpoint = null;

    if (!this.clearedWorlds.includes(this.worldIndex)) {
      this.clearedWorlds.push(this.worldIndex);
      localStorage.setItem("snb_cleared", JSON.stringify(this.clearedWorlds));
    }
    const nextIdx = this.worldIndex + 1;
    if (nextIdx > this.unlockedWorld && nextIdx < WORLDS.length) {
      this.unlockedWorld = nextIdx;
      localStorage.setItem("snb_unlocked", String(this.unlockedWorld));
    }

    this.state = nextIdx < WORLDS.length ? "stage_clear" : "game_complete";
    this.emitHud();
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(this.state, {
        ...this.getSummary(),
        bonusScore,
        hasNextWorld: nextIdx < WORLDS.length,
        nextWorldIndex: nextIdx
      });
    }
  }

  updateItems(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.emerging) {
        it.y -= 1.1;
        if (it.y <= it.targetY) {
          it.y = it.targetY;
          it.emerging = false;
        }
        continue;
      }

      if (it.kind !== "flower") {
        it.vy = Math.min(9.5, it.vy + 0.45);
        it.x += it.vx;
        const tx = Math.floor((it.vx > 0 ? it.x + it.w : it.x) / TILE);
        const ty = Math.floor((it.y + it.h * 0.5) / TILE);
        if (this.isSolid(tx, ty)) {
          it.vx = -it.vx;
        }

        it.y += it.vy;
        const footY = Math.floor((it.y + it.h) / TILE);
        const leftX = Math.floor((it.x + 3) / TILE);
        const rightX = Math.floor((it.x + it.w - 3) / TILE);
        if (this.isSolid(leftX, footY) || this.isSolid(rightX, footY)) {
          it.y = footY * TILE - it.h;
          it.vy = it.kind === "star" ? -7.4 : 0;
        }
      }

      if (it.y > VIEW_H + 64) {
        this.items.splice(i, 1);
        continue;
      }

      if (this.aabb(this.player, it)) {
        this.collectItem(it);
        this.items.splice(i, 1);
      }
    }
  }

  collectItem(it) {
    const p = this.player;
    if (it.kind === "mushroom") {
      this.audio.sfx("powerup");
      if (p.power === 0) {
        p.y -= 16;
        p.w = 22;
        p.h = 42;
        p.power = 1;
      }
      this.addScore(1000, it.x, it.y, "SUPER!");
      this.spawnParticles(p.x + 11, p.y + 20, "#ff5e6c", 12, 3.5);
    } else if (it.kind === "flower") {
      this.audio.sfx("powerup");
      if (p.power === 0) {
        p.y -= 16;
        p.w = 22;
        p.h = 42;
      }
      p.power = 2;
      this.addScore(1000, it.x, it.y, "FIRE POWER!");
      this.spawnParticles(p.x + 11, p.y + 20, "#ff9e3d", 14, 3.8);
    } else if (it.kind === "oneup") {
      this.lives++;
      this.audio.sfx("one_up");
      this.addScore(1000, it.x, it.y, "1-UP!");
      this.spawnParticles(p.x + 11, p.y + 20, "#5eff82", 12, 3.5);
    } else if (it.kind === "star") {
      p.starTimer = 10.5;
      this.audio.sfx("powerup");
      this.audio.playBgm("starman");
      this.addScore(1000, it.x, it.y, "INVINCIBLE!");
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0 || pr.x < this.cameraX - 96 || pr.x > this.cameraX + VIEW_W + 96) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.fromPlayer) {
        pr.vy = Math.min(8.5, pr.vy + 0.45);
        pr.x += pr.vx;
        const wallTx = Math.floor((pr.vx > 0 ? pr.x + pr.w : pr.x) / TILE);
        const wallTy = Math.floor((pr.y + pr.h * 0.5) / TILE);
        if (this.isSolid(wallTx, wallTy)) {
          this.spawnParticles(pr.x + 7, pr.y + 7, "#ff9933", 6, 2.4);
          this.projectiles.splice(i, 1);
          continue;
        }

        pr.y += pr.vy;
        const floorTy = Math.floor((pr.y + pr.h) / TILE);
        const floorTx = Math.floor((pr.x + pr.w * 0.5) / TILE);
        if (this.isSolid(floorTx, floorTy)) {
          pr.y = floorTy * TILE - pr.h;
          pr.vy = -5.6;
        }

        let hit = false;
        for (const e of this.enemies) {
          if (!e.alive || e.flipped || e.type === "crusher") continue;
          if (e.type === "chomp" && e.y > e.baseY + 22) continue;
          if (this.aabb(pr, e)) {
            if (e.type === "beetle") {
              this.audio.sfx("bump");
            } else {
              this.defeatEnemyWithFlip(e, 200);
            }
            hit = true;
            break;
          }
        }

        if (!hit && this.boss && this.boss.alive) {
          const bBox = { x: this.boss.px + 4, y: this.boss.py + 4, w: this.boss.w, h: this.boss.h };
          if (this.aabb(pr, bBox)) {
            this.damageBoss(1, pr.x, pr.y);
            hit = true;
          }
        }

        if (hit) {
          this.spawnParticles(pr.x + 7, pr.y + 7, "#ffae38", 7, 2.8);
          this.projectiles.splice(i, 1);
        }
      } else {
        pr.x += pr.vx;
        pr.y += pr.vy;
        if (this.aabb(this.player, pr)) {
          this.damagePlayer();
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x - p.x) > VIEW_W * 1.15 && e.state !== "shell_spin") continue;

      if (e.flipped) {
        e.vy += 0.45;
        e.x += e.vx;
        e.y += e.vy;
        if (e.y > VIEW_H + 64) e.alive = false;
        continue;
      }

      if (e.type === "chomp") {
        this.updateChomp(e, dt);
        continue;
      }
      if (e.type === "flyer") {
        this.updateFlyer(e, dt);
        continue;
      }
      if (e.type === "crusher") {
        this.updateCrusher(e, dt);
        continue;
      }

      if (e.state === "squashed") {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) e.alive = false;
        continue;
      }

      if (e.kickGrace > 0) e.kickGrace = Math.max(0, e.kickGrace - dt);

      e.vy = Math.min(10, e.vy + 0.5);
      e.x += e.vx;

      const sideTx = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / TILE);
      const midTy = Math.floor((e.y + e.h * 0.5) / TILE);
      if (this.isSolid(sideTx, midTy)) {
        if (e.state === "shell_spin") {
          const hitTile = this.getTile(sideTx, midTy);
          if (hitTile === "B" || hitTile === "UB") {
            this.level.grid[midTy][sideTx] = null;
            this.audio.sfx("brick");
            this.addScore(50);
            this.spawnParticles(sideTx * TILE + 16, midTy * TILE + 16, "#d86436", 8, 3.6);
          } else {
            this.audio.sfx("bump");
          }
        }
        e.vx = -e.vx;
        e.facing = e.vx >= 0 ? 1 : -1;
      }

      e.y += e.vy;
      const footTy = Math.floor((e.y + e.h) / TILE);
      const lx = Math.floor((e.x + 3) / TILE);
      const rx = Math.floor((e.x + e.w - 3) / TILE);
      if (this.isSolid(lx, footTy) || this.isSolid(rx, footTy)) {
        e.y = footTy * TILE - e.h;
        e.vy = 0;
        e.onGround = true;

        // Walkers turn gently on cloud/brick ledges so they stay active in athletic stages
        if (e.state === "walk") {
          const aheadTx = Math.floor((e.vx > 0 ? e.x + e.w + 4 : e.x - 4) / TILE);
          const groundCode = this.getTile(lx, footTy) || this.getTile(rx, footTy);
          if ((groundCode === "CL" || groundCode === "B" || groundCode === "UB") && !this.isSolid(aheadTx, footTy)) {
            e.vx = -e.vx;
            e.facing = e.vx >= 0 ? 1 : -1;
          }
        }
      } else {
        e.onGround = false;
      }

      if (e.y > VIEW_H + 64) {
        e.alive = false;
        continue;
      }

      if (e.state === "shell_spin") {
        for (const other of this.enemies) {
          if (other === e || !other.alive || other.flipped || other.type === "crusher" || other.state === "squashed") continue;
          if (other.type === "chomp" && other.y > other.baseY + 22) continue;
          if (this.aabb(e, other)) {
            e.shellCombo++;
            const pts = [200, 400, 800, 1000, 1000][Math.min(4, e.shellCombo - 1)];
            if (e.shellCombo >= 5) {
              this.lives++;
              this.audio.sfx("one_up");
              this.defeatEnemyWithFlip(other, pts, "1-UP!");
            } else {
              this.defeatEnemyWithFlip(other, pts);
            }
          }
        }
      }

      this.checkPlayerEnemyCollision(p, e);
    }
  }

  updateChomp(e, dt) {
    const p = this.player;
    e.timer -= dt;
    const playerNearPipe = Math.abs(p.x + p.w * 0.5 - (e.x + 16)) < 46;

    if (e.phase === "hidden") {
      e.y = e.baseY + 28;
      if (e.timer <= 0 && !playerNearPipe) {
        e.phase = "rising";
      }
    } else if (e.phase === "rising") {
      e.y -= 1.1;
      if (e.y <= e.baseY - 30) {
        e.y = e.baseY - 30;
        e.phase = "shown";
        e.timer = 1.35;
      }
    } else if (e.phase === "shown") {
      if (e.timer <= 0) {
        e.phase = "sinking";
      }
    } else if (e.phase === "sinking") {
      e.y += 1.1;
      if (e.y >= e.baseY + 28) {
        e.y = e.baseY + 28;
        e.phase = "hidden";
        e.timer = 1.4;
      }
    }

    if (e.y < e.baseY + 18) {
      const hitBox = { x: e.x + 4, y: e.y + 4, w: 20, h: 26 };
      if (this.aabb(p, hitBox)) {
        if (p.starTimer > 0) {
          this.defeatEnemyWithFlip(e, 200);
        } else {
          this.damagePlayer();
        }
      }
    }
  }

  updateFlyer(e, dt) {
    e.t += dt * 3.2;
    e.x += e.vx;
    e.y = e.baseY + Math.sin(e.t) * 26;
    e.facing = e.vx >= 0 ? 1 : -1;
    if (e.x < 16) e.vx = Math.abs(e.vx);
    this.checkPlayerEnemyCollision(this.player, e);
  }

  updateCrusher(e, dt) {
    const p = this.player;
    if (e.phase === "idle") {
      if (Math.abs(p.x + p.w * 0.5 - (e.x + 15)) < 82 && p.y > e.y) {
        e.phase = "falling";
        e.vy = 2;
      }
    } else if (e.phase === "falling") {
      e.vy = Math.min(12, e.vy + 0.72);
      e.y += e.vy;
      const footTy = Math.floor((e.y + e.h) / TILE);
      const tx = Math.floor((e.x + 15) / TILE);
      if (this.isSolid(tx, footTy)) {
        e.y = footTy * TILE - e.h;
        e.vy = 0;
        e.phase = "paused";
        e.timer = 0.65;
        this.screenShake = 8;
        this.audio.sfx("explosion");
        this.spawnParticles(e.x + 15, e.y + e.h, "#c4cbd8", 8, 3.0);
      }
    } else if (e.phase === "paused") {
      e.timer -= dt;
      if (e.timer <= 0) e.phase = "rising";
    } else if (e.phase === "rising") {
      e.y -= 1.5;
      if (e.y <= e.homeY) {
        e.y = e.homeY;
        e.phase = "idle";
      }
    }

    if (this.aabb(p, e) && p.starTimer <= 0) {
      this.damagePlayer();
    }
  }

  checkPlayerEnemyCollision(p, e) {
    if (!this.aabb(p, e)) return;

    if (p.starTimer > 0) {
      this.defeatEnemyWithFlip(e, 200);
      return;
    }

    const stomp = p.vy > 0 && p.y + p.h - p.vy <= e.y + 14;

    if (e.state === "shell_idle") {
      const dir = p.x + p.w * 0.5 < e.x + e.w * 0.5 ? 1 : -1;
      e.state = "shell_spin";
      e.vx = dir * 7.8;
      e.kickGrace = 0.16;
      e.shellCombo = 0;
      if (stomp) p.vy = -7.8;
      this.audio.sfx("kick");
      this.addScore(400, e.x, e.y);
      return;
    }

    if (stomp) {
      p.stompCombo++;
      const pts = [100, 200, 400, 800, 1000][Math.min(4, p.stompCombo - 1)];
      p.vy = -8.4;
      this.audio.sfx("stomp");

      if (e.type === "koopa" || e.type === "beetle") {
        e.state = "shell_idle";
        e.vx = 0;
        e.kickGrace = 0.14;
      } else if (e.type === "flyer") {
        this.defeatEnemyWithFlip(e, pts);
        return;
      } else {
        e.state = "squashed";
        e.vx = 0;
        e.stateTimer = 0.45;
      }

      if (p.stompCombo >= 5) {
        this.lives++;
        this.audio.sfx("one_up");
        this.addScore(pts, e.x, e.y, "1-UP!");
      } else {
        this.addScore(pts, e.x, e.y);
      }
    } else if (e.kickGrace <= 0) {
      this.damagePlayer();
    }
  }

  defeatEnemyWithFlip(e, pts = 200, customLabel = null) {
    e.flipped = true;
    e.vy = -6.4;
    e.vx = (Math.random() < 0.5 ? -1 : 1) * 1.6;
    this.audio.sfx("kick");
    this.addScore(pts, e.x, e.y, customLabel);
    this.spawnParticles(e.x + 14, e.y + 14, "#ffe45e", 6, 2.8);
  }

  updateBoss(dt) {
    const b = this.boss;
    if (!b.alive) return;
    const p = this.player;
    if (Math.abs(p.x - b.px) > VIEW_W * 0.95) return;

    if (b.hurtFlash > 0) b.hurtFlash = Math.max(0, b.hurtFlash - dt);
    if (b.roarTimer > 0) b.roarTimer = Math.max(0, b.roarTimer - dt);

    b.facing = p.x < b.px ? -1 : 1;
    b.px += b.vx;
    if (b.px <= b.minX * TILE) {
      b.px = b.minX * TILE;
      b.vx = Math.abs(b.vx);
    } else if (b.px >= b.maxX * TILE) {
      b.px = b.maxX * TILE;
      b.vx = -Math.abs(b.vx);
    }

    b.jumpTimer -= dt;
    if (b.jumpTimer <= 0 && b.onGround) {
      b.vy = -10.2;
      b.onGround = false;
      b.jumpTimer = 2.4 + Math.random() * 1.1;
    }

    b.fireTimer -= dt;
    if (b.fireTimer <= 0) {
      b.fireTimer = 1.9 + Math.random() * 0.9;
      b.roarTimer = 0.45;
      this.audio.sfx("boss_roar");
      const dir = p.x < b.px ? -1 : 1;
      const targetY = Math.max(b.py - 20, Math.min(b.py + 36, p.y));
      const dy = (targetY - (b.py + 18)) * 0.015;
      this.projectiles.push({
        fromPlayer: false,
        x: dir < 0 ? b.px - 20 : b.px + b.w,
        y: b.py + 18,
        w: 28,
        h: 16,
        vx: dir * 4.4,
        vy: Math.max(-1.6, Math.min(1.6, dy)),
        life: 3.4
      });
    }

    b.vy = Math.min(10, b.vy + 0.42);
    b.py += b.vy;
    const footTy = Math.floor((b.py + b.h) / TILE);
    const lx = Math.floor((b.px + 8) / TILE);
    const rx = Math.floor((b.px + b.w - 8) / TILE);
    if (this.isSolid(lx, footTy) || this.isSolid(rx, footTy)) {
      if (!b.onGround && b.vy > 4) {
        this.screenShake = 6;
      }
      b.py = footTy * TILE - b.h;
      b.vy = 0;
      b.onGround = true;
    } else {
      b.onGround = false;
    }

    const bBox = { x: b.px + 4, y: b.py + 4, w: b.w, h: b.h };
    if (this.aabb(p, bBox)) {
      const stomp = p.vy > 0 && p.y + p.h - p.vy <= b.py + 18 && b.roarTimer <= 0;
      if (stomp || p.starTimer > 0) {
        p.vy = -9.6;
        this.damageBoss(stomp ? 3 : 2, b.px + 24, b.py);
      } else {
        this.damagePlayer();
      }
    }
  }

  damageBoss(amount, fx, fy) {
    const b = this.boss;
    if (!b || !b.alive) return;
    b.hp -= amount;
    b.hurtFlash = 0.22;
    this.audio.sfx("kick");
    this.spawnParticles(fx, fy, "#ffae38", 10, 3.6);
    if (b.hp <= 0) {
      b.hp = 0;
      b.alive = false;
      this.level.grid[b.axeY][b.axeX] = null;
      this.screenShake = 14;
      this.audio.sfx("explosion");
      this.audio.sfx("victory");
      this.addScore(5000, b.px, b.py, "+5000 BOSS KO!");
      this.spawnParticles(b.px + 32, b.py + 32, "#ffe45e", 26, 5.2, 0.16, 6);
    }
  }

  updateFirebars() {
    const p = this.player;
    if (!this.level.firebars.length || p.starTimer > 0) return;
    const t = this.animTick / 60;
    for (const fb of this.level.firebars) {
      const ang = fb.phase + t * fb.speed;
      for (let seg = 1; seg <= fb.length; seg++) {
        const fx = fb.cx + Math.cos(ang) * seg * 18 - 7;
        const fy = fb.cy + Math.sin(ang) * seg * 18 - 7;
        if (this.aabb(p, { x: fx, y: fy, w: 14, h: 14 })) {
          this.damagePlayer();
          return;
        }
      }
    }
  }

  damagePlayer() {
    const p = this.player;
    if (p.hurtTimer > 0 || p.starTimer > 0 || p.dead) return;
    if (p.power > 0) {
      p.power = 0;
      p.y += 16;
      p.w = 20;
      p.h = 26;
      p.hurtTimer = 2.0;
      this.screenShake = 6;
      this.audio.sfx("powerdown");
      this.spawnParticles(p.x + 10, p.y + 12, "#ffffff", 10, 3.0);
    } else {
      this.killPlayer();
    }
  }

  killPlayer() {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    p.vy = -9.6;
    p.vx = 0;
    p.deathTimer = 2.1;
    this.lives--;
    this.carriedPower = 0;
    this.screenShake = 10;
    this.audio.sfx("die");
    this.emitHud();
  }

  updateParticlesAndPopups(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.vy += pt.gravity;
      pt.x += pt.vx;
      pt.y += pt.vy;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt;
      pop.y -= 0.75;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }
  }

  aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  getSummary() {
    return {
      score: this.score,
      highScore: this.highScore,
      coins: this.coins,
      lives: this.lives,
      worldIndex: this.worldIndex,
      worldCode: this.level?.code || "1-1",
      worldName: this.level?.name || "Emerald Hills",
      clearedWorlds: [...this.clearedWorlds]
    };
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    if (!this.level) {
      const bg = this.assets.images.bg_overworld;
      if (bg) {
        ctx.drawImage(bg, 0, 0, VIEW_W, VIEW_H);
      }
      ctx.restore();
      return;
    }

    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

    this.renderParallaxBackground(ctx);
    this.renderTiles(ctx);
    this.renderPlatformsAndDonuts(ctx);
    this.renderCoinsAndItems(ctx);
    this.renderCheckpointAndFlag(ctx);
    this.renderEnemies(ctx);
    if (this.boss) this.renderBoss(ctx);
    this.renderFirebars(ctx);
    this.renderProjectiles(ctx);
    this.renderPlayer(ctx);
    this.renderParticlesAndPopups(ctx);

    ctx.restore();
  }

  renderParallaxBackground(ctx) {
    const bg = this.assets.images[this.level.bgKey];
    if (!bg) return;
    const scale = VIEW_H / bg.height;
    const drawW = Math.round(bg.width * scale);
    const scroll = Math.floor((this.cameraX * 0.35) % drawW);
    for (let x = -scroll; x < VIEW_W + drawW; x += drawW) {
      ctx.drawImage(bg, x, 0, drawW, VIEW_H);
    }
  }

  renderTiles(ctx) {
    const startCol = Math.max(0, Math.floor(this.cameraX / TILE) - 1);
    const endCol = Math.min(this.level.width - 1, Math.ceil((this.cameraX + VIEW_W) / TILE) + 1);
    const qFrame = ["Q1", "Q2", "Q3", "Q2"][Math.floor(this.animTick / 12) % 4];
    const lavaFrame = Math.floor(this.animTick / 16) % 2 === 0 ? "LV1" : "LV2";

    for (let ty = 0; ty < this.level.rows; ty++) {
      for (let tx = startCol; tx <= endCol; tx++) {
        let code = this.level.grid[ty][tx];
        if (!code) continue;
        if (code === "Q1") code = qFrame;
        if (code === "LV1") code = lavaFrame;

        const key = `${tx},${ty}`;
        let offsetY = 0;
        let offsetX = 0;
        const bump = this.bumps.get(key);
        if (bump) {
          offsetY = -Math.sin(bump.t) * 10;
        }
        if (code === "DN" && this.donutTimers.has(key)) {
          offsetX = Math.sin(this.animTick * 1.8) * 2.5;
        }

        this.assets.drawTile(ctx, code, tx * TILE - this.cameraX + offsetX, ty * TILE + offsetY);
      }
    }
  }

  renderPlatformsAndDonuts(ctx) {
    for (const plat of this.platforms) {
      const tilesCount = Math.round(plat.w / TILE);
      for (let i = 0; i < tilesCount; i++) {
        this.assets.drawTile(ctx, "PL", plat.x + i * TILE - this.cameraX, plat.y - 4);
      }
    }

    for (const fd of this.fallingDonuts) {
      this.assets.drawTile(ctx, "DN", fd.x - this.cameraX, fd.y);
    }
  }

  renderCoinsAndItems(ctx) {
    const coinFrame = `coin${Math.floor(this.animTick / 9) % 4}`;
    for (const c of this.coinsList) {
      if (c.collected) continue;
      if (c.x < this.cameraX - 40 || c.x > this.cameraX + VIEW_W + 40) continue;
      this.assets.drawItem(ctx, coinFrame, c.x - 4 - this.cameraX, c.y - 4);
    }

    for (const it of this.items) {
      this.assets.drawItem(ctx, it.kind, it.x - 3 - this.cameraX, it.y - 3);
    }
  }

  renderCheckpointAndFlag(ctx) {
    const cp = this.level.checkpoint;
    if (cp) {
      this.assets.drawItem(
        ctx,
        cp.activated ? "cp1" : "cp0",
        cp.x * TILE - this.cameraX,
        cp.y * TILE
      );
    }

    if (this.level.goal) {
      const fy = this.flagSequence ? this.flagSequence.flagY : this.level.goal.topY * TILE + 8;
      this.assets.drawItem(ctx, "flag", this.level.goal.flagX * TILE - 22 - this.cameraX, fy);
    }
  }

  renderEnemies(ctx) {
    const walkFrame = Math.floor(this.animTick / 10) % 2;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x < this.cameraX - 64 || e.x > this.cameraX + VIEW_W + 64) continue;

      const sx = e.x - this.cameraX;
      if (e.type === "shroomba") {
        const col = e.state === "squashed" ? 2 : walkFrame;
        this.assets.drawEnemy(ctx, 0, col, sx - 3, e.y + e.h - 32, e.facing, e.flipped);
      } else if (e.type === "koopa") {
        let col = walkFrame;
        if (e.state === "shell_idle") col = 2;
        if (e.state === "shell_spin") col = 2 + (Math.floor(this.animTick / 4) % 2);
        this.assets.drawEnemy(ctx, 1, col, sx - 3, e.y + e.h - 32, e.facing, e.flipped);
      } else if (e.type === "chomp") {
        if (e.y < e.baseY + 26) {
          this.assets.drawEnemy(ctx, 2, walkFrame, sx, e.y, -1, e.flipped);
          const pipeTy = Math.round(e.baseY / TILE);
          const pipeTx = Math.floor(e.x / TILE);
          this.assets.drawTile(ctx, "PTL", pipeTx * TILE - this.cameraX, pipeTy * TILE);
          this.assets.drawTile(ctx, "PTR", (pipeTx + 1) * TILE - this.cameraX, pipeTy * TILE);
          this.assets.drawTile(ctx, "PBL", pipeTx * TILE - this.cameraX, (pipeTy + 1) * TILE);
          this.assets.drawTile(ctx, "PBR", (pipeTx + 1) * TILE - this.cameraX, (pipeTy + 1) * TILE);
        }
      } else if (e.type === "flyer") {
        this.assets.drawEnemy(ctx, 2, 2 + walkFrame, sx - 3, e.y - 4, e.facing, e.flipped);
      } else if (e.type === "beetle") {
        const col = e.state === "walk" ? walkFrame : 2;
        this.assets.drawEnemy(ctx, 3, col, sx - 3, e.y + e.h - 32, e.facing, e.flipped);
      } else if (e.type === "crusher") {
        this.assets.drawEnemy(ctx, 3, 3, sx - 1, e.y, -1, false);
      }
    }
  }

  renderBoss(ctx) {
    const b = this.boss;
    if (!b.alive) return;
    if (b.hurtFlash > 0 && Math.floor(this.animTick / 2) % 2 === 0) return;

    let col = Math.floor(this.animTick / 12) % 2;
    if (b.roarTimer > 0) col = 2;
    else if (!b.onGround) col = 3;

    this.assets.drawBoss(
      ctx,
      col,
      b.px - 5 - this.cameraX,
      b.py + b.h - 64,
      b.facing,
      b.fallingInLava
    );
  }

  renderFirebars(ctx) {
    if (!this.level.firebars.length) return;
    const t = this.animTick / 60;
    const frameKey = Math.floor(this.animTick / 6) % 2 === 0 ? "fire0" : "fire1";
    for (const fb of this.level.firebars) {
      if (fb.cx < this.cameraX - 140 || fb.cx > this.cameraX + VIEW_W + 140) continue;
      const ang = fb.phase + t * fb.speed;
      for (let seg = 1; seg <= fb.length; seg++) {
        const fx = fb.cx + Math.cos(ang) * seg * 18 - 16 - this.cameraX;
        const fy = fb.cy + Math.sin(ang) * seg * 18 - 16;
        this.assets.drawItem(ctx, frameKey, fx, fy);
      }
    }
  }

  renderProjectiles(ctx) {
    const pFrame = Math.floor(this.animTick / 5) % 2;
    for (const pr of this.projectiles) {
      if (pr.fromPlayer) {
        this.assets.drawItem(ctx, `fire${pFrame}`, pr.x - 9 - this.cameraX, pr.y - 9);
      } else {
        this.assets.drawItem(
          ctx,
          `bossfire${pFrame}`,
          pr.x - 2 - this.cameraX,
          pr.y - 8,
          32,
          pr.vx > 0
        );
      }
    }
  }

  renderPlayer(ctx) {
    const p = this.player;
    if (!p) return;
    if (p.hurtTimer > 0 && Math.floor(this.animTick / 3) % 2 === 0) return;

    let powerRow = p.power;
    if (p.starTimer > 0) {
      powerRow = Math.floor(this.animTick / 4) % 3;
    }

    let frameCol = 0;
    if (p.dead) {
      frameCol = 5;
    } else if (this.flagSequence && this.flagSequence.phase === "slide") {
      frameCol = 6;
    } else if (p.castTimer > 0) {
      frameCol = 7;
    } else if (!p.onGround) {
      frameCol = p.vy < 0 ? 5 : 6;
    } else if (
      (this.keys.has("ArrowLeft") || this.keys.has("KeyA") || this.touchState.left) && p.vx > 0.8 ||
      (this.keys.has("ArrowRight") || this.keys.has("KeyD") || this.touchState.right) && p.vx < -0.8
    ) {
      frameCol = 4;
    } else if (Math.abs(p.vx) > 0.25) {
      frameCol = 1 + (Math.floor(p.walkCycle) % 3);
    }

    const drawX = p.x + (p.w - 32) * 0.5 - this.cameraX;
    const drawY = p.y + p.h - 48;
    this.assets.drawPlayer(ctx, powerRow, frameCol, drawX, drawY, p.facing, p.dead);
  }

  renderParticlesAndPopups(ctx) {
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
      ctx.fillRect(
        Math.round(pt.x - this.cameraX - pt.size * 0.5),
        Math.round(pt.y - pt.size * 0.5),
        pt.size,
        pt.size
      );
    }
    ctx.globalAlpha = 1;

    ctx.font = "bold 15px 'Trebuchet MS', monospace";
    ctx.textAlign = "center";
    for (const pop of this.popups) {
      const sx = Math.round(pop.x - this.cameraX);
      const sy = Math.round(pop.y);
      ctx.fillStyle = "#161324";
      ctx.fillText(pop.text, sx + 2, sy + 2);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, sx, sy);
    }
  }
}
