"""Compare CPU thread settings with identical speech and audio validation."""
import json
import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
output = root / 'models/kokoro-trials'
results = []
precision = os.environ.get('ELYRA_KOKORO_PRECISION', 'int8')
for threads in [1, 2, 4]:
    with (output / f'benchmark-{threads}.log').open('w', encoding='utf-8') as log:
        worker = subprocess.Popen([sys.executable, '-u', str(root / 'kokoro_preview.py')],
            env={**os.environ, 'ELYRA_KOKORO_THREADS': str(threads), 'ELYRA_KOKORO_PRECISION': precision}, stdin=subprocess.PIPE,
            stdout=subprocess.PIPE, stderr=log, text=True, encoding='utf-8')
        try:
            ready = json.loads(worker.stdout.readline())
            for trial in range(2):
                worker.stdin.write(json.dumps({'text': '我在这里听你说。', 'speed': 1,
                    'output': str(output / f'benchmark-{threads}-{trial}.wav')})+'\n')
                worker.stdin.flush()
                result = json.loads(worker.stdout.readline())
                results.append({'precision': precision, 'threads': threads, 'trial': trial, **result})
                print(json.dumps(results[-1]), flush=True)
        finally:
            worker.stdin.close()
            worker.wait(timeout=10)
    (output / f'benchmark-{precision}.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
