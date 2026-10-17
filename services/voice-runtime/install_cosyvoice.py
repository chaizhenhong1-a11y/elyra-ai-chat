"""Install CPU-only trial dependencies with IPv4 and resumable downloads."""
from pathlib import Path
import socket
import sys
import os
from pip._internal.cli.main import main

os.environ.pop('PIP_BUILD_CONSTRAINT', None)

_getaddrinfo = socket.getaddrinfo
def ipv4_addresses(host, port, family=0, type=0, proto=0, flags=0):
    return _getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = ipv4_addresses
arguments = ["install", "--timeout", "20", "--retries", "2", "--resume-retries", "3"]
arguments += ['--build-constraint', str(Path(__file__).with_name('cosyvoice-build-constraints.txt'))]
if "--mkl-only" in sys.argv:
    arguments += ["mkl==2021.4.0", "--index-url", "https://mirrors.aliyun.com/pypi/simple"]
elif "--runtime-only" in sys.argv:
    arguments += ["torch==2.3.1+cpu", "torchaudio==2.3.1+cpu", "--index-url", "https://mirrors.aliyun.com/pypi/simple", "--extra-index-url", "https://download.pytorch.org/whl/cpu"]
else:
    arguments += ["-r", str(Path(__file__).with_name("requirements-cosyvoice.txt")), "--index-url", "https://pypi.org/simple"]
raise SystemExit(main(arguments))
