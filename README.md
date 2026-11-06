# Super Nza Bros

Game platformer arcade 16-bit karya mandiri **Nza (`nzadev`)** yang terinspirasi dari *Super Mario Bros*, dilengkapi aset sprite pixel-art transparan, latar parallax berlapis, synthesizer audio chiptune 8-bit real-time, kontrol PC/Gamepad/Layar Sentuh HP, serta 4 World lengkap hingga pertarungan Boss akhir.

## Akses Rilis & Akun Uji Coba
- **Live Webview (HTTPS Publik):** https://nzadev.github.io/super-nza-bros/
- **Akun Demo:** `Tanpa login - langsung pakai`
- **Target Perangkat:** Browser Desktop (Linux/Windows/macOS), Smartphone Android/iOS (dilengkapi Virtual D-Pad & Action Buttons otomatis), dan USB/Bluetooth Gamepad.

## Fitur Utama
- **4 World Berbeda & Berjenjang:**
  - `World 1-1: Emerald Hills` — Padang rumput klasik, pipa hijau, tanaman Chompvine, dan rahasia 1-UP.
  - `World 1-2: Crystal Cavern` — Gua kristal bawah tanah, kumbang baja tahan api, lift bergerak, dan rute atap rahasia.
  - `World 1-3: Sky Kingdom` — Jembatan awan atletik, musuh terbang Skywing, trampolin pegas, dan blok donat jatuh.
  - `World 1-4: Magma Keep (Boss)` — Kastil lava dengan rantai api berputar, batu penghancur Crusher, serta duel melawan **King Koopatron** (bisa dikalahkan dengan bola api/injakan atau menyentuh Kapak Emas peruntuh jembatan!).
- **Sistem Power-Up Klasik:** Jamur Super (tumbuh besar & penghancur bata), Bunga Api (tembakan bola api pantul), Jamur Hijau 1-UP, dan Bintang Super (kebal sementara).
- **Aset Lengkap (`assets/`):** Sprite sheet karakter 3 wujud (`player.png`), musuh (`enemies.png`), Boss (`boss.png`), tileset interaktif (`tiles.png`), item (`items.png`), 4 background parallax (`assets/backgrounds/`), serta ilustrasi banner & ikon (`assets/ui/`).

## Kontrol Permainan
| Aksi | Keyboard | Layar Sentuh / Gamepad |
| :--- | :--- | :--- |
| Gerak Kiri / Kanan | `A / D` atau `◀ / ▶` | D-Pad `◀ / ▶` |
| Lompat (Tahan = Lebih Tinggi) | `Space`, `W`, `Z`, atau `▲` | Tombol `A` |
| Lari Cepat & Tembak Bola Api | `Shift`, `X`, atau `J` | Tombol `B` |
| Jeda / Ulang Stage / Mute | `P` / `R` / `M` | Tombol HUD Atas |

## Struktur Direktori
```text
super-nza-bros/
├── index.html
├── style.css
├── manifest.json
├── sw.js
├── assets/
│   ├── backgrounds/
│   ├── sprites/
│   └── ui/
├── js/
│   ├── main.js
│   ├── engine.js
│   ├── levels.js
│   ├── assets.js
│   └── audio.js
└── tools/
    └── generate_assets.py
```
