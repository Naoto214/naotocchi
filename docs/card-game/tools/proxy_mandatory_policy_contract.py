"""Authenticated 463 approval overlay; no input generation or execution authority."""
import hashlib
import json
from pathlib import Path
from proxy_population_contract import source_path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = 'data/proxy-mandatory-policy-contract-464/contract.json'
CONTRACT_SHA256 = 'e032bb569cf11e2be8e5f89bd02914742c8b42d7b632fef9b09826ea60b31250'


def canonical(value):
    def check(v):
        if v is None or type(v) in (bool, int):
            return
        if type(v) is str:
            v.encode('utf-8')
        elif type(v) is list:
            for item in v:
                check(item)
        elif type(v) is dict:
            for key, item in v.items():
                if type(key) is not str:
                    raise ValueError('JSON keys must be strings')
                check(key)
                check(item)
        else:
            raise ValueError('unsupported JSON type')
    try:
        check(value)
        return json.dumps(value, ensure_ascii=False, sort_keys=True,
                          separators=(',', ':'), allow_nan=False).encode('utf-8')
    except (UnicodeError, TypeError, OverflowError, RecursionError) as error:
        raise ValueError('invalid canonical value') from error


def load_json(path):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('duplicate JSON key')
            result[key] = value
        return result
    def forbidden(_):
        raise ValueError('float/nonfinite JSON forbidden')
    try:
        result = json.loads(Path(path).read_text(encoding='utf-8'),
                            object_pairs_hook=pairs, parse_float=forbidden,
                            parse_constant=forbidden)
    except RecursionError as error:
        raise ValueError('JSON nesting exceeds parser capacity') from error
    if type(result) is not dict:
        raise ValueError('JSON object required')
    canonical(result)
    return result


def validate_contract(contract, root=ROOT):
    errors = []
    try:
        anchor = source_path(root, CONTRACT_PATH)
        if hashlib.sha256(anchor.read_bytes()).hexdigest() != CONTRACT_SHA256:
            raise ValueError('contract anchor differs')
        expected = load_json(anchor)
        if canonical(contract) != canonical(expected):
            errors.append('contract values/types differ')
        for name, digest in expected['sources_sha256'].items():
            if hashlib.sha256(source_path(root, name).read_bytes()).hexdigest() != digest:
                errors.append('source differs: ' + name)
    except (ValueError, OSError) as error:
        errors.append(str(error))
    return dict(valid=not errors, errors=errors, checks_scope='contract_and_sources_only',
                policy_eligible=None, balance_admitted=None, execution_authorized=False)
