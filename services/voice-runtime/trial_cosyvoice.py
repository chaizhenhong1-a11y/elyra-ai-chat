"""Offline CPU comparison. Does not change Elyra's active voice/provider."""
import os
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["CUDA_VISIBLE_DEVICES"] = ""
import json
from pathlib import Path
import sys
import time
import random

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "models" / "cosyvoice-source"
sys.path[:0] = [str(SOURCE), str(SOURCE / "third_party" / "Matcha-TTS")]

def main():
    import torch
    import soundfile as sf
    import numpy as np
    import yaml
    import cosyvoice.cli.cosyvoice as engine
    import cosyvoice.llm.llm as llm
    from transformers import Qwen2Config, Qwen2ForCausalLM
    # The inference checkpoint strictly replaces every LLM parameter. Build the
    # identical architecture from config, avoiding a redundant base-weight download.
    def encoder_init(self, pretrain_path):
        torch.nn.Module.__init__(self)
        self.model = Qwen2ForCausalLM(Qwen2Config.from_pretrained(pretrain_path, local_files_only=True))
    llm.Qwen2Encoder.__init__ = encoder_init
    original_loader = engine.load_hyperpyyaml
    def inference_config(stream, *args, **kwargs):
        document = yaml.compose(stream)
        keep = {"sample_rate", "llm_input_size", "llm_output_size", "spk_embed_dim", "qwen_pretrain_path", "token_frame_rate", "token_mel_ratio", "chunk_size", "num_decoding_left_chunks", "llm", "flow", "hift", "get_tokenizer", "allowed_special", "feat_extractor"}
        document.value = [(key, value) for key, value in document.value if key.value in keep or key.value.startswith("__set_seed")]
        return original_loader(yaml.serialize(document), *args, **kwargs)
    engine.load_hyperpyyaml = inference_config
    torch.set_num_threads(4)
    torch.set_num_interop_threads(1)
    model_dir = ROOT / "models" / "cosyvoice3"
    assert (model_dir / "cosyvoice3.yaml").exists(), "Run setup_cosyvoice.py first"
    output = ROOT / "models" / "cosyvoice-trials"
    output.mkdir(exist_ok=True)
    reference = ROOT / "models" / "auditions" / "nadu-f19685b6.mp3"
    metadata = json.loads(reference.with_suffix(".json").read_text(encoding="utf-8-sig"))
    samples, rate = sf.read(reference, dtype="float32")
    prompt = output / "reference.wav"
    sf.write(prompt, samples, rate)
    started = time.perf_counter()
    voice = engine.AutoModel(model_dir=str(model_dir), fp16=False)
    report = {"device": "CPU", "threads": 4, "modelLoadSeconds": round(time.perf_counter()-started, 2),
              "text": "今天过得怎么样？我在这里听你说。", "reference": metadata["source"], "results": []}
    print(json.dumps({"modelLoaded": True, "seconds": report["modelLoadSeconds"]}), flush=True)
    for style in ["normal", "soft", "happy"]:
        torch.manual_seed(0)
        random.seed(0)
        np.random.seed(0)
        print(json.dumps({"generating": style}), flush=True)
        begin = time.perf_counter()
        if style == "normal":
            generator = voice.inference_zero_shot(report["text"], "You are a helpful assistant.<|endofprompt|>"+metadata["text"], str(prompt), stream=False, text_frontend=False)
        else:
            direction = "Please say a sentence in a very soft voice." if style == "soft" else "请非常开心地说一句话。"
            generator = voice.inference_instruct2(report["text"], "You are a helpful assistant. "+direction+"<|endofprompt|>", str(prompt), stream=False, text_frontend=False)
        segments = [piece["tts_speech"].cpu() for piece in generator]
        elapsed = time.perf_counter()-begin
        audio = torch.cat(segments, dim=1).squeeze(0).numpy()
        sf.write(output / f"{style}.wav", audio, voice.sample_rate)
        duration = len(audio)/voice.sample_rate
        result = {"style": style, "generationSeconds": round(elapsed, 2), "audioSeconds": round(duration, 2), "rtf": round(elapsed/duration, 2)}
        report["results"].append(result)
        (output / "results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(result), flush=True)

if __name__ == "__main__":
    main()
