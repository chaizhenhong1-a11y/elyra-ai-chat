# Elyra Step 33.3 — private Hunyuan3D Cloud Run GPU

Creates a new isolated service only:
- project: holysht
- region: asia-southeast1
- service: elyra-image-to-3d
- GPU: NVIDIA L4
- max instances: 1
- min instances: 0
- authentication: required
- model: tencent/Hunyuan3D-2mini turbo geometry model

It does not modify the existing Elyra production services.
The first real generation is a geometry validation pass. Texture/rigging is intentionally not enabled yet; visual quality is judged before locking the mother topology.
