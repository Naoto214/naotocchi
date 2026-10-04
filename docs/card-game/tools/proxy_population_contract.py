"""Read-only 459 protocol and manifest validation; never authorizes execution."""
import hashlib
import json
import math
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
PROTOCOL_PATH = 'data/proxy-admission-contract-459/contract.json'
PROTOCOL_SHA256 = '165af27159ccdf4d8fc3ec5ede988075edbc3d8fd331daa994d872fb162a679a'


def canonical(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2,
                       allow_nan=False) + '\n').encode('utf-8')


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate JSON key: ' + key)
        result[key] = value
    return result


def _nonfinite(value):
    raise ValueError('nonfinite JSON number: ' + value)


def _finite_float(value):
    number = float(value)
    if not math.isfinite(number):
        raise ValueError('nonfinite JSON number: ' + value)
    return number


def load_json(path: Path) -> dict:
    result = json.loads(Path(path).read_text(encoding='utf-8'),
                        object_pairs_hook=_pairs, parse_constant=_nonfinite,
                        parse_float=_finite_float)
    if type(result) is not dict:
        raise ValueError('JSON root must be an object')
    return result


def source_path(root: Path, name: str) -> Path:
    if type(name) is not str or not name or '\\' in name:
        raise ValueError('invalid source path')
    path = PurePosixPath(name)
    if path.is_absolute() or any(p in ('', '.', '..') for p in name.split('/')):
        raise ValueError('source path must be normalized and relative')
    root = Path(root).resolve()
    result = (root / name).resolve()
    if not result.is_relative_to(root):
        raise ValueError('source path escapes root')
    return result


def validate_protocol(contract: dict, root: Path = ROOT) -> dict:
    if type(contract) is not dict:
        raise ValueError('protocol must be a dict')
    errors = []
    try:
        path = source_path(root, PROTOCOL_PATH)
        if hashlib.sha256(path.read_bytes()).hexdigest() != PROTOCOL_SHA256:
            raise ValueError('459 protocol anchor differs')
        approved = load_json(path)
        if canonical(contract) != canonical(approved):
            errors.append('protocol differs from approved 459 values or types')
        # Read pins only from the authenticated anchor, never the caller's map.
        for name, digest in approved['sources_sha256'].items():
            try:
                if hashlib.sha256(source_path(root, name).read_bytes()).hexdigest() != digest:
                    errors.append('source hash differs: ' + name)
            except (OSError, ValueError) as error:
                errors.append('source unavailable: ' + name + ': ' + str(error))
        source_path(root, approved['selected_package']['decks_reference'])
    except (OSError, ValueError, TypeError) as error:
        errors.append(str(error))
    return dict(stage='protocol', valid=not errors, errors=errors,
                balance_admitted=None, executable=False)


def _identifier(value):
    return type(value) is str and bool(value.strip())


def _sha(value):
    return type(value) is str and len(value) == 64 and all(c in '0123456789abcdef' for c in value)


def validate_membership(groups, matches, execution_order) -> list[str]:
    """Topology only: successful validation says nothing about actual inputs."""
    errors = []
    if type(groups) is not list or type(matches) is not list or type(execution_order) is not list:
        return ['membership lists missing']
    if len(groups) != 200 or len(matches) != 400:
        errors.append('requires exactly 200 groups and 400 matches')
    group_ids = [g.get('group_id') if type(g) is dict else None for g in groups]
    match_ids = [m.get('match_id') if type(m) is dict else None for m in matches]
    if not all(_identifier(i) for i in group_ids + match_ids):
        return errors + ['invalid group or match identity']
    if len(set(group_ids)) != len(group_ids) or len(set(match_ids)) != len(match_ids):
        errors.append('duplicate group or match identity')
    expected_order = []
    for index, group_id in enumerate(group_ids, 1):
        rows = [m for m in matches if m.get('group_id') == group_id]
        if len(rows) != 2 or sorted(str(m.get('first_player')) for m in rows) != ['A', 'B']:
            errors.append('mirror membership differs: ' + group_id)
            continue
        by_first = {m['first_player']: m for m in rows}
        if canonical(by_first['A'].get('policy_versions')) != canonical(by_first['B'].get('policy_versions')):
            errors.append('mirror policies differ: ' + group_id)
        expected_order.extend(by_first[a]['match_id'] for a in ('AB' if index % 2 else 'BA'))
    if any(m.get('group_id') not in group_ids for m in matches):
        errors.append('unplanned group reference')
    if execution_order != expected_order:
        errors.append('execution order differs from fixed odd/even mirror order')
    return errors


