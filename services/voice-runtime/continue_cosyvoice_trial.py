"""Unattended isolated trial; records failures without changing the active app voice."""
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PYTHON = ROOT / 'models/cosyvoice-env/Scripts/python.exe'
OUTPUT = ROOT / 'models/cosyvoice-trials'
OUTPUT.mkdir(exist_ok=True)

def status(stage, **details):
    data = {'stage': stage, 'updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'), **details}
    (OUTPUT / 'status.json').write_text(json.dumps(data, indent=2), encoding='utf-8')
    print(json.dumps(data), flush=True)

def run(script, *args):
    for attempt in range(1, 4):
        status(script, attempt=attempt)
        with (OUTPUT / (script + '.log')).open('a', encoding='utf-8') as log:
            result = subprocess.run([str(PYTHON), '-u', str(ROOT / script), *args], stdout=log, stderr=subprocess.STDOUT)
        if result.returncode == 0:
            return
    raise RuntimeError(f'{script} failed; see its log')

try:
    run('install_cosyvoice.py', '--runtime-only')
    run('install_cosyvoice.py')
    status('waiting-for-model-download')
    deadline = time.monotonic() + 6 * 3600
    required = ['llm.pt', 'flow.pt', 'hift.pt', 'speech_tokenizer_v3.onnx', 'campplus.onnx']
    while not all((ROOT / 'models/cosyvoice3' / name).exists() for name in required):
        if time.monotonic() > deadline:
            raise TimeoutError('Model download did not finish within six hours')
        time.sleep(30)
    status('generating-trial')
    with (OUTPUT / 'generation.log').open('w', encoding='utf-8') as log:
        result = subprocess.run([str(PYTHON), '-u', str(ROOT / 'trial_cosyvoice.py')], stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError('Trial generation failed; see generation.log')
    status('complete')
except Exception as error:
    status('failed', error=str(error))
    raise
