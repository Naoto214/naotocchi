"""Fail-closed owner/public projection and fresh input integrity checks."""
import copy
import hashlib
from pathlib import Path
import proxy_normal_decision_hardening as legacy
from proxy_resource_value_comparison import validate_problem, _hash
from proxy_resource_value_selection import canonical_sha256

BOARD_KEYS={'main','companions','partner','partner_stage','world','prepared'}
RESERVATION_KEYS={'reservation_id','source_instance_id','controller','target_instance_ids',
                  'created_seq','deadline','uses_remaining','status'}

def _reservations(rows):
    result=[]
    for row in rows:
        if isinstance(row,str):result.append(row);continue
        if not isinstance(row,dict) or set(row)!=RESERVATION_KEYS:
            raise ValueError('unsupported public reservation representation')
        deadline=row['deadline']
        if not isinstance(deadline,dict) or set(deadline)!={'kind','round','player'}:
            raise ValueError('unsupported public reservation deadline')
        result.append(copy.deepcopy(row))
    return result

def project_visible(continuation: dict, actor: str) -> dict:
    if actor not in ('A','B'):raise ValueError('invalid actor')
    game=continuation['game_state'];opponent='B' if actor=='A' else 'A'
    cards=game['cards'];players=game['players']
    def reveal(cid):
        if cid is None:return None
        c=cards[cid]
        return {'instance_id':cid, **{k:copy.deepcopy(c[k]) for k in ('card_id','card_copy_id','initial_instance_id')}}
    def board(owner):
        b=players[owner]['board']
        if set(b)!=BOARD_KEYS:raise ValueError('unsupported board representation')
        prepared=[]
        for index,cid in enumerate(b['prepared']):
            c=cards[cid]
            if owner==actor or c.get('public_face_up') is True:
                prepared.append(reveal(cid))
            else:
                entry={'slot':index,'face_down':True}
                if 'public_paid_time' in c:
                    cost=c['public_paid_time']
                    if type(cost) is not int or cost<0:raise ValueError('invalid public prepared cost')
                    entry['paid_time']=cost
                prepared.append(entry)
        return {'main':reveal(b['main']),'companions':[reveal(cid) for cid in b['companions']],
                'partner':reveal(b['partner']),'partner_stage':b['partner_stage'],
                'world':reveal(b['world']),'prepared':prepared}
    view={'information_policy':'public_and_owner_known_only','own_hand':[reveal(cid) for cid in players[actor]['hand']],
        'own_board':board(actor),'opponent_board':board(opponent),
        'growth':{p:players[p]['growth'] for p in ('A','B')},
        'time':{p:players[p]['time'] for p in ('A','B')},
        'discard':{p:[reveal(cid) for cid in players[p]['discard']] for p in ('A','B')},
        'reservations':{p:_reservations(players[p]['reservations']) for p in ('A','B')}}
    errors=legacy.validate_public_information(view)
    if errors:raise ValueError('; '.join(errors))
    return copy.deepcopy(view)

def validate_sources(manifest: dict, data_dir: Path) -> list[str]:
    """Resolve relative manifest paths under the supplied repository/source root."""
    if not isinstance(manifest,dict) or not manifest:return ['source manifest absent']
    root=Path(data_dir).resolve();errors=[]
    for name,expected in manifest.items():
        if not isinstance(name,str) or not name or not _hash(expected):
            errors.append('invalid source reference/hash');continue
        path=(root/name).resolve()
        if Path(name).is_absolute() or not path.is_relative_to(root):
            errors.append('source path escapes root: '+name);continue
        try:
            if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:errors.append('source raw hash differs: '+name)
        except OSError:errors.append('source missing: '+name)
    return errors

def build_problem(view: dict, inventory: dict, evidence: dict, seed_context: dict) -> dict:
    errors=legacy.validate_public_information(view)
    if errors:raise ValueError('; '.join(errors))
    if inventory.get('candidate_set_complete') is not True:raise ValueError('incomplete legal candidates')
    ids=inventory['legal_candidate_ids'];details=inventory['legal_candidate_details']
    if not isinstance(details,list) or any(not isinstance(d,dict) for d in details) or \
            sorted(d.get('candidate_id','') for d in details)!=ids:
        raise ValueError('candidate details do not bind complete inventory')
    sources=evidence.get('source_raw_sha256')
    if not isinstance(sources,dict) or not sources or any(not isinstance(k,str) or not _hash(v) for k,v in sources.items()):
        raise ValueError('source evidence hash manifest absent')
    problem=dict(view_sha256=canonical_sha256(view),legal_candidate_ids=copy.deepcopy(ids),
        candidate_set_evidence=copy.deepcopy(inventory['candidate_set_evidence']),
        candidates=copy.deepcopy(evidence['candidates']),pairs=copy.deepcopy(evidence['pairs']),
        seed_context=copy.deepcopy(seed_context))
    for pair in problem['pairs']:
        if not isinstance(pair,dict) or not isinstance(pair.get('source_refs'),list) or \
                any(ref not in sources for ref in pair['source_refs']):
            raise ValueError('pair source reference is not bound to manifest')
    errors=validate_problem(problem)
    if errors:raise ValueError('; '.join(errors))
    return problem
