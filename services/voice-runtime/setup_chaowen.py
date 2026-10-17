"""Download the selected official Piper preset and retain its model card."""
import hashlib
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "models" / "chaowen"
BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/chaowen/medium/"
FILES = {
    "MODEL_CARD": None,
    "zh_CN-chaowen-medium.onnx.json": "f2598f030cbb8b27549a2e9aaa4daeb5",
    "zh_CN-chaowen-medium.onnx": "4965c46e983653811bef0253026ff45a",
}


def main():
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name, checksum in FILES.items():
        target = MODEL_DIR / name
        if target.exists() and (checksum is None or hashlib.md5(target.read_bytes()).hexdigest() == checksum):
            print(f"Already present: {name}", flush=True)
            continue
        print(f"Downloading official preset: {name}", flush=True)
        request = urllib.request.Request(BASE + name, headers={"User-Agent": "Elyra-Voice-Preview/1.0"})
        temporary = target.with_suffix(target.suffix + ".download")
        with urllib.request.urlopen(request, timeout=120) as response, temporary.open("wb") as output:
            shutil.copyfileobj(response, output)
        if checksum and hashlib.md5(temporary.read_bytes()).hexdigest() != checksum:
            raise RuntimeError(f"Published model checksum mismatch: {name}")
        temporary.replace(target)
        if name == "MODEL_CARD":
            print(target.read_text(encoding="utf-8"), flush=True)


if __name__ == "__main__":
    main()
