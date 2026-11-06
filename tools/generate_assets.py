#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SPRITES_DIR = ROOT / "assets" / "sprites"
BG_DIR = ROOT / "assets" / "backgrounds"
UI_DIR = ROOT / "assets" / "ui"

for d in (SPRITES_DIR, BG_DIR, UI_DIR):
    d.mkdir(parents=True, exist_ok=True)


def draw_grid(img: Image.Image, ox: int, oy: int, rows: list[str], palette: dict[str, tuple[int, int, int, int]]) -> None:
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != "." and ch in palette:
                px[ox + x, oy + y] = palette[ch]


def upscale(img: Image.Image, factor: int = 2) -> Image.Image:
    return img.resize((img.width * factor, img.height * factor), Image.Resampling.NEAREST)


def align_bottom(rows: list[str], width: int, height: int) -> list[str]:
    cleaned = [(r + "." * width)[:width] for r in rows if any(ch != "." for ch in r)]
    pad_top = max(0, height - len(cleaned))
    return ["." * width for _ in range(pad_top)] + cleaned[:height]


def build_player_sheet() -> None:
    sheet = Image.new("RGBA", (16 * 8, 24 * 3), (0, 0, 0, 0))

    palettes = [
        {
            "K": (24, 20, 37, 255),
            "H": (228, 59, 68, 255),
            "h": (162, 38, 51, 255),
            "W": (255, 255, 255, 255),
            "S": (254, 211, 168, 255),
            "s": (224, 159, 112, 255),
            "B": (44, 110, 229, 255),
            "b": (27, 68, 156, 255),
            "Y": (255, 221, 51, 255),
            "M": (92, 53, 36, 255),
            "m": (62, 34, 23, 255),
        },
        {
            "K": (24, 20, 37, 255),
            "H": (235, 55, 62, 255),
            "h": (168, 32, 44, 255),
            "W": (255, 255, 255, 255),
            "S": (254, 214, 172, 255),
            "s": (224, 161, 114, 255),
            "B": (46, 118, 240, 255),
            "b": (26, 72, 164, 255),
            "Y": (255, 224, 66, 255),
            "M": (104, 58, 36, 255),
            "m": (66, 35, 22, 255),
        },
        {
            "K": (24, 20, 37, 255),
            "H": (250, 248, 245, 255),
            "h": (212, 205, 197, 255),
            "W": (255, 145, 38, 255),
            "S": (254, 214, 172, 255),
            "s": (224, 161, 114, 255),
            "B": (224, 48, 56, 255),
            "b": (158, 26, 36, 255),
            "Y": (255, 232, 75, 255),
            "M": (122, 52, 28, 255),
            "m": (78, 32, 18, 255),
        },
    ]

    small_frames = [
        [
            "........",
            "........",
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KMMSSSKSSK....",
            "..KMMSMSSSMMK...",
            "..KMMSSSSSSK....",
            "...KKSSSSKK.....",
            "...KHBHHBHK.....",
            "..KHHBBBBHHK....",
            "..KWWBYBBWWK....",
            "..KWWBBBBWWK....",
            "...KKBBBBKK.....",
            "...KMM..MMK.....",
            "..KmmmK.KmmmK...",
        ],
        [
            "........",
            "........",
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KMMSSSKSSK....",
            "..KMMSMSSSMMK...",
            "...KKSSSSSSK....",
            "..KHHBHHBHK.....",
            ".KWWBBBBHHK.....",
            ".KWWBYBBBBK.....",
            "..KKBBBBBBK.....",
            "..KMMK..KMMK....",
            ".KmmmK...KmmmK..",
            "................",
            "................",
        ],
        [
            "........",
            "........",
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KMMSSSKSSK....",
            "..KMMSMSSSMMK...",
            "...KKSSSSSSK....",
            "...KHBHHBHK.....",
            "...KHHBBBBK.....",
            "...KWWBYBBK.....",
            "...KWWBBBBK.....",
            "....KBBBBK......",
            "....KMMMMK......",
            "...KmmmmmmK.....",
            "................",
        ],
        [
            "........",
            "........",
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KMMSSSKSSK....",
            "..KMMSMSSSMMK...",
            "...KKSSSSSSK....",
            "...KHBHHBHHK....",
            "...KHHBBBBWWK...",
            "...KBBBBBYWWK...",
            "...KBBBBBBKK....",
            "..KMMK..KMMK....",
            "..KmmmK..KmmmK..",
            "................",
            "................",
        ],
        [
            "........",
            "........",
            "....KKKKKK......",
            "...KWHHHHK......",
            "..KKHHHHHHHHK...",
            "...KSSKSSMMK....",
            "..KMMSSSMMMK....",
            "...KSSSSSSKK....",
            "..KWWBBBBHK.....",
            "..KWWBYBBHHK....",
            "...KKBBBBHHK....",
            "....KBBBBBBK....",
            "...KMMK.KMMK....",
            "..KmmmK..KmmmK..",
            "................",
            "................",
        ],
        [
            "........",
            "...........KKK..",
            "....KKKKKKKWWK..",
            "...KHHHHWHKWWK..",
            "..KHHHHHHHHHHK..",
            "..KMMSSSKSSHHK..",
            "..KMMSMSSSMMK...",
            "...KKSSSSSSK....",
            "..KHHBBBBHHK....",
            ".KWWBYBBBBK.....",
            ".KWWBBBBBBK.....",
            "..KKBBKBBBK.....",
            "..KMMK..KMMK....",
            ".KmmmK...KmmmK..",
            "................",
            "................",
        ],
        [
            "........",
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KMMSSSKSSK....",
            "..KMMSMSSSMMK...",
            "...KKSSSSSSK....",
            "...KHHBBBBWWK...",
            "...KHHBYBBWWK...",
            "...KBBBBBBKK....",
            "...KBBBBBBK.....",
            "....KMMMMK......",
            "....KmmmmK......",
            "................",
            "................",
            "................",
        ],
        [
            "........",
            "........",
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KMMSSSKSSK....",
            "..KMMSMSSSMMK...",
            "...KKSSSSSSK....",
            "...KHHBBBBHHK...",
            "...KBBBYBBWWWK..",
            "...KBBBBBBWWWK..",
            "...KBBBBBBKK....",
            "...KMM..MMK.....",
            "..KmmmK.KmmmK...",
            "................",
            "................",
        ],
    ]

    padded_small = []
    for frame in small_frames:
        rows = ["." * 16 for _ in range(8)]
        for r in frame:
            rows.append((r + "." * 16)[:16])
        padded_small.append(rows)

    tall_base = [
        [
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KhhhhhhhhhK...",
            "..KMMSSSKSSK....",
            ".KMMMSMSSSMMK...",
            ".KMMMSSSSSSSK...",
            "..KKSSSSSSSSK...",
            "....KKKKKKKK....",
            "...KHHBHHBHHK...",
            "..KHHHBBBBHHHK..",
            "..KHHHBBBBHHHK..",
            ".KWWWHBYBBYWWWK.",
            ".KWWWKBBBBKWWWK.",
            ".KWWWKBBBBKWWWK.",
            "..KKKKbbbbKKKK..",
            "...KBBBBBBBBK...",
            "...KBBBBBBBBK...",
            "...KBBBKKBBBK...",
            "...KbbbK.KbbbK..",
            "...KMMMK.KMMMK..",
            "..KmmmmK.KmmmmK.",
            "..KKKKKK.KKKKKK.",
            "................",
        ],
        [
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KhhhhhhhhhK...",
            "..KMMSSSKSSK....",
            ".KMMMSMSSSMMK...",
            ".KMMMSSSSSSSK...",
            "..KKSSSSSSSSK...",
            "....KKKKKKKK....",
            "..KHHHBHHBHK....",
            ".KWWWWBBBBHHK...",
            ".KWWWWBYBBHHK...",
            "..KKKBBBBBBK....",
            "....KBBBBBBK....",
            "...KBBBBBBBBK...",
            "...KbbbbBBBBK...",
            "..KBBBBK.KBBBK..",
            "..KbbbK...KbbbK.",
            ".KMMMK.....KMMMK",
            ".KmmmmK....Kmmmm",
            ".KKKKKK....KKKKK",
            "................",
            "................",
            "................",
        ],
        [
            "................",
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KhhhhhhhhhK...",
            "..KMMSSSKSSK....",
            ".KMMMSMSSSMMK...",
            ".KMMMSSSSSSSK...",
            "..KKSSSSSSSSK...",
            "....KKKKKKKK....",
            "...KHHBHHBHHK...",
            "...KHHBBBBHHK...",
            "...KWWBYBBWWK...",
            "...KWWBBBBWWK...",
            "...KBBBBBBBBK...",
            "...KbbbbbbbbK...",
            "....KBBBBBBK....",
            "....KbbbbbbK....",
            "....KMMMMMMK....",
            "...KmmmmmmmmK...",
            "...KKKKKKKKKK...",
            "................",
            "................",
            "................",
        ],
        [
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KhhhhhhhhhK...",
            "..KMMSSSKSSK....",
            ".KMMMSMSSSMMK...",
            ".KMMMSSSSSSSK...",
            "..KKSSSSSSSSK...",
            "....KKKKKKKK....",
            "...KHBHHBHHHK...",
            "...KHHBBBBWWWWK.",
            "...KHHBYBBWWWWK.",
            "....KBBBBBBKKK..",
            "....KBBBBBBK....",
            "...KBBBBBBBBK...",
            "...KBBBBbbbbK...",
            "..KBBBK.KBBBBK..",
            ".KbbbK...KbbbK..",
            ".KMMMK....KMMMK.",
            "KmmmmK....KmmmmK",
            "KKKKKK....KKKKKK",
            "................",
            "................",
            "................",
        ],
        [
            "....KKKKKK......",
            "...KWHHHHK......",
            "..KKHHHHHHHHK...",
            "...KhhhhhhhhK...",
            "...KSSKSSMMK....",
            "..KMMSSSMMMMK...",
            "..KSSSSSSSMMK...",
            "..KSSSSSSSSKK...",
            "....KKKKKKKK....",
            "..KWWWBBBBHHK...",
            "..KWWWBYBBHHHK..",
            "...KKKBBBBHHHK..",
            "....KBBBBBBBBK..",
            "....KbbbbbbbbK..",
            "...KBBBBBBBBK...",
            "...KBBBBKBBBK...",
            "..KbbbK..KbbbK..",
            "..KMMMK..KMMMK..",
            ".KmmmmK...KmmmmK",
            ".KKKKKK...KKKKKK",
            "................",
            "................",
            "................",
            "................",
        ],
        [
            "...........KKKK.",
            "....KKKKKKKWWWK.",
            "...KHHHHWHKWWWK.",
            "..KHHHHHHHHHHHK.",
            "..KhhhhhhhhhHHK.",
            "..KMMSSSKSSHHHK.",
            ".KMMMSMSSSMMHHK.",
            ".KMMMSSSSSSSKK..",
            "..KKSSSSSSSSK...",
            "...KHHBHHBHK....",
            "..KHHHBBBBK.....",
            ".KWWWKBYBBK.....",
            ".KWWWKBBBBBK....",
            "..KKKBBBBBBBK...",
            "...KbbbbBBBBK...",
            "..KBBBBK.KBBBK..",
            "..KbbbK...KbbbK.",
            ".KMMMK.....KMMMK",
            ".KmmmmK....Kmmmm",
            ".KKKKKK....KKKKK",
            "................",
            "................",
            "................",
            "................",
        ],
        [
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KhhhhhhhhhK...",
            "..KMMSSSKSSK....",
            ".KMMMSMSSSMMK...",
            ".KMMMSSSSSSSK...",
            "..KKSSSSSSSSK...",
            "....KKKKKKKK....",
            "...KHHBBBBWWWK..",
            "...KHHBYBBWWWK..",
            "...KHHBBBBKKK...",
            "...KBBBBBBBBK...",
            "...KbbbbbbbbK...",
            "...KBBBBBBBBK...",
            "....KBBBBBBK....",
            "....KMMMMMMK....",
            "....KmmmmmmK....",
            "....KKKKKKKK....",
            "................",
            "................",
            "................",
            "................",
            "................",
        ],
        [
            "....KKKKKK......",
            "...KHHHHWHK.....",
            "..KHHHHHHHHKK...",
            "..KhhhhhhhhhK...",
            "..KMMSSSKSSK....",
            ".KMMMSMSSSMMK...",
            ".KMMMSSSSSSSK...",
            "..KKSSSSSSSSK...",
            "....KKKKKKKK....",
            "...KHHBBBBHHHK..",
            "..KHHBBBBWWWWWK.",
            "..KBBBYBBWWWWWK.",
            "..KBBBBBBKKKKK..",
            "...KBBBBBBBBK...",
            "...KbbbbbbbbK...",
            "...KBBBKKBBBK...",
            "...KbbbK.KbbbK..",
            "...KMMMK.KMMMK..",
            "..KmmmmK.KmmmmK.",
            "..KKKKKK.KKKKKK.",
            "................",
            "................",
            "................",
            "................",
        ],
    ]

    for col in range(8):
        draw_grid(sheet, col * 16, 0, align_bottom(small_frames[col], 16, 24), palettes[0])
        draw_grid(sheet, col * 16, 24, align_bottom(tall_base[col], 16, 24), palettes[1])
        draw_grid(sheet, col * 16, 48, align_bottom(tall_base[col], 16, 24), palettes[2])

    upscale(sheet, 2).save(SPRITES_DIR / "player.png")


