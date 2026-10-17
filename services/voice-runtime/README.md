# Local Mandarin speech

Elyra uses Piper `zh_CN-chaowen-medium` to read Chinese AI replies. Admin → Voice can audition, activate, or remove the active voice. Removing it disables speech; model files stay cached for later activation. Custom uploaded reference samples are separate and remain intact.

## Setup (Windows, Python 3.12)

From the repository root:

```powershell
python -m venv services/voice-runtime/.venv
& services/voice-runtime/.venv/Scripts/python.exe -m pip install -r services/voice-runtime/requirements.txt
& services/voice-runtime/.venv/Scripts/python.exe services/voice-runtime/setup_chaowen.py
'{"text":"你好，我是斯坦利。","speed":1}' | & services/voice-runtime/.venv/Scripts/python.exe services/voice-runtime/preview.py --output services/voice-runtime/chaowen-preview.wav --prepare
```

Preparation downloads Chinese phonemization and tokenizer resources. Subsequent API synthesis runs offline. The API starts a persistent Python worker and warms both the voice model and Chinese phonemizer at startup; replies reuse those loaded models. The first request after a restart may wait for warmup. `ELYRA_VOICE_PYTHON` optionally overrides the Python executable. Models and the environment are ignored by Git. Keep the API process running; App → Voice → Read Aloud is the user's playback preference.

This preset supports Mandarin only. Unsupported reply languages do not generate audio. The API accepts up to 3,000 characters per reply and serializes synthesis on this local runtime.

## Isolated CosyVoice 3 trial

This experiment does not select a new App voice. The source checkout, separate environment, downloaded weights and generated WAVs live in ignored `models/` directories.

Use Python 3.12 for the isolated `models/cosyvoice-env` environment. Install CPU PyTorch 2.3.1 and torchaudio 2.3.1 from `https://download.pytorch.org/whl/cpu`, then install `requirements-cosyvoice.txt` inside that environment. `setup_cosyvoice.py` uses the Hugging Face download library (already present in the Piper environment) to fetch public inference files with `token=False`.

```powershell
& services/voice-runtime/.venv/Scripts/python.exe services/voice-runtime/setup_cosyvoice.py
& services/voice-runtime/models/cosyvoice-env/Scripts/python.exe services/voice-runtime/trial_cosyvoice.py
```

The trial uses the locally downloaded listening reference in `models/auditions/nadu-f19685b6.mp3`. It generates the same short Chinese text in ordinary, soft and happy styles, runs offline on four CPU threads, and records model-load time, generation time, output duration and real-time factor in `models/cosyvoice-trials/results.json`. A real-time factor above 1 means synthesis took longer than the audio duration. The first ordinary sample also includes lazy initialization costs, so compare the numbers with that limitation in mind.

## Kokoro 58 preset

`kokoro-zh-zm009` uses speaker ID 58 (`zm_009`) of Kokoro v1.1-zh,
with the official sherpa-onnx INT8 distribution. Chinese and English replies
use the existing hidden App player. Unsupported detected languages stay silent.
Short or ambiguous language identification is heuristic, not a guarantee.
The App UI locale does not choose the speech language.

The separate `models/kokoro-env` environment uses `requirements-kokoro.txt`.
Download `kokoro-int8-multi-lang-v1_1.tar.bz2` from the official sherpa-onnx
`tts-models` release into `models/`, then run `setup_kokoro.py` and
`test_kokoro.py` with that environment's Python. The test records Chinese,
English and mixed WAVs and latency in `models/kokoro-trials/results.json`.
Only successful tests under the latency limit write the readiness marker.
Admin → Voice offers both Kokoro 58 and the original Piper Chaowen preset.
`ELYRA_KOKORO_PYTHON` overrides only the Kokoro interpreter.

Model source: https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh
Distribution: https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models
The original distribution license remains in the extracted model directory.

## Sources

- Model and bundled model card: https://huggingface.co/rhasspy/piper-voices/tree/main/zh/zh_CN/chaowen/medium
- Model card declares CC0 for the dataset and identifies the Xiao Ya fine-tuning origin; retain the original card in `models/chaowen/MODEL_CARD`.
- Piper engine: https://github.com/OHF-Voice/piper1-gpl (GPL-3.0).
