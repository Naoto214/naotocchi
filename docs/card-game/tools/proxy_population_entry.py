#!/usr/bin/env python3
"""Manifest-connected preflight entrance. There is no execute/generate command."""
import argparse
import json
from pathlib import Path
from proxy_population_contract import ROOT, PROTOCOL_PATH, load_json, source_path, canonical
from proxy_population_readiness import preflight


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--manifest', type=Path)
    parser.add_argument('--receipt', type=Path)
    args = parser.parse_args(argv)
    try:
        contract = load_json(source_path(args.root, PROTOCOL_PATH))
        manifest = load_json(args.manifest) if args.manifest else None
        receipt = load_json(args.receipt) if args.receipt else None
        report = preflight(contract, manifest, receipt, args.root)
    except (OSError, ValueError, TypeError) as error:
        print(json.dumps(dict(stage='invalid_input', errors=[str(error)], executable=False), ensure_ascii=False))
        return 2
    print(canonical(report).decode('utf-8'), end='')
    return 1  # This edition never certifies execution or balance admission.


if __name__ == '__main__':
    raise SystemExit(main())
