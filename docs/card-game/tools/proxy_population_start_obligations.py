"""Current107 conditional start-occurrence producer, separate from start replay.

Only actual start execution + this producer + ledger consumption can establish
start coverage. A caller-supplied capture is not proof that a turn started.
"""
import copy
import hashlib
from proxy_mandatory_policy_contract import ROOT,canonical,load_json
import proxy_continuation_rules as rules
import proxy_population_opportunity_ledger as ledger

CATALOG='data/proxy-population-opportunity-ledger/start-sources.json'
CATALOG_SHA='1957d8570eda5bd668aca7c4574480948862b758debbd80c31e44540257cdc64'


def catalog():
    raw=(ROOT/CATALOG).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=CATALOG_SHA:raise ValueError('start catalog changed')
    result=load_json(ROOT/CATALOG);fixture_raw=(ROOT/result['fixture_path']).read_bytes()
    if hashlib.sha256(fixture_raw).hexdigest()!=result['fixture_sha256']:raise ValueError('107 source changed')
    fixture=load_json(ROOT/result['fixture_path'])
    ids={c['card_id'] for p in fixture['input']['players'] for c in p['deck_order_top_to_bottom']}
    if set(result['cards'])!=ids:raise ValueError('107 start source coverage differs')
    for row in result['cards'].values():
        section,digest=rules.source_section(row['reference'])
        if digest!=row['source_raw_sha256'] or hashlib.sha256(section.encode()).hexdigest()!=row['section_sha256']:
            raise ValueError('start source text changed')
    return result


def public_sources(envelope):
    game=envelope['legacy_continuation']['game_state'];runtime=envelope['runtime'];result={};known=catalog()['cards']
    if set(game['players'])!={'A','B'}:raise ValueError('player coverage differs')
    for actor,p in game['players'].items():
        board=p['board'];slots={source:slot for slot in ('main','partner','world') if (source:=board[slot]) is not None}
        slots.update({source:'companions' for source in board['companions']})
        for source in board['prepared']:
            metadata=runtime['public_prepared'][source]
            if type(metadata.get('face_up')) is not bool:raise ValueError('prepared visibility is unknown')
            if metadata['face_up'] is not True:
                # No opponent hidden card text is inspected. Prepared reactions
                # remain the separate119/77 source obligation.
                continue
            if source not in runtime['attachments']:raise ValueError('public equipment attachment absent')
            slots[source]='prepared'
        for source,slot in slots.items():
            card=game['cards'][source]['card_id']
            if card not in known:raise ValueError('start capability unknown')
            if source in result:raise ValueError('duplicate public source')
            result[source]=dict(actor=actor,slot=slot,card_id=card,classification=copy.deepcopy(known[card]))
    return result


def capture(envelope):
    c=envelope['legacy_continuation'];g=c['game_state']
    if g['phase']!='turn_start' or c['activation_zone'] or c['pending_triggers'] or any(p['reservations'] for p in g['players'].values()):
        raise ValueError('start capture requires unconnected reservations/chain proof')
    return dict(schema='current107_start_source_capture.v1',turn_player=g['turn_player'],
                event_seq=envelope['event_seq'],envelope_sha256=hashlib.sha256(canonical(envelope)).hexdigest(),
                public_sources=public_sources(envelope),start_execution_authenticated=False)


def collect(capture_record,envelope):
    c=envelope['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=g['turn_player'];seq=envelope['event_seq']
    if capture_record['schema']!='current107_start_source_capture.v1' or capture_record['turn_player']!=actor or type(seq) is not int or type(capture_record['event_seq']) is not int or seq<=capture_record['event_seq'] or g['phase']!='response_window' or ctx['window_kind']!='turn_start' or type(ctx['origin_event_seq']) is not int or ctx['origin_event_seq']!=seq or c['activation_zone'] or c['pending_triggers'] or any(p['reservations'] for p in g['players'].values()):
        raise ValueError('start occurrence boundary differs')
    # Current107 has no start reservation which moves board sources. Do not
    # accept retroactive entrants or guess how an unconnected movement behaved.
    sources=public_sources(envelope)
    if canonical(sources)!=canonical(capture_record['public_sources']):raise ValueError('start source presence changed without handler proof')
    occurrences=[];classifications=[]
    for source,row in sorted(sources.items()):
        kind=row['classification']['start_kind'];met=False
        if kind=='none':reason='not_turn_start_trigger'
        elif row['actor']!=actor:reason='requires_own_turn_start'
        elif kind=='own_start_reveal_companion':met=True;reason='eligible_start_trigger'
        elif kind=='own_start_hand_at_most_two_draw':
            if row['slot']!='prepared':raise ValueError('start equipment source is not attached')
            met=len(g['players'][actor]['hand'])<=2;reason='eligible_start_trigger' if met else 'hand_count_above_two'
        else:raise ValueError('start condition handler absent')
        classifications.append(dict(source_instance_id=source,card_id=row['card_id'],reason_code=reason,source_reference=row['classification']['reference']))
        if met:
            occurrence=dict(origin_event_seq=seq,source_instance_id=source,actor=actor,category='optional',ability_key=kind,source_reference=row['classification']['reference'])
            ledger.identity(occurrence);occurrences.append(occurrence)
    return dict(schema='current107_start_occurrences.v1',origin_event_seq=seq,occurrences=occurrences,
                classifications=classifications,capture=copy.deepcopy(capture_record),
                current_envelope_sha256=hashlib.sha256(canonical(envelope)).hexdigest(),
                source_catalog_sha256=CATALOG_SHA,start_execution_authenticated=False,
                scope='current107_no_start_reservations_no_board_movement',
                opportunity_completeness_proven=False,policy_eligible=None,balance_admitted=None)