def build_enemies_sheet() -> None:
    sheet = Image.new("RGBA", (16 * 4, 16 * 4), (0, 0, 0, 0))
    pal = {
        "K": (24, 20, 37, 255),
        "M": (184, 92, 46, 255),
        "m": (132, 58, 26, 255),
        "S": (250, 214, 165, 255),
        "W": (255, 255, 255, 255),
        "R": (228, 52, 62, 255),
        "r": (158, 28, 38, 255),
        "G": (52, 184, 78, 255),
        "g": (28, 122, 48, 255),
        "Y": (252, 216, 72, 255),
        "y": (212, 162, 36, 255),
        "C": (66, 152, 235, 255),
        "c": (36, 92, 168, 255),
        "X": (142, 150, 168, 255),
        "x": (90, 96, 114, 255),
    }

    shroom1 = [
        ".....KKKKKK.....",
        "...KKMMMMMMKK...",
        "..KMMMMMMMMMMK..",
        ".KMMMWKMMKWMMMK.",
        ".KMMMWKMMKWMMMK.",
        "KMMMMKKKKKKMMMMK",
        "KmmmmWKKKKWmmmmK",
        "KmmmmmmmmmmmmmmK",
        ".KKKKSSSSSSKKKK.",
        "....KSSSSSSK....",
        "...KSSSSSSSSK...",
        "...KSSSSSSSSK...",
        "..KKKKK..KKKKK..",
        ".KKKKKK..KKKKKK.",
        ".KKKKK....KKKKK.",
        "................",
    ]
    shroom2 = shroom1[:12] + [
        "...KKKK..KKKK...",
        "..KKKKK..KKKKK..",
        "....KKK..KKK....",
        "................",
    ]
    shroom_flat = [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "...KKKKKKKKKK...",
        ".KKMMMMMMMMMMKK.",
        "KMMMWKMMMMKWMMMK",
        "KmmmmmmmmmmmmmmK",
        ".KKKKSSSSSSKKKK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................",
    ]

    koopa1 = [
        "........KKKK....",
        ".......KYYYYK...",
        "......KYWKYWYK..",
        "......KYYYYYYK..",
        "..KKKKKYYYYKK...",
        ".KGGGGGKYYK.....",
        "KGGGGGGGKKYYK...",
        "KGGgGGgGGKYYK...",
        "KGGGGGGGGKYYK...",
        "KggggggggKKK....",
        ".KWWWWWWWWK.....",
        "..KYYK..KYYK....",
        ".KYYYK..KYYYK...",
        ".KKKK...KKKKK...",
        "................",
        "................",
    ]
    koopa2 = koopa1[:11] + [
        "...KYYKKYYK.....",
        "..KYYYK.KYYK....",
        "..KKKK..KKKK....",
        "................",
        "................",
    ]
    shell1 = [
        "................",
        "................",
        "................",
        "....KKKKKKKK....",
        "..KKGGGGGGGGKK..",
        ".KGGGGgGGgGGGGK.",
        "KGGGGGGGGGGGGGGK",
        "KGGgGGGGGGGGgGGK",
        "KggggggggggggggK",
        "KWWWWWWWWWWWWWWK",
        ".KYYYYYYYYYYYYK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................",
        "................",
        "................",
    ]
    shell2 = [
        "................",
        "................",
        "................",
        "....KKKKKKKK....",
        "..KKGGGGGGGGKK..",
        ".KGGgGGGGGGgGGK.",
        "KGGGGGGggGGGGGGK",
        "KGGGGGGGGGGGGGGK",
        "KggggggggggggggK",
        "KWWWWWWWWWWWWWWK",
        ".KYYYYYYYYYYYYK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................",
        "................",
        "................",
    ]

    chomp1 = [
        "..KKKK....KKKK..",
        ".KRRRRK..KRRRRK.",
        "KRRWRRRKKRRRWRRK",
        "KRRRRRRWWWRRRRRK",
        "KWRRRRRKKKRRRRWK",
        "KRRRRRKKKKKRRRRK",
        ".KrrrrKWWWKrrrrK",
        "..KKKKKKKKKKKK..",
        ".....KGGGGK.....",
        "....KGGGGGGK....",
        "...KGgGGGGgGK...",
        ".....KGGGGK.....",
        ".....KggggK.....",
        ".....KGGGGK.....",
        ".....KggggK.....",
        ".....KKKKKK.....",
    ]
    chomp2 = [
        "....KKKKKKKK....",
        "..KKRRRRRRRRKK..",
        ".KRRRWRRRRWRRRK.",
        "KRRRRRRRRRRRRRRK",
        "KWRRRRRRRRRRRRWK",
        "KRRRRWWWWWWWRRRK",
        ".KrrrKKKKKKKrrrK",
        "..KKKKKKKKKKKK..",
        ".....KGGGGK.....",
        "....KGGGGGGK....",
        "...KGgGGGGgGK...",
        ".....KGGGGK.....",
        ".....KggggK.....",
        ".....KGGGGK.....",
        ".....KggggK.....",
        ".....KKKKKK.....",
    ]
    flyer1 = [
        ".KKK........KKK.",
        "KWWWK..KK..KWWWK",
        "KWWWWKKKKKKWWWWK",
        ".KWWWKRRRRKWWWK.",
        "..KKKRRRRRRKKK..",
        "....KRWKKWRK....",
        "....KRRRRRRK....",
        "....KrrrrrrK....",
        ".....KYYYYK.....",
        "....KYYKKYYK....",
        "....KKK..KKK....",
        "................",
        "................",
        "................",
        "................",
        "................",
    ]
    flyer2 = [
        "......KKKK......",
        "....KKRRRRKK....",
        "...KRRRRRRRRK...",
        "...KRWKKKKWRK...",
        "..KKRRRRRRRRKK..",
        ".KWWKrrrrrrKWWK.",
        "KWWWWKYYYYKWWWWK",
        ".KKKKYYKKYYKKKK.",
        "....KKK..KKK....",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
    ]

    beetle1 = [
        "................",
        "................",
        "....KKKKKKKK....",
        "..KKCCCCCCCCKK..",
        ".KCCCCcCCcCCCCK.",
        "KCCCCCCCCCCCCCCK",
        "KCCcCCCCCCCCWKWK",
        "KcccccccccccWKWK",
        "KSSSSSSSSSSSSSSK",
        ".KKK..KKKK..KKK.",
        ".KKK..KKKK..KKK.",
        "................",
        "................",
        "................",
        "................",
        "................",
    ]
    beetle2 = beetle1[:9] + [
        "..KKK..KKK..KKK.",
        "..KKK..KKK..KKK.",
        "................",
        "................",
        "................",
        "................",
        "................",
    ]
    beetle_shell = [
        "................",
        "................",
        "................",
        "....KKKKKKKK....",
        "..KKCCCCCCCCKK..",
        ".KCCCCcCCcCCCCK.",
        "KCCCCCCCCCCCCCCK",
        "KccccccccccccccK",
        ".KWWWWWWWWWWWWK.",
        "..KKKKKKKKKKKK..",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
    ]
    crusher = [
        "..KK..KKKK..KK..",
        ".KWWKKXXXXKKWWK.",
        "KXXXXXXXXXXXXXXK",
        "KXxxXXXXXXXXxxXK",
        "KXXKKKXXXXKKKXXK",
        "KXXKWRKXXKRWKXXK",
        "KXXKKKKXXKKKKXXK",
        "KXXXXXXXXXXXXXXK",
        "KXXXXKKKKKKXXXXK",
        "KXXXKWWWWWWKXXXK",
        "KXxxKKKKKKKKxxXK",
        "KxxxxxxxxxxxxxxK",
        ".KWWKKxxxxKKWWK.",
        "..KK..KKKK..KK..",
        "................",
        "................",
    ]

    grid_frames = [
        [shroom1, shroom2, shroom_flat, shroom1],
        [koopa1, koopa2, shell1, shell2],
        [chomp1, chomp2, flyer1, flyer2],
        [beetle1, beetle2, beetle_shell, crusher],
    ]
    for r in range(4):
        for c in range(4):
            frame_rows = grid_frames[r][c]
            if r != 2 or c < 2:
                frame_rows = align_bottom(frame_rows, 16, 16)
            draw_grid(sheet, c * 16, r * 16, frame_rows, pal)

    upscale(sheet, 2).save(SPRITES_DIR / "enemies.png")


