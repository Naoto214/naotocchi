"""06 trigger group bookkeeping; occurrence production is a separate proof.

This module neither infers that all triggers were supplied nor selects a card.
No116/463 policy is installed and no strategic or sample eligibility is inferred.
"""
import copy
import hashlib
from proxy_mandatory_policy_contract import ROOT,canonical

SOURCES={'06-action-chain-checkpoint.md':'7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67',
         '119-response-window-contract.md':'c79e89709c687211ae5ca4a2ba3328e285ffafcf9b7790f913ae5ceb953cba45'}
FIELDS={'origin_event_seq','source_instance_id','actor','category','ability_key','source_reference'}


def create(turn_player):
    if turn_player not in ('A','B'):raise ValueError('invalid turn owner')
    for path,digest in SOURCES.items():
        if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:
            raise ValueError('trigger ordering source changed')
    return dict(schema='population_trigger_ledger.v1',turn_player=turn_player,
                source_sha256=copy.deepcopy(SOURCES),occurrences={},journal=[],
                opportunity_completeness_proven=False,strategic_proof=False,
                policy_eligible=None,balance_admitted=None)


def identity(row):
    if type(row) is not dict or set(row)!=FIELDS:
        raise ValueError('occurrence fields differ')
    if type(row['origin_event_seq']) is not int or row['origin_event_seq']<1:
        raise ValueError('occurrence event must be a positive integer')
    if row['actor'] not in ('A','B') or row['category'] not in ('forced','optional'):
        raise ValueError('occurrence owner/category differs')
    if any(type(row[k]) is not str or not row[k] for k in ('source_instance_id','ability_key','source_reference')):
        raise ValueError('occurrence source identity absent')
    return 'trigger-'+hashlib.sha256(canonical(row)).hexdigest()


def observe(ledger,occurrences,chain_status):
    if type(occurrences) is not list or chain_status not in ('empty','building','resolving'):
        raise ValueError('occurrence observation boundary differs')
    result=copy.deepcopy(ledger)
    for row in occurrences:
        key=identity(row)
        if key in result['occurrences']:raise ValueError('duplicate trigger occurrence')
        result['occurrences'][key]=dict(occurrence=copy.deepcopy(row),
            status='deferred' if chain_status=='resolving' else 'pending')
    result['journal'].append(dict(operation='observe',occurrences=copy.deepcopy(occurrences),chain_status=chain_status))
    return result


def release(ledger,chain_link_ids):
    if type(chain_link_ids) is not list or chain_link_ids:
        raise ValueError('post-chain triggers require the entire chain to be empty')
    result=copy.deepcopy(ledger)
    for row in result['occurrences'].values():
        if row['status']=='deferred':row['status']='pending'
    result['journal'].append(dict(operation='release',chain_link_ids=[]))
    return result


def offer(ledger):
    pending={k:r['occurrence'] for k,r in ledger['occurrences'].items() if r['status']=='pending'}
    if not pending:return None
    def rank(row):
        return (0 if row['category']=='forced' else 2)+(row['actor']!=ledger['turn_player'])
    first=min(rank(row) for row in pending.values())
    group={k:r for k,r in pending.items() if rank(r)==first}
    sample=next(iter(group.values()));actions={k:dict(action='activate',occurrence_id=k) for k in group}
    decline=None
    if sample['category']=='optional':
        decline='decline-trigger-group-'+hashlib.sha256(canonical(sorted(group))).hexdigest()
        actions[decline]=dict(action='decline_group',occurrence_ids=sorted(group))
    return dict(actor=sample['actor'],category=sample['category'],group_rank=first,
                candidate_ids=sorted(actions),actions=actions,decline_candidate_id=decline,
                enumeration_scope='supplied_pending_occurrences_only',
                opportunity_completeness_proven=False,policy_eligible=None)


def consume(ledger,candidate_id):
    current=offer(ledger)
    if current is None or type(candidate_id) is not str or candidate_id not in current['actions']:
        raise ValueError('choice is not in the current trigger group')
    result=copy.deepcopy(ledger);action=current['actions'][candidate_id]
    if action['action']=='activate':
        result['occurrences'][action['occurrence_id']]['status']='activated'
    else:
        for key in action['occurrence_ids']:result['occurrences'][key]['status']='declined'
    result['journal'].append(dict(operation='consume',candidate_id=candidate_id,offer=current))
    # Actual activation/payment must be independently verified by the caller.
    # This status is journal bookkeeping, not an execution receipt or once-use.
    return result


def audit(record):
    try:
        expected=create(record['turn_player'])
        for row in record['journal']:
            if row['operation']=='observe':expected=observe(expected,row['occurrences'],row['chain_status'])
            elif row['operation']=='release':expected=release(expected,row['chain_link_ids'])
            elif row['operation']=='consume':expected=consume(expected,row['candidate_id'])
            else:raise ValueError('unknown journal operation')
        if canonical(expected)!=canonical(record):raise ValueError('trigger journal canonical reconstruction differs')
        return []
    except (ValueError,TypeError,KeyError,OSError) as error:
        return [str(error)]