def validate_order(order, seed, original) -> list[str]:
    """Recompute a supplied order, never sample seeds or create an experiment."""
    from collections import Counter
    from proxy_normal_decision_first_choice_audit import shuffle_deck
    if type(seed) is not int or not 0 <= seed < 2**128:
        return ['seed must be an exact unsigned 128bit integer']
    if type(order) is not list or len(order) != 40:
        return ['full 40-card order missing']
    fields = {'card_copy_id', 'card_id', 'initial_instance_id'}
    if any(type(r) is not dict or set(r) != fields or
           not all(_identifier(v) for v in r.values()) for r in order):
        return ['order identity fields differ']
    if Counter(canonical(r) for r in order) != Counter(canonical(r) for r in original):
        return ['order physical inventory differs']
    if canonical(order) != canonical(shuffle_deck(original, seed)):
        return ['order differs from supplied seed reconstruction']
    return []


def validate_manifest(manifest, receipt, contract: dict, root: Path = ROOT) -> dict:
    """Structural checks are useful before a future authenticated lock exists.

    No approval receipt is trusted in this edition: 459 explicitly left it
    unissued. Never treat a caller's timestamp/hash/approved flag as authority.
    """
    errors = list(validate_protocol(contract, root)['errors'])
    gaps = ['input_lock_authentication_unavailable',
            'generation_provenance_verifier_unavailable',
            'historical_registry_verifier_unavailable',
            'execution_source_edition_unfixed']
    if manifest is None:
        errors.append('manifest not supplied')
    elif type(manifest) is not dict:
        raise ValueError('manifest must be a dict or None')
    elif not errors:
        approved = load_json(source_path(root, PROTOCOL_PATH))
        spec = approved['future_manifest_contract']
        if set(manifest) != {'schema', *spec['required_top_fields']} or manifest.get('schema') != spec['schema']:
            errors.append('manifest schema or fields differ')
        errors.extend(validate_membership(manifest.get('groups'), manifest.get('matches'),
                                          manifest.get('execution_order')))
        if manifest.get('protocol_sha256') != PROTOCOL_SHA256:
            errors.append('manifest protocol hash differs')
        if type(manifest.get('python_version')) is not str or not manifest['python_version']:
            errors.append('Python version missing')
        if not _sha(manifest.get('historical_registry_sha256')):
            errors.append('historical registry digest missing')
        versions = manifest.get('source_versions')
        if type(versions) is not dict or not versions or any(not _sha(h) for h in versions.values()):
            errors.append('source versions missing or malformed')
        else:
            for name, digest in versions.items():
                try:
                    if hashlib.sha256(source_path(root, name).read_bytes()).hexdigest() != digest:
                        errors.append('execution source differs: ' + name)
                except (OSError, ValueError) as error:
                    errors.append('execution source unavailable: ' + str(error))
        fixture_name = 'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json'
        originals = {p['player_id']: p['deck_order_top_to_bottom'] for p in
                     load_json(source_path(root, fixture_name))['input']['players']}
        groups = manifest.get('groups')
        groups = groups if type(groups) is list else []
        indexed = {}
        for group in groups:
            if type(group) is not dict:
                continue  # membership already reports malformed rows
            label = str(group.get('group_id'))
            if set(group) != set(spec['group_fields']):
                errors.append('group fields missing (including seeds/orders): ' + label)
            for actor in 'AB':
                errors.extend(label + ':' + actor + ':' + e for e in
                              validate_order(group.get('full_order_' + actor), group.get('seed_' + actor), originals[actor]))
            if type(group.get('seed_A')) is int and group.get('seed_A') == group.get('seed_B'):
                errors.append('within-pair equal seeds: ' + label)
            if not _identifier(group.get('generation_attempt_ref')):
                errors.append('generation attempt reference missing: ' + label)
            if _identifier(group.get('group_id')):
                indexed[group['group_id']] = group
        matches = manifest.get('matches')
        for row in matches if type(matches) is list else []:
            if type(row) is not dict:
                continue
            if set(row) != set(spec['match_fields']):
                errors.append('match fields differ')
            expected_policy = {k: approved['selected_package'][k + '_policy'] for k in ('normal', 'mandatory', 'response')}
            if row.get('policy_versions') != expected_policy:
                errors.append('match policy differs from approved package')
            group = indexed.get(row.get('group_id')) if type(row.get('group_id')) is str else None
            if group is not None and all(type(group.get('full_order_' + a)) is list for a in 'AB'):
                payload = dict(first_player=row.get('first_player'),
                               players=[dict(player_id=a, deck_order_top_to_bottom=group['full_order_' + a]) for a in 'AB'])
                if row.get('input_sha256') != hashlib.sha256(canonical(payload)).hexdigest():
                    errors.append('match input digest differs (owners/seats/orders)')
            elif not _sha(row.get('input_sha256')):
                errors.append('match input digest missing')
    return dict(stage='manifest', structurally_valid=not errors, valid=False,
                checks_scope='implemented_structure_only_not_full_manifest_certification',
                errors=errors, gaps=gaps, balance_admitted=None, executable=False)
