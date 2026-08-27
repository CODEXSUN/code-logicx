from pathlib import Path

from PIL import Image


MOBILE_DIR = Path(__file__).resolve().parents[1]
ICON_PATH = MOBILE_DIR.parent / "desktop" / "src-tauri" / "icons" / "icon.png"
ANDROID_RES = MOBILE_DIR / "android" / "app" / "src" / "main" / "res"
BACKGROUND = (9, 9, 11, 255)


def main() -> None:
    with Image.open(ICON_PATH) as source:
        icon = source.convert("RGBA")
        generate_launchers(icon)
        generate_splashes(icon)


def generate_launchers(icon: Image.Image) -> None:
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, size in densities.items():
        directory = ANDROID_RES / f"mipmap-{density}"
        render_icon(directory / "ic_launcher.png", icon, size)
        render_icon(directory / "ic_launcher_round.png", icon, size)
        render_icon(directory / "ic_launcher_foreground.png", icon, round(size * 2.25), transparent=True)


def generate_splashes(icon: Image.Image) -> None:
    for path in ANDROID_RES.glob("drawable*/splash.png"):
        with Image.open(path) as existing:
            canvas = Image.new("RGBA", existing.size, BACKGROUND)
        paste_centered(canvas, icon, round(min(canvas.size) * 0.18))
        canvas.convert("RGB").save(path)


def render_icon(path: Path, icon: Image.Image, size: int, transparent: bool = False) -> None:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else BACKGROUND)
    paste_centered(canvas, icon, round(size * (0.48 if transparent else 0.72)))
    canvas.save(path)


def paste_centered(canvas: Image.Image, icon: Image.Image, target_size: int) -> None:
    rendered = icon.copy()
    rendered.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)
    position = ((canvas.width - rendered.width) // 2, (canvas.height - rendered.height) // 2)
    canvas.alpha_composite(rendered, position)


if __name__ == "__main__":
    main()
