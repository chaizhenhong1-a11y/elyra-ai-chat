FROM nvidia/cuda:12.4.1-devel-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive PIP_NO_CACHE_DIR=1 PYTHONUNBUFFERED=1 HF_HOME=/tmp/huggingface PORT=8080
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-dev git build-essential ninja-build cmake libgl1 libglib2.0-0 libgomp1 libegl1 && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --upgrade pip setuptools wheel && \
 python3 -m pip install --index-url https://download.pytorch.org/whl/cu124 torch==2.6.0 torchvision==0.21.0 && \
 git clone --depth 1 https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git /opt/Hunyuan3D-2 && cd /opt/Hunyuan3D-2 && \
 python3 -m pip install -r requirements.txt && python3 -m pip install -e . && \
 python3 -m pip install --upgrade --force-reinstall "transformers==4.48.1" "tokenizers==0.21.0" && \
 python3 -m pip install fastapi 'uvicorn[standard]' python-multipart && \
 python3 -m pip check && \
 python3 -c "import transformers,diffusers,huggingface_hub; print('ELYRA_TRANSFORMERS',transformers.__version__); print('ELYRA_DIFFUSERS',diffusers.__version__); print('ELYRA_HF_HUB',huggingface_hub.__version__); from diffusers.utils.torch_utils import randn_tensor; from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline; print('ELYRA_HUNYUAN_IMPORT_SMOKE_OK True')"
WORKDIR /app
COPY server.py /app/server.py
RUN python3 -c "import server; print('ELYRA_SERVER_IMPORT_SMOKE_OK True')"
EXPOSE 8080
CMD ["python3", "/app/server.py"]
