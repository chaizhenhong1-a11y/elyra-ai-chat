# Step 22 Fix — OpenAI Photo → Character Profile → Blender

This patch replaces the Step 22 OpenRouter vision call with the OpenAI Responses API.

Required `services/api/.env` values:

```env
OPENAI_API_KEY="your-existing-openai-key"
ELYRA_CHARACTER_VISION_MODEL="gpt-6-luna"
BLENDER_PATH="C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe"
```

`OPENROUTER_API_KEY` is not used.

Admin flow stays the same: upload portrait → Generate Character → OpenAI extracts a non-identifying visual Character Profile → Blender pipeline runs automatically when the approved `assets/character/elyra-cute-base.blend` exists.

Until that approved base mesh exists, generation intentionally returns `awaiting_base_mesh` after the OpenAI profile is saved.
