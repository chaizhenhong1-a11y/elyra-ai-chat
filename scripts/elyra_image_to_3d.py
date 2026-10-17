import argparse
import base64
import json
import os
import shutil
import subprocess
import urllib.error
import urllib.request
from pathlib import Path


def find_gcloud():
    candidates = [
        shutil.which("gcloud.cmd"),
        shutil.which("gcloud"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.exe"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return str(Path(candidate))
    raise RuntimeError("Google Cloud CLI (gcloud.cmd) was not found.")


def google_identity_token():
    result = subprocess.run(
        [find_gcloud(), "auth", "print-identity-token"],
        check=True,
        capture_output=True,
        text=True,
        shell=False,
    )
    token = result.stdout.strip()
    if not token:
        raise RuntimeError("gcloud returned an empty identity token.")
    return token


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--url", required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    image_path = Path(args.image).resolve()
    output_path = Path(args.out).resolve()
    endpoint = args.url.strip()

    if not image_path.exists():
        raise FileNotFoundError(image_path)

    payload = {
        "image": base64.b64encode(image_path.read_bytes()).decode("ascii"),
        "seed": 1234,
        "octree_resolution": 128,
        "num_inference_steps": 5,
        "guidance_scale": 5.0,
    }
    body = json.dumps(payload).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Accept": "model/gltf-binary, application/octet-stream, application/json",
    }
    if os.environ.get("ELYRA_IMAGE_TO_3D_AUTH", "").lower() == "google":
        headers["Authorization"] = f"Bearer {google_identity_token()}"

    request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=3600) as response:
            data = response.read()
            content_type = response.headers.get("Content-Type", "").lower()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Image-to-3D HTTP {exc.code}: {detail}") from exc

    if "application/json" in content_type:
        decoded = json.loads(data.decode("utf-8"))
        if isinstance(decoded, dict) and decoded.get("glb_base64"):
            data = base64.b64decode(decoded["glb_base64"])
        else:
            raise RuntimeError(f"Unexpected JSON response: {decoded}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(data)

    size = output_path.stat().st_size
    if size < 1000:
        raise RuntimeError(f"Generated GLB is unexpectedly small: {size} bytes")

    # GLB magic header must be b'glTF'.
    with output_path.open("rb") as fh:
        magic = fh.read(4)
    if magic != b"glTF":
        raise RuntimeError(f"Response is not a valid GLB (magic={magic!r}).")

    print(f"ELYRA_IMAGE_TO_3D_OK {output_path}")
    print(f"ELYRA_IMAGE_TO_3D_BYTES {size}")


if __name__ == "__main__":
    main()
