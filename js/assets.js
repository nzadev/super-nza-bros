const ASSET_MANIFEST = {
  player: "assets/sprites/player.png",
  enemies: "assets/sprites/enemies.png",
  boss: "assets/sprites/boss.png",
  tiles: "assets/sprites/tiles.png",
  items: "assets/sprites/items.png",
  bg_overworld: "assets/backgrounds/bg_overworld.png",
  bg_underground: "assets/backgrounds/bg_underground.png",
  bg_sky: "assets/backgrounds/bg_sky.png",
  bg_castle: "assets/backgrounds/bg_castle.png",
  hero_banner: "assets/ui/hero_banner.png",
  game_icon: "assets/ui/game_icon.png"
};

export const TILE_COORDS = {
  G: [0, 0],
  D: [1, 0],
  B: [2, 0],
  H: [3, 0],
  Q1: [4, 0],
  Q2: [5, 0],
  Q3: [6, 0],
  E: [7, 0],
  PTL: [0, 1],
  PTR: [1, 1],
  PBL: [2, 1],
  PBR: [3, 1],
  CL: [4, 1],
  PL: [5, 1],
  SP1: [6, 1],
  SP2: [7, 1],
  UG: [0, 2],
  UD: [1, 2],
  UB: [2, 2],
  SK: [3, 2],
  CS: [4, 2],
  BR: [5, 2],
  LV1: [6, 2],
  LV2: [7, 2],
  CB: [0, 3],
  CW: [1, 3],
  CDT: [2, 3],
  CDB: [3, 3],
  FP: [4, 3],
  FT: [5, 3],
  AX: [6, 3],
  DN: [7, 3]
};

export const ITEM_COORDS = {
  coin0: [0, 0],
  coin1: [1, 0],
  coin2: [2, 0],
  coin3: [3, 0],
  mushroom: [0, 1],
  oneup: [1, 1],
  flower: [2, 1],
  star: [3, 1],
  fire0: [0, 2],
  fire1: [1, 2],
  bossfire0: [2, 2],
  bossfire1: [3, 2],
  cp0: [0, 3],
  cp1: [1, 3],
  flag: [2, 3],
  heart: [3, 3]
};

export class AssetStore {
  constructor() {
    this.images = {};
    this.loaded = false;
  }

  async loadAll(onProgress) {
    const entries = Object.entries(ASSET_MANIFEST);
    let done = 0;
    await Promise.all(
      entries.map(
        ([key, src]) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              this.images[key] = img;
              done++;
              if (onProgress) onProgress(done / entries.length);
              resolve();
            };
            img.onerror = () => reject(new Error(`Gagal memuat aset: ${src}`));
            img.src = src;
          })
      )
    );
    this.loaded = true;
  }

  drawTile(ctx, code, dx, dy, size = 32) {
    const coord = TILE_COORDS[code];
    if (!coord || !this.images.tiles) return;
    ctx.drawImage(
      this.images.tiles,
      coord[0] * 32,
      coord[1] * 32,
      32,
      32,
      Math.round(dx),
      Math.round(dy),
      size,
      size
    );
  }

  drawItem(ctx, key, dx, dy, size = 32, flipX = false) {
    const coord = ITEM_COORDS[key];
    if (!coord || !this.images.items) return;
    ctx.save();
    if (flipX) {
      ctx.translate(Math.round(dx + size), Math.round(dy));
      ctx.scale(-1, 1);
      ctx.drawImage(this.images.items, coord[0] * 32, coord[1] * 32, 32, 32, 0, 0, size, size);
    } else {
      ctx.drawImage(
        this.images.items,
        coord[0] * 32,
        coord[1] * 32,
        32,
        32,
        Math.round(dx),
        Math.round(dy),
        size,
        size
      );
    }
    ctx.restore();
  }

  drawPlayer(ctx, powerRow, frameCol, dx, dy, facing = 1, flipY = false) {
    const img = this.images.player;
    if (!img) return;
    ctx.save();
    ctx.translate(Math.round(dx + 16), Math.round(dy + 24));
    ctx.scale(facing < 0 ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(img, frameCol * 32, powerRow * 48, 32, 48, -16, -24, 32, 48);
    ctx.restore();
  }

  drawEnemy(ctx, row, col, dx, dy, facing = -1, flipY = false) {
    const img = this.images.enemies;
    if (!img) return;
    ctx.save();
    ctx.translate(Math.round(dx + 16), Math.round(dy + 16));
    ctx.scale(facing < 0 ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(img, col * 32, row * 32, 32, 32, -16, -16, 32, 32);
    ctx.restore();
  }

  drawBoss(ctx, frameCol, dx, dy, facing = -1, flipY = false) {
    const img = this.images.boss;
    if (!img) return;
    ctx.save();
    ctx.translate(Math.round(dx + 32), Math.round(dy + 32));
    ctx.scale(facing > 0 ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(img, frameCol * 64, 0, 64, 64, -32, -32, 64, 64);
    ctx.restore();
  }
}
