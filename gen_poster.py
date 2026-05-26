#!/usr/bin/env python3
"""
Compose the Crystal Ball Collective launch poster — 1080×1080 PNG.

Style: cosmic dark backdrop, glowing crystal ball at center with subtle
fracture lines, soft gold serif title, brand stamp.

Run:
  ~/miniconda3/bin/python3 gen_poster.py
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1080
HERE = os.path.dirname(__file__)
OUTPUT_PATH = "/Users/yin/code/games/games/posters/crystal-ball-collective.png"

BG = (7, 6, 12)
INK = (245, 239, 226)
GOLD = (216, 192, 138)
INDIGO_DEEP = (28, 16, 56)
PURPLE_GLOW = (76, 52, 124)


def pick_font(cands, default="/System/Library/Fonts/Helvetica.ttc"):
    return next((p for p in cands if os.path.exists(p)), default)


SERIF = pick_font([
    "/System/Library/Fonts/Supplemental/Cormorant Garamond.ttf",
    "/System/Library/Fonts/NewYork.ttf",
    "/System/Library/Fonts/Times.ttc",
])
SERIF_ITALIC = pick_font([
    "/System/Library/Fonts/Supplemental/Cormorant Garamond Italic.ttf",
    "/System/Library/Fonts/NewYorkItalic.ttf",
    "/System/Library/Fonts/Times.ttc",
])
SANS = pick_font(["/System/Library/Fonts/Helvetica.ttc"])


def gradient_bg(img):
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = W // 2, int(H * 0.42)
    max_r = max(W, H)
    for r in range(max_r, 0, -8):
        t = r / max_r
        col = (
            int(BG[0] + (INDIGO_DEEP[0] - BG[0]) * (1 - t) * 0.55),
            int(BG[1] + (INDIGO_DEEP[1] - BG[1]) * (1 - t) * 0.55),
            int(BG[2] + (INDIGO_DEEP[2] - BG[2]) * (1 - t) * 0.55),
        )
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)


def draw_orb(img):
    cx, cy = W // 2, int(H * 0.46)
    R = 290

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(R + 180, R, -3):
        a = max(0, int(40 * (1 - (r - R) / 180)))
        gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(216, 192, 138, a))
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    img.alpha_composite(glow)

    body = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    for r in range(R, 0, -2):
        t = r / R
        col = (
            int(20 + (PURPLE_GLOW[0] - 20) * (1 - t) * 0.95),
            int(12 + (PURPLE_GLOW[1] - 12) * (1 - t) * 0.95),
            int(40 + (PURPLE_GLOW[2] - 40) * (1 - t) * 0.95),
            255,
        )
        bd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    img.alpha_composite(body)

    sheen = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen)
    sd.ellipse([cx - R + 30, cy - R + 35, cx - 30, cy - 80],
               fill=(255, 255, 255, 70))
    sheen = sheen.filter(ImageFilter.GaussianBlur(28))
    img.alpha_composite(sheen)

    crack = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(crack)
    random.seed(7)
    for i in range(9):
        ang = (i / 9) * math.tau + random.uniform(-0.1, 0.1)
        length = R * random.uniform(0.55, 0.85)
        segs = 7
        pts = [(cx, cy)]
        for s in range(1, segs + 1):
            t = s / segs
            wobble = random.uniform(-0.05, 0.05)
            a = ang + wobble / max(0.25, t)
            r = length * t
            pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
        cd.line(pts, fill=(245, 239, 226, 180), width=2)
        for _ in range(random.randint(2, 3)):
            at = random.uniform(0.3, 0.85)
            sx = cx + math.cos(ang) * length * at
            sy = cy + math.sin(ang) * length * at
            ba = ang + random.uniform(-1.1, 1.1)
            bl = length * random.uniform(0.18, 0.30)
            cd.line([(sx, sy), (sx + math.cos(ba) * bl, sy + math.sin(ba) * bl)],
                    fill=(245, 239, 226, 130), width=1)
    crack = crack.filter(ImageFilter.GaussianBlur(0.5))
    img.alpha_composite(crack)


def text_width(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def draw_text(img):
    draw = ImageDraw.Draw(img, "RGBA")
    f_brand = ImageFont.truetype(SANS, 30)
    brand = "CRYSTAL BALL COLLECTIVE"
    bw = text_width(draw, brand, f_brand)
    draw.text(((W - bw) / 2, 70), brand, fill=GOLD, font=f_brand)

    draw.line([(W / 2 - 130, 122), (W / 2 + 130, 122)],
              fill=(216, 192, 138, 120), width=1)

    f_sub = ImageFont.truetype(SANS, 22)
    sub = "A DAILY DIVINATION"
    sw = text_width(draw, sub, f_sub)
    draw.text(((W - sw) / 2, 138), sub, fill=(245, 239, 226, 160), font=f_sub)

    f_title = ImageFont.truetype(SERIF_ITALIC, 92)
    title = "Press & Hold"
    tw = text_width(draw, title, f_title)
    draw.text(((W - tw) / 2, H * 0.66), title, fill=INK, font=f_title)

    f_fp = ImageFont.truetype(SANS, 20)
    fp = "WHISPER · VISION · REVELATION · THE BRINK"
    fpw = text_width(draw, fp, f_fp)
    draw.text(((W - fpw) / 2, H * 0.79), fp, fill=GOLD, font=f_fp)

    f_tag = ImageFont.truetype(SERIF_ITALIC, 30)
    tag = "one card a day, drawn from the breaking glass"
    tgw = text_width(draw, tag, f_tag)
    draw.text(((W - tgw) / 2, H * 0.83), tag, fill=(245, 239, 226, 175), font=f_tag)

    f_alt = ImageFont.truetype(SANS, 18)
    alt = "ALTERU"
    aw = text_width(draw, alt, f_alt)
    draw.text(((W - aw) / 2, H - 70), alt, fill=(216, 192, 138, 150), font=f_alt)


def main():
    img = Image.new("RGBA", (W, H), BG + (255,))
    gradient_bg(img)
    draw_orb(img)
    draw_text(img)
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    img.convert("RGB").save(OUTPUT_PATH, "PNG", optimize=True)
    print(f"wrote {OUTPUT_PATH}")
    local = os.path.join(HERE, "public", "poster.png")
    img.convert("RGB").save(local, "PNG", optimize=True)
    print(f"wrote {local}")


if __name__ == "__main__":
    main()
