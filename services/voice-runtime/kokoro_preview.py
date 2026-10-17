"""Resident CPU Kokoro speaker 58 worker, isolated from Piper."""
import json
import sys
import time
import wave
import os
from pathlib import Path

def main():
    import sherpa_onnx
    import soundfile as sf
    models = Path(__file__).resolve().parent / 'models'
    precision = os.environ.get('ELYRA_KOKORO_PRECISION', 'fp32')
    if precision not in {'int8', 'fp32'}:
        raise ValueError('Unsupported Kokoro precision')
    root = models / ('kokoro-multi-lang-v1_1' if precision == 'fp32' else 'kokoro-int8-multi-lang-v1_1')
    config = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
            model=str(root / ('model.onnx' if precision == 'fp32' else 'model.int8.onnx')), voices=str(root / 'voices.bin'),
            tokens=str(root / 'tokens.txt'), data_dir=str(root / 'espeak-ng-data'),
            lexicon=','.join(str(root / name) for name in ['lexicon-us-en.txt', 'lexicon-zh.txt'])),
        num_threads=int(os.environ.get('ELYRA_KOKORO_THREADS', '4')), provider='cpu'), max_num_sentences=1,
        rule_fsts=','.join(str(root / name) for name in ['phone-zh.fst', 'date-zh.fst', 'number-zh.fst']))
    if not config.validate():
        raise RuntimeError('Kokoro model configuration is incomplete')
    started = time.perf_counter()
    tts = sherpa_onnx.OfflineTts(config)
    tts.generate('你好。', sid=58, speed=1)
    print(json.dumps({'ready': True, 'loadSeconds': round(time.perf_counter()-started, 3)}), flush=True)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            text, speed = request['text'], float(request['speed'])
            if not isinstance(text, str) or not 1 <= len(text.strip()) <= 3000 or not .7 <= speed <= 1.3:
                raise ValueError('Invalid speech input')
            started = time.perf_counter()
            audio = tts.generate(text, sid=58, speed=speed)
            if len(audio.samples) < 1000:
                raise RuntimeError('Empty speech output')
            sf.write(request['output'], audio.samples, audio.sample_rate, subtype='PCM_16')
            print(json.dumps({'ok': True, 'generationSeconds': round(time.perf_counter()-started, 3),
                              'audioSeconds': len(audio.samples)/audio.sample_rate}), flush=True)
        except Exception as error:
            print(str(error), file=sys.stderr, flush=True)
            print(json.dumps({'ok': False}), flush=True)

if __name__ == '__main__':
    main()
