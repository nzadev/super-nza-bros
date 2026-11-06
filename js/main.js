import { AssetStore } from "./assets.js";
import { RetroAudio } from "./audio.js";
import { SuperGameEngine } from "./engine.js";
import { WORLD_METADATA } from "./levels.js";

const canvas = document.getElementById("game-canvas");
const loadingBar = document.getElementById("loading-bar-fill");
const loadingStatus = document.getElementById("loading-status");
const startActions = document.getElementById("start-actions");

const screenMenu = document.getElementById("screen-menu");
const screenWorlds = document.getElementById("screen-worlds");
const screenHelp = document.getElementById("screen-help");
const overlayPause = document.getElementById("overlay-pause");
const overlayResult = document.getElementById("overlay-result");
const touchLayer = document.getElementById("touch-controls");

const hudScore = document.getElementById("hud-score");
const hudCoins = document.getElementById("hud-coins");
const hudWorld = document.getElementById("hud-world");
const hudTime = document.getElementById("hud-time");
const hudLives = document.getElementById("hud-lives");
const hudPower = document.getElementById("hud-power");
const menuHighscore = document.getElementById("menu-highscore");

const bossHud = document.getElementById("boss-hud");
const bossNameEl = document.getElementById("boss-name");
const bossHpFill = document.getElementById("boss-hp-fill");

const resultBadge = document.getElementById("result-badge");
const resultTitle = document.getElementById("result-title");
const resultDesc = document.getElementById("result-desc");
const resultScore = document.getElementById("result-score");
const resultCoins = document.getElementById("result-coins");
const btnNextStage = document.getElementById("btn-next-stage");

const btnMute = document.getElementById("btn-mute");
const btnTouchToggle = document.getElementById("btn-touch-toggle");
const btnFullscreen = document.getElementById("btn-fullscreen");

const assets = new AssetStore();
const audio = new RetroAudio();

let pendingNextWorld = 0;

function updateMuteUi() {
  btnMute.textContent = audio.muted ? "🔇 Suara" : "🔊 Suara";
  btnMute.classList.toggle("is-muted", audio.muted);
}

const engine = new SuperGameEngine(canvas, assets, audio, {
  onMuteToggle: () => {
    audio.toggleMute();
    updateMuteUi();
  },
  onHudUpdate: (data) => {
    hudScore.textContent = String(data.score).padStart(6, "0");
    hudCoins.textContent = `x${String(data.coins).padStart(2, "0")}`;
    hudWorld.textContent = data.world;
    hudTime.textContent = String(data.time).padStart(3, "0");
    hudLives.textContent = `x${data.lives}`;
    hudPower.textContent = data.power;
    hudPower.dataset.power = data.power.toLowerCase();
    menuHighscore.textContent = String(data.highScore).padStart(6, "0");

    if (data.boss) {
      bossHud.classList.remove("hidden");
      bossNameEl.textContent = data.boss.name;
      const pct = Math.max(0, Math.min(100, (data.boss.hp / data.boss.maxHp) * 100));
      bossHpFill.style.width = `${pct}%`;
    } else {
      bossHud.classList.add("hidden");
    }
  },
  onStateChange: (state, summary) => {
    menuHighscore.textContent = String(summary.highScore).padStart(6, "0");
    overlayPause.classList.toggle("hidden", state !== "paused");

    if (state === "playing") {
      screenMenu.classList.add("hidden");
      screenWorlds.classList.add("hidden");
      screenHelp.classList.add("hidden");
      overlayResult.classList.add("hidden");
      return;
    }

    if (state === "stage_clear") {
      overlayResult.classList.remove("hidden");
      resultBadge.textContent = `WORLD ${summary.worldCode} SELESAI`;
      resultBadge.className = "badge badge-success";
      resultTitle.textContent = `${summary.worldName} Ditaklukkan!`;
      resultDesc.textContent = `Bonus Waktu & Bendera: +${summary.bonusScore} poin. Siap lanjut ke stage berikutnya?`;
      resultScore.textContent = summary.score.toLocaleString("id-ID");
      resultCoins.textContent = summary.coins;
      pendingNextWorld = summary.nextWorldIndex;
      btnNextStage.classList.remove("hidden");
      btnNextStage.textContent = `Lanjut World 1-${pendingNextWorld + 1} →`;
    } else if (state === "game_complete") {
      overlayResult.classList.remove("hidden");
      resultBadge.textContent = "TAMAT 100% - JUARA!";
      resultBadge.className = "badge badge-gold";
      resultTitle.textContent = "King Koopatron Berhasil Dikalahkan!";
      resultDesc.textContent = "Selamat! Seluruh 4 World di Super Nza Bros berhasil ditamatkan dengan gemilang.";
      resultScore.textContent = summary.score.toLocaleString("id-ID");
      resultCoins.textContent = summary.coins;
      btnNextStage.classList.add("hidden");
    } else if (state === "gameover") {
      overlayResult.classList.remove("hidden");
      bossHud.classList.add("hidden");
      resultBadge.textContent = "GAME OVER";
      resultBadge.className = "badge badge-danger";
      resultTitle.textContent = "Jangan Menyerah, Pahlawan!";
      resultDesc.textContent = `Petualangan terhenti di World ${summary.worldCode} (${summary.worldName}). Coba taklukkan lagi!`;
      resultScore.textContent = summary.score.toLocaleString("id-ID");
      resultCoins.textContent = summary.coins;
      btnNextStage.classList.add("hidden");
    }
  }
});

