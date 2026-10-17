"""Local, Chinese-only Piper synthesis. Text arrives over stdin, never a shell."""
import argparse
import json
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL = ROOT / "models" / "chaowen" / "zh_CN-chaowen-medium.onnx"


def main():
    from piper import PiperVoice, SynthesisConfig

    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--worker", action="store_true")
    parser.add_argument("--prepare", action="store_true")
    args = parser.parse_args()
    if args.worker:
        import io
        voice = PiperVoice.load(str(MODEL), download_dir=ROOT / "models")
        # Also initialize the lazily loaded Chinese phonemizer before requests arrive.
        with wave.open(io.BytesIO(), "wb") as warmup:
            voice.synthesize_wav("你好。", warmup)
        print(json.dumps({"ready": True}), flush=True)
        for line in sys.stdin:
            try:
                request = json.loads(line)
                text = request["text"]
                speed = float(request["speed"])
                if not isinstance(text, str) or not 1 <= len(text.strip()) <= 3000 or not 0.7 <= speed <= 1.3:
                    raise ValueError("Invalid synthesis input")
                with wave.open(request["output"], "wb") as output:
                    voice.synthesize_wav(text, output, syn_config=SynthesisConfig(length_scale=1 / speed))
                print(json.dumps({"ok": True}), flush=True)
            except Exception:
                print(json.dumps({"ok": False}), flush=True)
        return
    if args.output is None:
        parser.error("--output is required unless --worker is used")
    payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    text = payload.get("text", "")
    speed = float(payload.get("speed", 1))
    if not isinstance(text, str) or not 1 <= len(text.strip()) <= 3000 or not 0.7 <= speed <= 1.3:
        raise ValueError("Expected 1–3000 characters and speed between 0.7 and 1.3")
    voice = PiperVoice.load(str(MODEL), download_dir=ROOT / "models")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(args.output), "wb") as output:
        voice.synthesize_wav(text, output, syn_config=SynthesisConfig(length_scale=1 / speed))
    with wave.open(str(args.output), "rb") as output:
        duration = output.getnframes() / output.getframerate()
        if output.getnframes() < 1000:
            raise RuntimeError("Synthesis returned empty audio")
        print(json.dumps({"sampleRate": output.getframerate(), "duration": round(duration, 2)}))
    if args.prepare:
        (ROOT / "models" / "chaowen" / "ready.json").write_text(json.dumps({"preset": "zh_CN-chaowen-medium", "sampleRate": 22050}), encoding="utf-8")


if __name__ == "__main__":
    main()
