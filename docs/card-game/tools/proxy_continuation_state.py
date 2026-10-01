"""Versioned, explicit runtime state. Historical five-field payload is unchanged."""
import copy
from proxy_resource_value_selection import canonical_sha256
from proxy_resource_value_inputs import project_visible
import proxy_start_response_138 as legacy

SCHEMA = 'naotocchi.card_game.continuation_envelope.v1'
CONTRACT = 'continuation_contract_v1'
PAYLOAD_KEYS = {'game_state', 'response_context', 'activation_zone', 'pending_triggers', 'return_target'}
RUNTIME_KEYS = {'attachments', 'ability_uses', 'public_prepared'}


def _int(value, minimum=0):
    return type(value) is int and value >= minimum


def create(continuation, event_seq):
    result = dict(schema=SCHEMA, execution_contract_id=CONTRACT, event_seq=event_seq,
                  legacy_continuation=legacy._payload(continuation),
                  runtime=dict(attachments={}, ability_uses=[], public_prepared={}))
    validate(result)
    return result


def validate(envelope):
    if set(envelope) != {'schema','execution_contract_id','event_seq','legacy_continuation','runtime'} or \
            envelope['schema'] != SCHEMA or envelope['execution_contract_id'] != CONTRACT or \
            not _int(envelope['event_seq']):
        raise ValueError('invalid continuation envelope')
    payload = envelope['legacy_continuation']; runtime = envelope['runtime']
    if set(payload) != PAYLOAD_KEYS or set(runtime) != RUNTIME_KEYS:
        raise ValueError('unknown payload/runtime fields')
    game = payload['game_state']; cards = game['cards']; players = game['players']
    if set(players) != {'A','B'} or game['turn_player'] not in players or not _int(game['round'], 1):
        raise ValueError('invalid game context')
    if not isinstance(runtime['attachments'], dict) or not isinstance(runtime['public_prepared'], dict) or not isinstance(runtime['ability_uses'], list):
        raise ValueError('invalid runtime collections')
    located = []; prepared = {}; persons = {}
    for actor, player in players.items():
        b = player['board']
        if set(b) != {'main','companions','partner','partner_stage','world','prepared'}:
            raise ValueError('unsupported board representation')
        if not _int(player['time']) or not _int(player['growth']) or len(b['prepared']) > 3:
            raise ValueError('invalid player resources')
        persons[actor] = {s for s in [b['main'], *b['companions'], b['partner']] if s}
        for zone in ('hand','deck','discard'):
            located.extend(player[zone])
        located.extend(s for s in [b['main'], *b['companions'], b['partner']] if s); located.extend(b['prepared'])
        if b['world']: located.append(b['world'])
        for s in b['prepared']:
            prepared[s] = actor
    located.extend(link['source_instance_id'] for link in payload['activation_zone'])
    if len(located) != len(set(located)) or any(s not in cards for s in located):
        raise ValueError('duplicate or missing card location')
    for instance, card in cards.items():
        if not isinstance(card, dict) or not all(isinstance(card.get(k), str) and card[k]
                for k in ('card_id','card_copy_id','initial_instance_id')):
            raise ValueError('invalid card identity')
    if set(runtime['public_prepared']) != set(prepared):
        raise ValueError('prepared metadata coverage differs')
    for source, row in runtime['public_prepared'].items():
        if set(row) != {'controller','face_up','paid_time','placed_event_seq'} or row['controller'] != prepared[source] or \
                type(row['face_up']) is not bool or not _int(row['paid_time']) or \
                not _int(row['placed_event_seq']) or row['placed_event_seq'] > envelope['event_seq']:
            raise ValueError('invalid public prepared metadata')
        if row['face_up'] != (source in runtime['attachments']):
            raise ValueError('face-up equipment must have a target relation')
    for source, row in runtime['attachments'].items():
        if set(row) != {'controller','target_instance_id','attached_event_seq'} or \
                source not in prepared or row['controller'] != prepared[source] or \
                row['target_instance_id'] not in persons[row['controller']] or \
                not cards[source]['card_id'].startswith('I-') or \
                not _int(row['attached_event_seq']) or row['attached_event_seq'] > envelope['event_seq']:
            raise ValueError('invalid equipment source/target relation')
    uses = set()
    for row in runtime['ability_uses']:
        if set(row) != {'source_instance_id','ability_key','turn_player','round','count'} or \
                row['source_instance_id'] not in cards or not isinstance(row['ability_key'],str) or not row['ability_key'] or \
                row['turn_player'] not in players or not _int(row['round'],1) or row['round'] > game['round'] or not _int(row['count'],1):
            raise ValueError('invalid ability usage')
        key = tuple(row[k] for k in ('source_instance_id','ability_key','turn_player','round'))
        if key in uses: raise ValueError('duplicate ability usage')
        uses.add(key)


def state_hash(envelope):
    validate(envelope)
    return canonical_sha256(envelope)


def current(envelope):
    validate(envelope)
    c = copy.deepcopy(envelope['legacy_continuation'])
    c.update(last_event_seq=envelope['event_seq'], source_event_seq=envelope['event_seq'],
             source_game_state_sha256=legacy.opening._stop_state_sha256(c['game_state']))
    c['continuation_state_sha256'] = legacy._hash(c)
    return c


def visible(envelope, actor):
    validate(envelope)
    if actor not in ('A','B'): raise ValueError('invalid actor')
    c = copy.deepcopy(envelope['legacy_continuation'])
    public_prepared = {}
    for owner, p in c['game_state']['players'].items():
        public_prepared[owner] = []
        for slot, source in enumerate(p['board']['prepared']):
            metadata = envelope['runtime']['public_prepared'][source]
            c['game_state']['cards'][source]['public_face_up'] = metadata['face_up']
            c['game_state']['cards'][source]['public_paid_time'] = metadata['paid_time']
            row = dict(slot=slot, **metadata)
            if owner == actor or metadata['face_up']: row['source_instance_id'] = source
            public_prepared[owner].append(row)
    view = project_visible(c, actor)
    # Only publicly revealed equipment relations are included. Hidden prepared
    # identities are never dictionary keys in this public runtime projection.
    return dict(schema='naotocchi.card_game.continuation_view.v1', legacy_view=view,
                runtime=dict(attachments=copy.deepcopy(envelope['runtime']['attachments']),
                    ability_uses=copy.deepcopy(envelope['runtime']['ability_uses']), public_prepared=public_prepared))


def advance(envelope, continuation, event_seq):
    validate(envelope)
    if not _int(event_seq) or event_seq < envelope['event_seq']:
        raise ValueError('event sequence regressed')
    result = copy.deepcopy(envelope)
    result.update(legacy_continuation=legacy._payload(continuation), event_seq=event_seq)
    validate(result)
    return result


def detach_target(envelope, target):
    validate(envelope)
    result = copy.deepcopy(envelope)
    for source, row in list(result['runtime']['attachments'].items()):
        if row['target_instance_id'] != target: continue
        owner = result['legacy_continuation']['game_state']['players'][row['controller']]
        owner['board']['prepared'].remove(source); owner['discard'].append(source)
        del result['runtime']['attachments'][source]
        del result['runtime']['public_prepared'][source]
    validate(result)
    return result
