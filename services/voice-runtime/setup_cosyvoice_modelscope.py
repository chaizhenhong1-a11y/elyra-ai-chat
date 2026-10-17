"""Public publisher mirror, resumable writes and Hugging Face hash checks."""
import hashlib
import os
import socket
import time
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from huggingface_hub import HfApi
from concurrent.futures import ThreadPoolExecutor

_getaddrinfo = socket.getaddrinfo
def ipv4_addresses(host, port, family=0, type=0, proto=0, flags=0):
    return _getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = ipv4_addresses
ROOT = Path(__file__).resolve().parent / "models" / "cosyvoice3"
REPO = "FunAudioLLM/Fun-CosyVoice3-0.5B-2512"
files = HfApi(token=False).model_info(REPO, files_metadata=True).siblings
needed = [f for f in files if f.rfilename in {"README.md", "cosyvoice3.yaml", "campplus.onnx", "speech_tokenizer_v3.onnx", "flow.pt", "llm.pt", "hift.pt", "spk2info.pt"} or (f.rfilename.startswith("CosyVoice-BlankEN/") and not f.rfilename.endswith(".safetensors"))]
needed.sort(key=lambda f: f.size or 0)
print("Total inference download: %.1f MB" % (sum(f.size or 0 for f in needed)/1048576), flush=True)
if "--manifest" in sys.argv:
    for item in needed:
        print(f"{item.rfilename}: {item.size/1048576:.1f} MB", flush=True)
    raise SystemExit(0)
def download(item):
    path = ROOT / item.rfilename
    expected = item.lfs.sha256 if item.lfs else None
    def valid():
        if not path.exists() or path.stat().st_size != item.size:
            return False
        return expected is None or hashlib.file_digest(path.open("rb"), "sha256").hexdigest() == expected
    if valid():
        print("Cached:", item.rfilename, flush=True)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    part = path.with_name(path.name + ".part")
    print(f"Downloading {item.rfilename}: {item.size/1048576:.1f} MB", flush=True)
    for attempt in range(5):
        try:
            offset = part.stat().st_size if part.exists() else 0
            headers = {"Range": f"bytes={offset}-"} if offset else {}
            url = f"https://modelscope.cn/models/{REPO}/resolve/master/{item.rfilename}"
            with urlopen(Request(url, headers=headers), timeout=30) as response:
                append = offset > 0 and response.status == 206
                if not append:
                    offset = 0
                last_report = time.monotonic()
                with part.open("ab" if append else "wb") as output:
                    while chunk := response.read(1024*1024):
                        output.write(chunk)
                        offset += len(chunk)
                        if time.monotonic()-last_report > 10:
                            output.flush()
                            print(f"  {item.rfilename}: {offset/1048576:.1f}/{item.size/1048576:.1f} MB", flush=True)
                            last_report = time.monotonic()
            if part.stat().st_size != item.size:
                raise RuntimeError("Incomplete download")
            if expected and hashlib.file_digest(part.open("rb"), "sha256").hexdigest() != expected:
                raise RuntimeError("Checksum mismatch")
            os.replace(part, path)
            print("Verified:", item.rfilename, flush=True)
            break
        except Exception as error:
            print(f"Retry {attempt+1}: {type(error).__name__}: {error}", flush=True)
            if attempt == 4:
                raise
with ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(download, needed))
print("CosyVoice 3 download complete.", flush=True)
