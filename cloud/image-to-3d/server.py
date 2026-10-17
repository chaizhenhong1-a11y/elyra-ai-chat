import base64
import io
import os
import threading
from typing import Any

import torch
import trimesh
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from PIL import Image

from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

MODEL_PATH = os.getenv("ELYRA_HUNYUAN_MODEL", "tencent/Hunyuan3D-2mini")
SUBFOLDER = os.getenv("ELYRA_HUNYUAN_SUBFOLDER", "hunyuan3d-dit-v2-mini-turbo")

app = FastAPI(title="Elyra Image-to-3D", version="33.3")
_lock = threading.Lock()
_pipeline = None
_rembg = None


def load_model():
    global _pipeline, _rembg
    if _pipeline is not None:
        return _pipeline, _rembg
    with _lock:
        if _pipeline is None:
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA GPU is not available")
            _rembg = BackgroundRemover()
            _pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
                MODEL_PATH,
                subfolder=SUBFOLDER,
                use_safetensors=True,
                device="cuda",
            )
            _pipeline.enable_flashvdm(mc_algo="mc")
    return _pipeline, _rembg


@app.get("/")
@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "elyra-image-to-3d",
        "step": "33.3",
        "cuda": torch.cuda.is_available(),
        "model": MODEL_PATH,
        "loaded": _pipeline is not None,
    }


@app.post("/generate")
def generate(payload: dict[str, Any]):
    image_b64 = payload.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="image base64 is required")
    try:
        raw = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(raw)).convert("RGBA")
        pipeline, rembg = load_model()
        image = rembg(image)
        seed = int(payload.get("seed", 1234))
        mesh = pipeline(
            image=image,
            generator=torch.Generator("cuda").manual_seed(seed),
            octree_resolution=int(payload.get("octree_resolution", 128)),
            num_inference_steps=int(payload.get("num_inference_steps", 5)),
            guidance_scale=float(payload.get("guidance_scale", 5.0)),
            mc_algo="mc",
        )[0]
        data = mesh.export(file_type="glb")
        if not isinstance(data, (bytes, bytearray)):
            scene = trimesh.Scene(mesh)
            data = scene.export(file_type="glb")
        torch.cuda.empty_cache()
        return Response(content=data, media_type="model/gltf-binary")
    except Exception as exc:
        torch.cuda.empty_cache()
        raise HTTPException(status_code=500, detail=f"generation failed: {exc}") from exc


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")), workers=1)