function renderWorldCards() {
  const grid = document.getElementById("world-grid");
  grid.innerHTML = "";
  const cleared = new Set(engine.clearedWorlds);

  WORLD_METADATA.forEach((w) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "world-card";
    const statusLabel = cleared.has(w.id) ? "✓ Selesai" : "Siap Main";
    card.innerHTML = `
      <div class="world-card-top">
        <span class="world-code">WORLD ${w.code}</span>
        <span class="world-status ${cleared.has(w.id) ? "done" : ""}">${statusLabel}</span>
      </div>
      <h3>${w.name}</h3>
      <p>${w.desc}</p>
    `;
    card.addEventListener("click", () => {
      engine.startNewGame(w.id);
    });
    grid.appendChild(card);
  });
}

function bindTouchControls() {
  const isCoarse = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (isCoarse) {
    touchLayer.classList.remove("hidden");
  }

  btnTouchToggle.addEventListener("click", () => {
    touchLayer.classList.toggle("hidden");
  });

  const buttons = touchLayer.querySelectorAll("[data-control]");
  buttons.forEach((btn) => {
    const ctrl = btn.dataset.control;
    const setActive = (val) => {
      engine.touchState[ctrl] = val;
      btn.classList.toggle("pressed", val);
    };

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      audio.unlock();
      btn.setPointerCapture?.(e.pointerId);
      setActive(true);
    });
    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      setActive(false);
    });
    btn.addEventListener("pointercancel", () => setActive(false));
    btn.addEventListener("lostpointercapture", () => setActive(false));
  });
}

function bindUiEvents() {
  updateMuteUi();
  menuHighscore.textContent = String(engine.highScore).padStart(6, "0");

  document.getElementById("btn-play").addEventListener("click", () => {
    engine.startNewGame(0);
  });

  document.getElementById("btn-open-worlds").addEventListener("click", () => {
    renderWorldCards();
    screenMenu.classList.add("hidden");
    screenWorlds.classList.remove("hidden");
  });

  document.getElementById("btn-back-from-worlds").addEventListener("click", () => {
    screenWorlds.classList.add("hidden");
    screenMenu.classList.remove("hidden");
  });

  document.getElementById("btn-open-help").addEventListener("click", () => {
    screenMenu.classList.add("hidden");
    screenHelp.classList.remove("hidden");
  });

  document.getElementById("btn-back-from-help").addEventListener("click", () => {
    screenHelp.classList.add("hidden");
    screenMenu.classList.remove("hidden");
  });

  document.getElementById("btn-pause").addEventListener("click", () => {
    if (engine.state === "playing" || engine.state === "paused") {
      engine.togglePause();
    }
  });

  document.getElementById("btn-restart-top").addEventListener("click", () => {
    if (engine.state === "playing" || engine.state === "paused") {
      engine.restartCurrentWorld();
    }
  });

  document.getElementById("btn-resume").addEventListener("click", () => {
    engine.togglePause();
  });

  document.getElementById("btn-pause-restart").addEventListener("click", () => {
    engine.restartCurrentWorld();
  });

  document.getElementById("btn-pause-menu").addEventListener("click", () => {
    audio.stopBgm();
    engine.state = "menu";
    overlayPause.classList.add("hidden");
    bossHud.classList.add("hidden");
    screenMenu.classList.remove("hidden");
  });

  btnNextStage.addEventListener("click", () => {
    engine.loadWorld(pendingNextWorld, false);
  });

  document.getElementById("btn-retry-stage").addEventListener("click", () => {
    engine.restartCurrentWorld();
  });

  document.getElementById("btn-result-menu").addEventListener("click", () => {
    audio.stopBgm();
    engine.state = "menu";
    overlayResult.classList.add("hidden");
    bossHud.classList.add("hidden");
    screenMenu.classList.remove("hidden");
  });

  btnMute.addEventListener("click", () => {
    audio.toggleMute();
    updateMuteUi();
  });

  btnFullscreen.addEventListener("click", () => {
    const shell = document.getElementById("arcade-shell");
    if (!document.fullscreenElement) {
      shell.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });
}

async function boot() {
  bindUiEvents();
  bindTouchControls();

  try {
    await assets.loadAll((progress) => {
      const pct = Math.round(progress * 100);
      loadingBar.style.width = `${pct}%`;
      loadingStatus.textContent = `Memuat aset pixel-art... ${pct}%`;
    });
    document.getElementById("loading-box").classList.add("hidden");
    startActions.classList.remove("hidden");
    engine.startLoop();
  } catch (err) {
    loadingStatus.textContent = err.message || "Gagal memuat aset permainan.";
  }

  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

boot();
