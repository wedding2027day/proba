#!/usr/bin/env python3
"""
Готовит фотографии для сайта: кадрирование, единая тёплая ч/б обработка, версии для телефона,
слои для сцены 02 (вырезанные люди + чистая подложка без людей).

Этот же скрипт подойдёт для ваших настоящих фотографий: замените url в PHOTOS
(можно указать путь к локальному файлу) и подберите кадр.

Установка один раз (модель вырезки весит около 220 МБ и скачивается при первом запуске):
    python3 -m venv .venv-photos
    .venv-photos/bin/pip install "rembg[cli]" onnxruntime opencv-python-headless

Запуск:
    .venv-photos/bin/python scripts/prepare-photos.py
"""
import shutil
import subprocess
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public" / "assets" / "images"
U = "https://images.unsplash.com/{}?w=3000&q=88&fm=jpg"

PHOTOS = {
    "hero": U.format("photo-1460978812857-470ed1c77af0"),
    "hands": U.format("photo-1521544213200-ee65f73b6238"),
    "dance": U.format("photo-1660227767957-3ecc696e0dec"),
    "table": U.format("photo-1530367086713-83fee2b59d84"),
    "venue": U.format("photo-1549964336-96c968e00d5b"),
    "look-women": U.format("photo-1706816997334-c51bcd0f52e0"),
    "look-men": U.format("photo-1546572797-e8c933a75a1f"),
    "party": U.format("photo-1768611873658-5f041a413341"),
}

# Точка поцелуя на главном кадре (доля ширины): по ней проходит шов диптиха.
HERO_SEAM = 0.633


def load(name):
    SRC.mkdir(exist_ok=True)
    src = PHOTOS[name]
    path = SRC / f"{name}.jpg"
    if not path.exists():
        if src.startswith("http"):
            subprocess.run(["curl", "-sSfL", "-m", "120", "-o", str(path), src], check=True)
        else:
            shutil.copy(src, path)
    img = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"Не удалось прочитать {path}")
    return img


def grade(img, sat=0.0, black=0.02, white=1.0, gamma=1.0, gain=1.0):
    """Editorial Black: чёрный с тёплым оттенком, света цвета слоновой кости. Геометрия не меняется."""
    x = img.astype(np.float32) / 255
    luma = (0.114 * x[..., 0] + 0.587 * x[..., 1] + 0.299 * x[..., 2])[..., None]
    t = np.clip((luma - black) / max(white - black, 1e-3), 0, 1) ** gamma
    # Тонирование: от #0B0A09 к #F6F1E8 (порядок каналов BGR).
    shadow = np.array([9, 10, 11], np.float32) / 255
    light = np.array([232, 241, 246], np.float32) / 255
    mono = shadow + (light - shadow) * t
    if sat > 0:
        ratio = t / np.maximum(luma, 1e-3)
        colour = np.clip(x * ratio, 0, 1)
        mono = mono * (1 - sat) + colour * sat
    return np.clip(mono * gain * 255, 0, 255).astype(np.uint8)


def save(name, img, quality=76):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img, [cv2.IMWRITE_WEBP_QUALITY, quality])
    print(f"{path.relative_to(ROOT)}  {img.shape[1]}×{img.shape[0]}  {path.stat().st_size // 1024} КБ")


def fit(img, width):
    h, w = img.shape[:2]
    if w <= width:
        return img
    return cv2.resize(img, (width, round(h * width / w)), interpolation=cv2.INTER_AREA)


def crop(img, x0, y0, x1, y1):
    h, w = img.shape[:2]
    return img[round(y0 * h):round(y1 * h), round(x0 * w):round(x1 * w)]


def portrait(img, cx, aspect=0.555):
    """Вертикальный кадр вокруг точки cx (доля ширины)."""
    h, w = img.shape[:2]
    cw = min(w, round(h * aspect))
    x0 = min(max(0, round(cx * w - cw / 2)), w - cw)
    return img[:, x0:x0 + cw]


def matte(rgb):
    """Маска людей: нейросеть BiRefNet."""
    from PIL import Image
    from rembg import new_session, remove

    session = new_session("birefnet-general-lite")
    mask = remove(Image.fromarray(cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB)), session=session, only_mask=True)
    alpha = np.array(mask, np.float32) / 255
    # Подрезаем едва заметный ореол, но оставляем полупрозрачность фаты.
    return np.clip((alpha - 0.03) / 0.94, 0, 1)


