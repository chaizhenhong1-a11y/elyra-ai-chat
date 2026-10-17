"""Download only public CosyVoice 3 inference files. No login/token needed."""
import os
import socket
# Some Windows networks establish IPv6 CDN connections but stall on payloads.
_getaddrinfo = socket.getaddrinfo
def ipv4_addresses(host, port, family=0, type=0, proto=0, flags=0):
    return _getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = ipv4_addresses
os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ["HF_HUB_DOWNLOAD_TIMEOUT"] = "120"
from pathlib import Path
from huggingface_hub import snapshot_download

root = Path(__file__).resolve().parent
snapshot_download(
    repo_id="FunAudioLLM/Fun-CosyVoice3-0.5B-2512",
    local_dir=root / "models" / "cosyvoice3",
    token=False,
    max_workers=2,
    allow_patterns=["cosyvoice3.yaml", "*.pt", "campplus.onnx",
                    "speech_tokenizer_v3.onnx", "CosyVoice-BlankEN/*",
                    "LICENSE*", "README*"],
)
print("CosyVoice 3 inference files downloaded.", flush=True)