def build_boss_sheet() -> None:
    sheet = Image.new("RGBA", (32 * 4, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sheet)

    for frame in range(4):
        ox = frame * 32
        bob = 1 if frame == 1 else (-2 if frame == 3 else 0)
        mouth_open = frame in (2, 3)

        # Spiked green shell on back
        draw.ellipse([ox + 12, 8 + bob, ox + 29, 26 + bob], fill=(32, 136, 56, 255), outline=(20, 18, 30, 255))
        draw.ellipse([ox + 14, 10 + bob, ox + 27, 24 + bob], fill=(56, 178, 78, 255))
        # White spikes on shell
        for sx, sy in [(25, 9), (28, 14), (27, 20)]:
            draw.polygon([(ox + sx, sy + bob), (ox + sx + 3, sy - 2 + bob), (ox + sx + 1, sy + 3 + bob)], fill=(255, 255, 255, 255), outline=(20, 18, 30, 255))

        # Scaled golden belly & chest
        draw.ellipse([ox + 7, 11 + bob, ox + 21, 27 + bob], fill=(244, 192, 62, 255), outline=(20, 18, 30, 255))
        for ry in range(14, 25, 3):
            draw.line([ox + 9, ry + bob, ox + 17, ry + bob], fill=(204, 140, 34, 255))

        # Head + crimson mane + horns
        draw.rectangle([ox + 4, 4 + bob, ox + 17, 15 + bob], fill=(52, 168, 72, 255), outline=(20, 18, 30, 255))
        draw.polygon([(ox + 13, 4 + bob), (ox + 17, 0 + bob), (ox + 18, 5 + bob)], fill=(255, 245, 214, 255), outline=(20, 18, 30, 255))
        draw.rectangle([ox + 15, 3 + bob, ox + 20, 8 + bob], fill=(228, 54, 54, 255))

        # Glowing red eyes
        draw.rectangle([ox + 6, 6 + bob, ox + 9, 9 + bob], fill=(255, 230, 64, 255))
        draw.point((ox + 7, 7 + bob), fill=(220, 30, 30, 255))

        # Snout & fire glow if roaring
        if mouth_open:
            draw.rectangle([ox + 1, 9 + bob, ox + 9, 16 + bob], fill=(220, 58, 42, 255), outline=(20, 18, 30, 255))
            draw.rectangle([ox + 2, 11 + bob, ox + 7, 14 + bob], fill=(255, 196, 46, 255))
        else:
            draw.rectangle([ox + 2, 9 + bob, ox + 9, 14 + bob], fill=(238, 186, 68, 255), outline=(20, 18, 30, 255))
            draw.point((ox + 4, 13 + bob), fill=(255, 255, 255, 255))
            draw.point((ox + 7, 13 + bob), fill=(255, 255, 255, 255))

        # Muscular arms & claws
        arm_y = 14 + bob + (-2 if frame == 2 else 0)
        draw.rectangle([ox + 3, arm_y, ox + 10, arm_y + 5], fill=(238, 186, 68, 255), outline=(20, 18, 30, 255))
        draw.rectangle([ox + 5, arm_y, ox + 7, arm_y + 5], fill=(40, 40, 52, 255))

        # Heavy legs
        step_l = -1 if frame == 1 else 0
        step_r = -1 if frame == 2 else 0
        draw.rectangle([ox + 7, 25 + bob + step_l, ox + 13, 31], fill=(52, 168, 72, 255), outline=(20, 18, 30, 255))
        draw.rectangle([ox + 16, 25 + bob + step_r, ox + 22, 31], fill=(42, 142, 58, 255), outline=(20, 18, 30, 255))

    upscale(sheet, 2).save(SPRITES_DIR / "boss.png")


def build_tiles_sheet() -> None:
    sheet = Image.new("RGBA", (16 * 8, 16 * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(sheet)

    def cell_box(col: int, row: int):
        return col * 16, row * 16

    # (0,0) Overworld Grass-Top Ground
    ox, oy = cell_box(0, 0)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(184, 102, 48, 255))
    for rx, ry in [(2, 7), (9, 9), (5, 13), (12, 12)]:
        d.rectangle([ox + rx, oy + ry, ox + rx + 2, oy + ry + 2], fill=(138, 70, 28, 255))
    d.rectangle([ox, oy, ox + 15, oy + 4], fill=(58, 198, 74, 255))
    d.line([ox, oy, ox + 15, oy], fill=(134, 242, 118, 255))
    for gx in range(0, 16, 4):
        d.rectangle([ox + gx, oy + 4, ox + gx + 1, oy + 6], fill=(38, 148, 54, 255))

    # (1,0) Dirt Sub-Ground
    ox, oy = cell_box(1, 0)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(184, 102, 48, 255))
    for rx, ry in [(1, 2), (8, 4), (4, 9), (11, 11), (2, 13)]:
        d.rectangle([ox + rx, oy + ry, ox + rx + 3, oy + ry + 2], fill=(138, 70, 28, 255))
        d.point((ox + rx, oy + ry), fill=(218, 138, 78, 255))

    # (2,0) Classic Smashable Brick
    ox, oy = cell_box(2, 0)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(196, 84, 42, 255))
    for y in (0, 4, 8, 12):
        d.line([ox, oy + y, ox + 15, oy + y], fill=(42, 24, 20, 255))
        d.line([ox, oy + y + 1, ox + 15, oy + y + 1], fill=(234, 128, 78, 255))
    for idx, y in enumerate((0, 4, 8, 12)):
        off = 0 if idx % 2 == 0 else 4
        for x in range(off, 16, 8):
            d.line([ox + x, oy + y, ox + x, oy + y + 3], fill=(42, 24, 20, 255))

    # (3,0) Hard Beveled Block
    ox, oy = cell_box(3, 0)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(176, 98, 52, 255), outline=(28, 20, 24, 255))
    d.line([ox + 1, oy + 1, ox + 14, oy + 1], fill=(238, 166, 112, 255))
    d.line([ox + 1, oy + 1, ox + 1, oy + 14], fill=(238, 166, 112, 255))
    d.line([ox + 2, oy + 14, ox + 14, oy + 14], fill=(112, 54, 26, 255))
    d.line([ox + 14, oy + 2, ox + 14, oy + 14], fill=(112, 54, 26, 255))
    for rx, ry in [(3, 3), (12, 3), (3, 12), (12, 12)]:
        d.point((ox + rx, oy + ry), fill=(28, 20, 24, 255))

    # (4..6, 0) Question Block Frames 1..3
    q_colors = [
        ((252, 198, 42, 255), (255, 238, 120, 255)),
        ((242, 168, 34, 255), (252, 214, 88, 255)),
        ((218, 134, 26, 255), (242, 188, 66, 255)),
    ]
    q_glyph = [
        "..XXXX..",
        ".XX..XX.",
        ".....XX.",
        "...XXX..",
        "...XX...",
        "........",
        "...XX...",
    ]
    for i, (base_c, hi_c) in enumerate(q_colors):
        ox, oy = cell_box(4 + i, 0)
        d.rectangle([ox, oy, ox + 15, oy + 15], fill=base_c, outline=(32, 22, 18, 255))
        d.line([ox + 1, oy + 1, ox + 14, oy + 1], fill=hi_c)
        d.line([ox + 1, oy + 1, ox + 1, oy + 14], fill=hi_c)
        for rx, ry in [(2, 2), (13, 2), (2, 13), (13, 13)]:
            d.point((ox + rx, oy + ry), fill=(92, 52, 18, 255))
        for gy, row in enumerate(q_glyph):
            for gx, ch in enumerate(row):
                if ch == "X":
                    d.point((ox + 5 + gx, oy + 5 + gy), fill=(112, 48, 16, 255))
                    d.point((ox + 4 + gx, oy + 4 + gy), fill=(255, 250, 228, 255))

    # (7,0) Used Empty Block
    ox, oy = cell_box(7, 0)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(128, 96, 74, 255), outline=(28, 20, 24, 255))
    d.rectangle([ox + 2, oy + 2, ox + 13, oy + 13], outline=(88, 64, 48, 255))
    for rx, ry in [(2, 2), (13, 2), (2, 13), (13, 13)]:
        d.point((ox + rx, oy + ry), fill=(28, 20, 24, 255))

    # (0..3, 1) Glossy Green Pipe Tiles
    # Pipe Top Left & Right
    ox, oy = cell_box(0, 1)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(42, 184, 62, 255))
    d.rectangle([ox + 3, oy + 1, ox + 6, oy + 14], fill=(138, 244, 112, 255))
    d.rectangle([ox + 12, oy + 1, ox + 15, oy + 14], fill=(24, 128, 42, 255))
    d.line([ox, oy, ox + 15, oy], fill=(20, 24, 28, 255))
    d.line([ox, oy + 15, ox + 15, oy + 15], fill=(20, 24, 28, 255))
    d.line([ox, oy, ox, oy + 15], fill=(20, 24, 28, 255))

    ox, oy = cell_box(1, 1)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(34, 158, 52, 255))
    d.rectangle([ox + 1, oy + 1, ox + 3, oy + 14], fill=(82, 214, 88, 255))
    d.rectangle([ox + 9, oy + 1, ox + 14, oy + 14], fill=(18, 102, 34, 255))
    d.line([ox, oy, ox + 15, oy], fill=(20, 24, 28, 255))
    d.line([ox, oy + 15, ox + 15, oy + 15], fill=(20, 24, 28, 255))
    d.line([ox + 15, oy, ox + 15, oy + 15], fill=(20, 24, 28, 255))

    # Pipe Body Left & Right
    ox, oy = cell_box(2, 1)
    d.rectangle([ox + 2, oy, ox + 15, oy + 15], fill=(42, 184, 62, 255))
    d.rectangle([ox + 5, oy, ox + 8, oy + 15], fill=(138, 244, 112, 255))
    d.line([ox + 2, oy, ox + 2, oy + 15], fill=(20, 24, 28, 255))

    ox, oy = cell_box(3, 1)
    d.rectangle([ox, oy, ox + 13, oy + 15], fill=(34, 158, 52, 255))
    d.rectangle([ox + 8, oy, ox + 12, oy + 15], fill=(18, 102, 34, 255))
    d.line([ox + 13, oy, ox + 13, oy + 15], fill=(20, 24, 28, 255))

    # (4,1) Cloud Platform
    ox, oy = cell_box(4, 1)
    d.rounded_rectangle([ox, oy + 1, ox + 15, oy + 14], radius=5, fill=(244, 250, 255, 255), outline=(66, 108, 168, 255))
    d.line([ox + 3, oy + 12, ox + 12, oy + 12], fill=(188, 218, 248, 255))

    # (5,1) Moving Girder Platform
    ox, oy = cell_box(5, 1)
    d.rectangle([ox, oy + 2, ox + 15, oy + 9], fill=(238, 168, 48, 255), outline=(32, 24, 24, 255))
    for gx in range(2, 14, 4):
        d.line([ox + gx, oy + 3, ox + gx + 2, oy + 8], fill=(142, 82, 22, 255))

    # (6,1) & (7,1) Spring Trampoline Idle & Compressed
    ox, oy = cell_box(6, 1)
    d.rectangle([ox + 1, oy + 1, ox + 14, oy + 4], fill=(235, 58, 62, 255), outline=(24, 20, 28, 255))
    d.line([ox + 3, oy + 5, ox + 12, oy + 8], fill=(220, 226, 238, 255), width=2)
    d.line([ox + 12, oy + 8, ox + 3, oy + 12], fill=(180, 188, 204, 255), width=2)
    d.rectangle([ox + 1, oy + 12, ox + 14, oy + 15], fill=(235, 58, 62, 255), outline=(24, 20, 28, 255))

    ox, oy = cell_box(7, 1)
    d.rectangle([ox + 1, oy + 7, ox + 14, oy + 10], fill=(235, 58, 62, 255), outline=(24, 20, 28, 255))
    d.line([ox + 3, oy + 11, ox + 12, oy + 12], fill=(220, 226, 238, 255), width=2)
    d.rectangle([ox + 1, oy + 12, ox + 14, oy + 15], fill=(235, 58, 62, 255), outline=(24, 20, 28, 255))

    # (0,2) Underground Blue Stone Ground
    ox, oy = cell_box(0, 2)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(42, 88, 148, 255), outline=(18, 32, 64, 255))
    d.rectangle([ox + 1, oy + 1, ox + 14, oy + 4], fill=(82, 156, 228, 255))
    for rx, ry in [(3, 8), (10, 10), (5, 12)]:
        d.rectangle([ox + rx, oy + ry, ox + rx + 2, oy + ry + 2], fill=(26, 56, 104, 255))

    # (1,2) Underground Sub-Stone
    ox, oy = cell_box(1, 2)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(32, 68, 122, 255))
    for rx, ry in [(2, 3), (9, 5), (4, 10), (11, 12)]:
        d.rectangle([ox + rx, oy + ry, ox + rx + 3, oy + ry + 2], fill=(20, 44, 84, 255))

    # (2,2) Underground Blue Brick
    ox, oy = cell_box(2, 2)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(56, 118, 188, 255))
    for y in (0, 4, 8, 12):
        d.line([ox, oy + y, ox + 15, oy + y], fill=(18, 32, 64, 255))
        d.line([ox, oy + y + 1, ox + 15, oy + y + 1], fill=(108, 178, 242, 255))
    for idx, y in enumerate((0, 4, 8, 12)):
        off = 0 if idx % 2 == 0 else 4
        for x in range(off, 16, 8):
            d.line([ox + x, oy + y, ox + x, oy + y + 3], fill=(18, 32, 64, 255))

    # (3,2) Hazard Spikes
    ox, oy = cell_box(3, 2)
    for sx in (0, 8):
        d.polygon([(ox + sx, oy + 15), (ox + sx + 4, oy + 3), (ox + sx + 7, oy + 15)], fill=(214, 224, 238, 255), outline=(28, 30, 42, 255))
        d.line([ox + sx + 3, oy + 6, ox + sx + 2, oy + 14], fill=(255, 255, 255, 255))

    # (4,2) Castle Fortress Stone
    ox, oy = cell_box(4, 2)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(96, 100, 116, 255))
    for y in (0, 8):
        d.line([ox, oy + y, ox + 15, oy + y], fill=(32, 32, 42, 255))
        d.line([ox, oy + y + 1, ox + 15, oy + y + 1], fill=(142, 148, 168, 255))
    d.line([ox + 7, oy, ox + 7, oy + 7], fill=(32, 32, 42, 255))
    d.line([ox + 15, oy + 8, ox + 15, oy + 15], fill=(32, 32, 42, 255))

    # (5,2) Castle Boss Bridge
    ox, oy = cell_box(5, 2)
    d.rectangle([ox, oy + 2, ox + 15, oy + 11], fill=(186, 114, 48, 255), outline=(32, 22, 18, 255))
    d.ellipse([ox + 2, oy + 4, ox + 6, oy + 9], fill=(228, 158, 78, 255))
    d.ellipse([ox + 9, oy + 4, ox + 13, oy + 9], fill=(228, 158, 78, 255))

    # (6,2) & (7,2) Lava Surface Frames 1 & 2
    for idx, shift in enumerate((0, 4)):
        ox, oy = cell_box(6 + idx, 2)
        d.rectangle([ox, oy + 4, ox + 15, oy + 15], fill=(218, 48, 24, 255))
        d.rectangle([ox, oy + 4, ox + 15, oy + 8], fill=(252, 128, 28, 255))
        for wx in range(0, 16, 8):
            px = (wx + shift) % 14
            d.ellipse([ox + px, oy + 1, ox + px + 5, oy + 6], fill=(255, 222, 58, 255))

    # (0,3) Castle Battlement
    ox, oy = cell_box(0, 3)
    d.rectangle([ox, oy + 6, ox + 15, oy + 15], fill=(116, 62, 46, 255), outline=(32, 20, 18, 255))
    d.rectangle([ox, oy, ox + 5, oy + 7], fill=(138, 74, 54, 255), outline=(32, 20, 18, 255))
    d.rectangle([ox + 10, oy, ox + 15, oy + 7], fill=(138, 74, 54, 255), outline=(32, 20, 18, 255))

    # (1,3) Castle Wall w/ Window
    ox, oy = cell_box(1, 3)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(138, 74, 54, 255), outline=(58, 30, 22, 255))
    d.rounded_rectangle([ox + 4, oy + 3, ox + 11, oy + 13], radius=3, fill=(24, 20, 28, 255))

    # (2,3) & (3,3) Castle Door Top & Bottom
    ox, oy = cell_box(2, 3)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(138, 74, 54, 255))
    d.pieslice([ox + 2, oy + 2, ox + 13, oy + 24], 180, 360, fill=(24, 20, 28, 255))

    ox, oy = cell_box(3, 3)
    d.rectangle([ox, oy, ox + 15, oy + 15], fill=(138, 74, 54, 255))
    d.rectangle([ox + 2, oy, ox + 13, oy + 15], fill=(24, 20, 28, 255))

    # (4,3) Flagpole Segment
    ox, oy = cell_box(4, 3)
    d.rectangle([ox + 6, oy, ox + 9, oy + 15], fill=(118, 232, 92, 255))
    d.line([ox + 6, oy, ox + 6, oy + 15], fill=(32, 98, 34, 255))
    d.line([ox + 9, oy, ox + 9, oy + 15], fill=(32, 98, 34, 255))

    # (5,3) Flagpole Gold Finial
    ox, oy = cell_box(5, 3)
    d.ellipse([ox + 3, oy + 3, ox + 12, oy + 12], fill=(255, 218, 52, 255), outline=(88, 54, 18, 255))
    d.rectangle([ox + 6, oy + 12, ox + 9, oy + 15], fill=(118, 232, 92, 255))

    # (6,3) Boss Bridge Release Axe
    ox, oy = cell_box(6, 3)
    d.line([ox + 4, oy + 14, ox + 11, oy + 4], fill=(168, 102, 46, 255), width=2)
    d.pieslice([ox + 5, oy + 1, ox + 15, oy + 11], 290, 80, fill=(228, 238, 250, 255), outline=(28, 32, 44, 255))
    d.ellipse([ox + 8, oy + 4, ox + 11, oy + 7], fill=(255, 214, 54, 255))

    # (7,3) Falling Donut Block
    ox, oy = cell_box(7, 3)
    d.rounded_rectangle([ox + 1, oy + 2, ox + 14, oy + 13], radius=4, fill=(242, 178, 92, 255), outline=(92, 48, 22, 255))
    d.rectangle([ox + 5, oy + 5, ox + 10, oy + 10], fill=(92, 48, 22, 255))

    upscale(sheet, 2).save(SPRITES_DIR / "tiles.png")


