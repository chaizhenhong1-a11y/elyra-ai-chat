"""Check local speaker 58 CPU latency before enabling the App preset."""
import json
import subprocess
import sys
import time
import wave
from pathlib import Path

root = Path(__file__).resolve().parent
output = root / 'models/kokoro-trials'
output.mkdir(exist_ok=True)
with (output / 'worker.log').open('w', encoding='utf-8') as log:
    worker = subprocess.Popen([sys.executable, '-u', str(root / 'kokoro_preview.py')], stdin=subprocess.PIPE,
                              stdout=subprocess.PIPE, stderr=log, text=True, encoding='utf-8')
    try:
        ready = json.loads(worker.stdout.readline())
        assert ready.get('ready'), ready
        results = {'loadSeconds': ready['loadSeconds'], 'speaker': 58, 'quantization': 'int8', 'results': []}
        for name, text in [('chinese', '今天过得怎么样？我在这里听你说。'),
                           ('english', 'How was your day? I am here to listen.'),
                           ('mixed', '你好，Stanley。How was your day?')]:
            target = output / f'{name}.wav'
            start = time.perf_counter()
            worker.stdin.write(json.dumps({'text': text, 'speed': 1, 'output': str(target)}) + '\n')
            worker.stdin.flush()
            result = json.loads(worker.stdout.readline())
            assert result.get('ok'), result
            with wave.open(str(target)) as wav:
                assert wav.getnframes() > 1000 and wav.getframerate() == 24000
            results['results'].append({'name': name, 'text': text, 'requestSeconds': round(time.perf_counter()-start, 3), **result})
        (output / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(results, ensure_ascii=False), flush=True)
        if max(item['requestSeconds'] for item in results['results']) > 10:
            raise RuntimeError('CPU latency is too high: do not activate automatically')
        (root / 'models/kokoro-int8-multi-lang-v1_1/ready.json').write_text(json.dumps({'speaker': 58, 'tested': True}), encoding='utf-8')
    finally:
        worker.stdin.close()
        try:
            worker.wait(timeout=10)
        except subprocess.TimeoutExpired:
            worker.kill()
