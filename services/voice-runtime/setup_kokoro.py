"""Extract the official INT8 distribution, retaining its license and all resources."""
import tarfile
import time
import sys
from pathlib import Path

root = Path(__file__).resolve().parent / 'models'
name = 'kokoro-multi-lang-v1_1' if '--fp32' in sys.argv else 'kokoro-int8-multi-lang-v1_1'
expected_size = 364816464 if '--fp32' in sys.argv else 147031220
archive = root / f'{name}.tar.bz2'
deadline = time.monotonic() + 1800
while not archive.exists() or archive.stat().st_size != expected_size:
    if time.monotonic() > deadline:
        raise TimeoutError('Kokoro archive download is incomplete')
    time.sleep(5)
with tarfile.open(archive, 'r:bz2') as model:
    for member in model.getmembers():
        target = (root / member.name).resolve()
        if not target.is_relative_to(root.resolve()) or not (member.name == name or member.name.startswith(name+'/')):
            raise ValueError('Unexpected archive member')
    model.extractall(root, filter='data')
print(f'Official {name} model extracted. Test before activation.', flush=True)
