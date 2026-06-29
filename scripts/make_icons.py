"""
Generate PWA PNG icons for Bamboo Fuel & MEL Tool.

Composites the official Bamboo Airways leaf mark (public/bamboo-logo-mark.png)
onto a navy rounded tile and exports the sizes referenced by the manifest and
index.html.

Run:  python scripts/make_icons.py
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "public")
MARK = os.path.join(OUT, "bamboo-logo-mark.png")
S = 512  # master canvas size


def vertical_gradient(size, top, bottom):
    g = Image.new("RGBA", (size, size), top)
    d = ImageDraw.Draw(g)
    for yy in range(size):
        t = yy / size
        col = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(4))
        d.line([(0, yy), (size, yy)], fill=col)
    return g


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def fit(mark, box):
    r = box / max(mark.size)
    return mark.resize((max(1, round(mark.width * r)), max(1, round(mark.height * r))), Image.LANCZOS)


def compose(square=False, frac=0.72):
    bg = vertical_gradient(S, (20, 84, 150, 255), (9, 38, 76, 255))
    if not square:
        bg.putalpha(rounded_mask(S, int(S * 0.22)))
    mark = Image.open(MARK).convert("RGBA")
    m = fit(mark, int(S * frac))
    bg.alpha_composite(m, ((S - m.width) // 2, (S - m.height) // 2))
    return bg


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name))
    print("wrote", name)


def main():
    rounded = compose(square=False, frac=0.74)
    square = compose(square=True, frac=0.74)
    maskable = compose(square=True, frac=0.6)  # logo within maskable safe zone

    save(rounded, "icon-192.png", 192)
    save(rounded, "icon-512.png", 512)
    save(maskable, "icon-maskable-512.png", 512)
    save(square, "apple-touch-icon.png", 180)


if __name__ == "__main__":
    main()