def clean_plate(rgb, alpha):
    """Подложка без людей: их место заполнено окружением. Видна только узкая кромка при параллаксе."""
    h, w = rgb.shape[:2]
    scale = 700 / w
    small = cv2.resize(rgb, (700, round(h * scale)), interpolation=cv2.INTER_AREA)
    a = cv2.resize(alpha, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_AREA)
    hole = cv2.dilate((a > 0.02).astype(np.uint8) * 255, np.ones((19, 19), np.uint8))
    filled = cv2.inpaint(small, hole, 9, cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(filled, (0, 0), 7)
    big = cv2.resize(filled, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    soft = cv2.GaussianBlur(cv2.resize(hole, (w, h)).astype(np.float32) / 255, (0, 0), 12)[..., None]
    # Зерно, чтобы заполненная область не отличалась от плёнки вокруг.
    rng = np.random.default_rng(7)
    big += rng.normal(0, 3.2, (h, w, 1)).astype(np.float32)
    return np.clip(rgb * (1 - soft) + big * soft, 0, 255).astype(np.uint8)


def story():
    hero = load("hero")
    h, w = hero.shape[:2]
    seam = round(HERO_SEAM * w)
    half = min(seam, w - seam)
    frame = hero[:, seam - half:seam + half]
    alpha = matte(frame)
    plate = clean_plate(frame, alpha)

    g = dict(black=0.03, gamma=1.05)
    full = grade(frame, **g)
    bg = grade(plate, **g)
    fg = np.dstack([full, np.round(alpha * 255).astype(np.uint8)])

    inner = 0.58  # доля половины кадра у шва: этого хватает узкому экрану
    for side, slice_ in (("left", lambda a: a[:, :half]), ("right", lambda a: a[:, half:])):
        f, b, c = slice_(full), slice_(bg), slice_(fg)
        save(f"story/{side}.webp", fit(f, 1200), 78)
        save(f"story/{side}-plate.webp", fit(b, 1200), 70)
        save(f"story/{side}-cutout.webp", fit(c, 1200), 82)
        cut = round(half * inner)
        pick = (lambda a: a[:, half - cut:]) if side == "left" else (lambda a: a[:, :cut])
        save(f"story/{side}-portrait.webp", pick(f), 74)
        save(f"story/{side}-plate-portrait.webp", pick(b), 66)
        save(f"story/{side}-cutout-portrait.webp", pick(c), 80)

    # Финальный фон: тот же кадр, история замыкается.
    closing = grade(hero, black=0.05, gamma=1.25, gain=0.8)
    save("final/closing.webp", fit(closing, 1800), 62)
    save("final/closing-portrait.webp", fit(portrait(closing, HERO_SEAM), 900), 62)


def rest():
    # Сквозь цифры фото должно читаться, поэтому тени приподняты.
    hands = grade(load("hands"), black=0.0, white=0.86, gamma=0.72)
    save("date/couple.webp", fit(hands, 2200), 74)
    save("date/couple-portrait.webp", fit(portrait(hands, 0.57), 1080), 72)

    # Свечи остаются тёплыми: это единственный цветной акцент расписания.
    table = grade(crop(load("table"), 0, 0.3, 1, 0.82), sat=0.75, black=0.0, gamma=1.0)
    save("timeline/dinner.webp", fit(table, 1400), 72)
    # Ч/б версия того же кадра: сцена плавно переходит из неё в цвет.
    save("timeline/dinner-mono.webp", fit(grade(crop(load("table"), 0, 0.3, 1, 0.82), black=0.02, gamma=1.1), 1000), 62)

    # Светлый туман приглушён, чтобы кадр не слепил на чёрном.
    dance = grade(crop(load("dance"), 0, 0.2, 1, 1), black=0.05, gamma=1.5, gain=0.74)
    save("timeline/dance.webp", fit(dance, 1000), 72)

    party = grade(load("party"), black=0.04, gamma=1.15)
    save("timeline/party.webp", fit(party, 1600), 66)

    # Белый зал уходит в вечер: люстры остаются самым ярким в кадре.
    venue = grade(load("venue"), sat=0.45, black=0.02, gamma=1.9, gain=0.86)
    save("location/venue.webp", fit(venue, 2200), 72)
    save("location/venue-portrait.webp", fit(portrait(venue, 0.73), 1080), 70)
    venue_mono = grade(load("venue"), black=0.02, gamma=2.1, gain=0.8)
    save("location/venue-mono.webp", fit(venue_mono, 1600), 60)
    save("location/venue-mono-portrait.webp", fit(portrait(venue_mono, 0.73), 800), 60)

    # Образы показывают цвет наряда, поэтому цвет сохранён.
    women = grade(crop(load("look-women"), 0, 0.02, 1, 0.94), sat=0.85, black=0.0)
    save("dresscode/look-women.webp", fit(women, 900), 74)
    men = grade(crop(load("look-men"), 0, 0.0, 1, 0.92), sat=0.8, black=0.0)
    save("dresscode/look-men.webp", fit(men, 900), 74)


if __name__ == "__main__":
    story()
    rest()