def build_items_sheet() -> None:
    sheet = Image.new("RGBA", (16 * 4, 16 * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(sheet)

    # Row 0: Spinning Gold Coin (4 widths)
    widths = [(3, 12), (5, 10), (7, 8), (5, 10)]
    for i, (x0, x1) in enumerate(widths):
        ox = i * 16
        d.ellipse([ox + x0, 2, ox + x1, 13], fill=(255, 216, 48, 255), outline=(122, 74, 16, 255))
        if x1 - x0 >= 5:
            d.line([ox + (x0 + x1) // 2, 5, ox + (x0 + x1) // 2, 10], fill=(255, 250, 180, 255))

    # (0,1) Super Mushroom & (1,1) 1-UP Mushroom
    for idx, cap_col in enumerate([(232, 48, 56, 255), (46, 198, 72, 255)]):
        ox, oy = idx * 16, 16
        d.pieslice([ox + 1, oy + 1, ox + 14, oy + 13], 180, 360, fill=cap_col, outline=(24, 20, 28, 255))
        d.ellipse([ox + 3, oy + 3, ox + 6, oy + 6], fill=(255, 255, 255, 255))
        d.ellipse([ox + 9, oy + 3, ox + 12, oy + 6], fill=(255, 255, 255, 255))
        d.rectangle([ox + 4, oy + 8, ox + 11, oy + 14], fill=(252, 222, 178, 255), outline=(24, 20, 28, 255))
        d.point((ox + 6, oy + 10), fill=(24, 20, 28, 255))
        d.point((ox + 9, oy + 10), fill=(24, 20, 28, 255))

    # (2,1) Fire Flower
    ox, oy = 32, 16
    d.ellipse([ox + 2, oy + 1, ox + 13, oy + 10], fill=(242, 64, 36, 255), outline=(24, 20, 28, 255))
    d.ellipse([ox + 4, oy + 3, ox + 11, oy + 8], fill=(255, 218, 52, 255))
    d.ellipse([ox + 6, oy + 4, ox + 9, oy + 7], fill=(255, 255, 255, 255))
    d.line([ox + 7, oy + 10, ox + 7, oy + 14], fill=(46, 192, 68, 255), width=2)
    d.polygon([(ox + 3, oy + 12), (ox + 7, oy + 13), (ox + 5, oy + 10)], fill=(46, 192, 68, 255))
    d.polygon([(ox + 12, oy + 12), (ox + 8, oy + 13), (ox + 10, oy + 10)], fill=(46, 192, 68, 255))

    # (3,1) Super Star
    ox, oy = 48, 16
    pts = [
        (ox + 8, oy + 1), (ox + 10, oy + 5), (ox + 14, oy + 6),
        (ox + 11, oy + 9), (ox + 12, oy + 14), (ox + 8, oy + 11),
        (ox + 4, oy + 14), (ox + 5, oy + 9), (ox + 2, oy + 6), (ox + 6, oy + 5)
    ]
    d.polygon(pts, fill=(255, 224, 52, 255), outline=(118, 72, 14, 255))
    d.point((ox + 7, oy + 7), fill=(24, 20, 28, 255))
    d.point((ox + 9, oy + 7), fill=(24, 20, 28, 255))

    # (0,2) & (1,2) Player Fireballs
    for idx in range(2):
        ox, oy = idx * 16, 32
        d.ellipse([ox + 4, oy + 4, ox + 11, oy + 11], fill=(252, 92, 28, 255), outline=(140, 28, 14, 255))
        d.ellipse([ox + 6, oy + 6, ox + 9, oy + 9], fill=(255, 236, 92, 255))
        tail_x = ox + 3 if idx == 0 else ox + 12
        d.point((tail_x, oy + 5), fill=(255, 198, 48, 255))

    # (2,2) & (3,2) Boss Fire Wave
    for idx in range(2):
        ox, oy = (2 + idx) * 16, 32
        d.ellipse([ox + 1, oy + 4, ox + 14, oy + 12], fill=(248, 78, 24, 255))
        d.ellipse([ox + 3, oy + 6, ox + 11, oy + 10], fill=(255, 224, 68, 255))

    # (0,3) Checkpoint Inactive, (1,3) Checkpoint Active, (2,3) Goal Flag, (3,3) Heart Icon
    for idx, col in enumerate([(228, 56, 62, 255), (62, 218, 92, 255)]):
        ox, oy = idx * 16, 48
        d.rectangle([ox + 2, oy + 1, ox + 3, oy + 15], fill=(224, 230, 240, 255))
        d.polygon([(ox + 4, oy + 2), (ox + 14, oy + 6), (ox + 4, oy + 10)], fill=col, outline=(24, 20, 28, 255))

    ox, oy = 32, 48
    d.polygon([(ox + 14, oy + 2), (ox + 2, oy + 7), (ox + 14, oy + 12)], fill=(54, 208, 78, 255), outline=(24, 20, 28, 255))
    d.ellipse([ox + 9, oy + 5, ox + 12, oy + 8], fill=(255, 224, 62, 255))

    ox, oy = 48, 48
    d.ellipse([ox + 2, oy + 3, ox + 8, oy + 9], fill=(238, 52, 72, 255))
    d.ellipse([ox + 7, oy + 3, ox + 13, oy + 9], fill=(238, 52, 72, 255))
    d.polygon([(ox + 2, oy + 7), (ox + 13, oy + 7), (ox + 7, oy + 13)], fill=(238, 52, 72, 255))

    upscale(sheet, 2).save(SPRITES_DIR / "items.png")


def build_backgrounds() -> None:
    # Overworld Parallax Background (256x144 upscaled 2x -> 512x288)
    ow = Image.new("RGBA", (256, 144), (92, 148, 252, 255))
    d = ImageDraw.Draw(ow)
    for y in range(144):
        r = int(84 + (y / 144) * 56)
        g = int(146 + (y / 144) * 68)
        b = 252
        d.line([0, y, 255, y], fill=(r, g, b, 255))
    # Fluffy clouds
    for cx, cy, cw in [(24, 26, 36), (112, 18, 46), (196, 32, 32)]:
        d.rounded_rectangle([cx, cy + 6, cx + cw, cy + 16], radius=5, fill=(255, 255, 255, 235))
        d.ellipse([cx + 6, cy, cx + 20, cy + 14], fill=(255, 255, 255, 245))
        d.ellipse([cx + 16, cy + 2, cx + cw - 4, cy + 14], fill=(255, 255, 255, 245))
    # Distant misty hills
    for hx, hw, hh in [(-10, 90, 56), (68, 110, 70), (168, 100, 60)]:
        d.pieslice([hx, 144 - hh, hx + hw, 144 + hh], 180, 360, fill=(88, 188, 132, 255))
    # Classic foreground rounded hills
    for hx, hw, hh in [(12, 72, 42), (128, 88, 52), (218, 60, 34)]:
        d.pieslice([hx, 144 - hh, hx + hw, 144 + hh], 180, 360, fill=(38, 168, 68, 255), outline=(22, 104, 42, 255))
        d.ellipse([hx + hw // 2 - 3, 144 - hh + 12, hx + hw // 2 + 3, 144 - hh + 20], fill=(122, 224, 118, 255))
    upscale(ow, 2).save(BG_DIR / "bg_overworld.png")

    # Underground Cavern Background
    ug = Image.new("RGBA", (256, 144), (16, 22, 46, 255))
    d = ImageDraw.Draw(ug)
    for y in range(144):
        c = int(14 + (y / 144) * 20)
        d.line([0, y, 255, y], fill=(c, c + 8, c + 34, 255))
    for px in range(16, 256, 64):
        d.rectangle([px, 0, px + 14, 144], fill=(26, 38, 72, 255))
    for sx in range(8, 256, 22):
        sh = 14 + (sx * 7) % 24
        d.polygon([(sx, 0), (sx + 10, 0), (sx + 5, sh)], fill=(34, 52, 96, 255))
    for cx, cy, col in [(42, 98, (72, 224, 255, 220)), (108, 112, (192, 98, 255, 220)), (184, 92, (72, 224, 255, 220)), (232, 108, (92, 255, 178, 220))]:
        d.polygon([(cx, cy + 20), (cx + 5, cy), (cx + 11, cy + 20)], fill=col)
    upscale(ug, 2).save(BG_DIR / "bg_underground.png")

    # Sky Kingdom Background
    sk = Image.new("RGBA", (256, 144), (112, 186, 255, 255))
    d = ImageDraw.Draw(sk)
    for y in range(144):
        r = int(98 + (y / 144) * 112)
        g = int(172 + (y / 144) * 62)
        d.line([0, y, 255, y], fill=(r, g, 255, 255))
    for i, col in enumerate([(255, 98, 112, 90), (255, 198, 78, 90), (98, 238, 142, 90), (98, 188, 255, 90)]):
        d.arc([28 - i * 3, 22 - i * 3, 228 + i * 3, 190 + i * 3], 180, 360, fill=col, width=3)
    for cx in range(-10, 260, 36):
        cy = 108 + (cx * 3) % 18
        d.ellipse([cx, cy, cx + 48, cy + 36], fill=(255, 255, 255, 235))
    upscale(sk, 2).save(BG_DIR / "bg_sky.png")

    # Magma Keep Castle Background
    cs = Image.new("RGBA", (256, 144), (24, 16, 24, 255))
    d = ImageDraw.Draw(cs)
    for y in range(144):
        r = int(26 + max(0, y - 70) * 1.6)
        g = int(16 + max(0, y - 95) * 0.9)
        d.line([0, y, 255, y], fill=(min(255, r), min(255, g), 24, 255))
    for ax in range(0, 256, 64):
        d.rectangle([ax, 0, ax + 14, 144], fill=(42, 34, 46, 255))
        d.pieslice([ax + 14, 16, ax + 50, 62], 180, 360, fill=(18, 12, 18, 255))
        # Glowing wall torch
        d.rectangle([ax + 5, 58, ax + 8, 68], fill=(112, 68, 36, 255))
        d.ellipse([ax + 4, 50, ax + 9, 58], fill=(255, 168, 38, 255))
        d.ellipse([ax + 5, 52, ax + 8, 56], fill=(255, 238, 112, 255))
    upscale(cs, 2).save(BG_DIR / "bg_castle.png")


if __name__ == "__main__":
    build_player_sheet()
    build_enemies_sheet()
    build_boss_sheet()
    build_tiles_sheet()
    build_items_sheet()
    build_backgrounds()
    print("Assets generated successfully.")
