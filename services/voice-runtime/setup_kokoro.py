"""Extract the official INT8 distribution, retaining its license and all resources."""
import tarfile
import time
from pathlib import Path

root = Path(__file__).resolve().parent / 'models'
archive = root / 'kokoro-int8-multi-lang-v1_1.tar.bz2'
deadline = time.monotonic() + 1800
while not archive.exists() or archive.stat().st_size != 147031220:
    if time.monotonic() > deadline:
        raise TimeoutError('Kokoro archive download is incomplete')
    time.sleep(5)
with tarfile.open(archive, 'r:bz2') as model:
    for member in model.getmembers():
        target = (root / member.name).resolve()
        if not target.is_relative_to(root.resolve()) or not (member.name == 'kokoro-int8-multi-lang-v1_1' or member.name.startswith('kokoro-int8-multi-lang-v1_1/')):
            raise ValueError('Unexpected archive member')
    model.extractall(root, filter='data')
print('Official Kokoro INT8 model extracted. Run test_kokoro.py before activation.', flush=True)
