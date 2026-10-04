"""463 pure supplied-material arithmetic. No entropy, state execution or admission."""
import hashlib
import hmac
from proxy_mandatory_policy_contract import canonical

POLICY_ID = 'mandatory_random_policy.v1'
KINDS = frozenset({'egg_exchange_bottom', 'ability_hand_bottom',
                   'ability_draw_then_hand_bottom', 'final_time_hand_bottom',
                   'ability_topdeck_order'})
MAX_COUNTER = 2**32 - 1


class RandomnessExhausted(ValueError):
    """No accepted block in the contract's counter domain; never fall back."""


def _integer(value, low, high):
    return type(value) is int and low <= value <= high


def _identifier(value):
    return type(value) is str and bool(value.strip())


def _inputs(root_hex, context, ids):
    if (type(root_hex) is not str or len(root_hex) != 64 or
            any(c not in '0123456789abcdef' for c in root_hex)):
        raise ValueError('supplied root must be 32-byte lowercase hex')
    if type(context) is not dict or set(context) != {
            'protocol_id', 'group_id', 'owner', 'mirror_side', 'opportunity_address'}:
        raise ValueError('context fields differ')
    canonical(context)
    if not all(_identifier(context[k]) for k in ('protocol_id', 'group_id')):
        raise ValueError('protocol/group identity missing')
    if context['owner'] not in ('A', 'B') or context['mirror_side'] not in ('A_first', 'B_first'):
        raise ValueError('owner/mirror side differs')
    o = context['opportunity_address']
    if type(o) is not list or len(o) != 8:
        raise ValueError('eight-element opportunity address required')
    if (o[0] not in ('A', 'B') or o[2] != context['owner'] or
            not _integer(o[1], 1, 2**256) or
            o[3] not in ('turn_start', 'effect_resolution') or
            not _integer(o[4], 0, 2**256) or
            type(o[5]) is not str or o[5] not in KINDS or
            o[6] != 'selection' or type(o[7]) is not int or o[7] != 0):
        raise ValueError('opportunity types/registry differ')
    if o[5] == 'egg_exchange_bottom':
        if o[3] != 'turn_start' or o[4] != 0 or o[0] != o[2]:
            raise ValueError('egg origin differs')
    elif o[3] != 'effect_resolution' or o[4] < 1:
        raise ValueError('effect origin differs')
    if (type(ids) is not list or not ids or
            not all(_identifier(i) for i in ids) or
            ids != sorted(set(ids)) or len(ids) > 2**256):
        raise ValueError('complete supplied candidate IDs must be sorted and unique')
    canonical(ids)


def rejection_index(block, count):
    if type(block) is not bytes or len(block) != 32 or not _integer(count, 2, 2**256):
        raise ValueError('256-bit block and candidate count >=2 required')
    x = int.from_bytes(block, 'big')
    threshold = 2**256 - (2**256 % count)
    return x % count if x < threshold else None


def build_proof(root_hex, context, ids):
    """Produce arithmetic evidence, NOT proof of legal completeness or origin."""
    _inputs(root_hex, context, ids)
    count = len(ids)
    digest = hashlib.sha256(canonical(ids)).hexdigest()
    random_proof = None
    index = 0
    if count > 1:
        mirror = canonical(['MRP.v1/mirror', context['protocol_id'], context['group_id'],
                            context['owner'], context['mirror_side']])
        key = hmac.digest(bytes.fromhex(root_hex), mirror, 'sha256')
        blocks = []
        for counter in range(MAX_COUNTER + 1):
            message = canonical(['MRP.v1/draw', POLICY_ID, context['opportunity_address'],
                                 digest, count, counter])
            block = hmac.digest(key, message, 'sha256')
            blocks.append(dict(counter=counter, message_hex=message.hex(), digest_hex=block.hex()))
            index = rejection_index(block, count)
            if index is not None:
                break
        else:
            raise RandomnessExhausted('counter domain exhausted')
        random_proof = dict(mirror_side=context['mirror_side'], mirror_message_hex=mirror.hex(),
                            mirror_key_commitment=hashlib.sha256(key).hexdigest(),
                            draw_blocks=blocks, threshold_decimal=str(2**256 - 2**256 % count),
                            accepted_counter=counter, selected_index=index)
    return dict(schema='mandatory_random_arithmetic_464.v1', policy_id=POLICY_ID,
                candidate_count=count, candidate_digest=digest,
                selection_basis='planned_policy_random' if count > 1 else 'supplied_singleton',
                strategy_basis='unproved' if count > 1 else 'singleton_completeness_unverified',
                strategic_unproven=True if count > 1 else None, optimality_claim=False, equivalence_claim=False,
                rational_probability=dict(numerator=1, denominator=count),
                random_proof=random_proof, selected_index=index, selected_candidate=ids[index],
                nonselected_candidates=[i for i in ids if i != ids[index]])


def validate_proof(proof, root_hex, context, ids):
    errors = []
    try:
        expected = build_proof(root_hex, context, ids)
        if canonical(proof) != canonical(expected):
            errors.append('arithmetic proof values/types differ')
    except ValueError as error:
        errors.append(str(error))
    return dict(randomness_verified=not errors, errors=errors,
                checks_scope='supplied_material_arithmetic_only', policy_eligible=None,
                balance_admitted=None)
