"""Board activation receipts survive source departure, never imply origin proof.

A receipt is structural metadata. Full entry replay must recreate it from the
actual preceding envelope/activation, including legal targets and payment.
"""
import copy
import re
from contextlib import contextmanager
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_continuation_board_links as board_links
from proxy_mandatory_policy_contract import canonical

KEYS={'contract','actor','source_instance_id','card_id','card_copy_id','activation_event_seq','before_envelope_sha256','origin_authenticated'}


def receipt(before,after,link):
    actor=link['actor'];source=link['source_instance_id'];g=before['legacy_continuation']['game_state'];p=g['players'][actor];board=p['board']
    sources=[board['main'],board['partner'],board['world'],*board['companions']]
    if source in board['prepared'] and before['runtime']['public_prepared'][source]['face_up'] is True and source in before['runtime']['attachments']:sources.append(source)
    card=g['cards'][source]
    if source not in sources or link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['card_id']!=card['card_id'] or link['card_copy_id']!=card['card_copy_id'] or after['event_seq']!=before['event_seq']+1 or link['link_id']!=f"response-link-{after['event_seq']}-{source}":
        raise ValueError('board activation origin differs')
    return dict(contract='public_board_activation_receipt.v1',actor=actor,source_instance_id=source,
                card_id=card['card_id'],card_copy_id=card['card_copy_id'],activation_event_seq=after['event_seq'],
                before_envelope_sha256=state.canonical_sha256(before),origin_authenticated=False)


def validate_reference(envelope,link):
    row=link['activation_receipt'];g=envelope['legacy_continuation']['game_state'];source=link['source_instance_id'];card=g['cards'][source];seq=row.get('activation_event_seq')
    if set(row)!=KEYS or row['contract']!='public_board_activation_receipt.v1' or row['origin_authenticated'] is not False or type(seq) is not int or not 0<seq<=envelope['event_seq'] or type(row['before_envelope_sha256']) is not str or re.fullmatch('[0-9a-f]{64}',row['before_envelope_sha256']) is None:
        raise ValueError('board activation receipt fields differ')
    identity=dict(actor=link['actor'],source_instance_id=source,card_id=card['card_id'],card_copy_id=card['card_copy_id'])
    if canonical({k:row[k] for k in identity})!=canonical(identity) or link['actor'] not in ('A','B') or link['card_id']!=card['card_id'] or link['card_copy_id']!=card['card_copy_id'] or link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['link_id']!=f'response-link-{seq}-{source}':
        raise ValueError('board activation receipt identity differs')


@contextmanager
def scope():
    import proxy_population_discard_recovery as recovery
    original_activate=triggers.activate;original_references=board_links.validate_board_references;original_normal=recovery.activate_normal
    def attest(before,result):
        after,generated=result
        if len(generated)!=1:raise ValueError('board activation event coverage differs')
        after=copy.deepcopy(after);link=after['legacy_continuation']['activation_zone'][-1]
        link['activation_receipt']=receipt(before,after,link);state.validate(after)
        event=copy.deepcopy(generated[0]);current=state.current(after)
        event['game_state_after_sha256']=triggers.old.start.opening._stop_state_sha256(current['game_state'])
        event['continuation_state_after_sha256']=triggers.old.start._hash(current)
        return after,[triggers.actions.bind_event(before,after,event)]
    def activate(before,record,events,mandatory=False):
        return attest(before,original_activate(before,record,events,mandatory))
    def normal(before,action,events):
        return attest(before,original_normal(before,action,events))
    def references(envelope):
        projected=copy.deepcopy(envelope);accepted=[];ids=[]
        for link in envelope['legacy_continuation']['activation_zone']:
            ids.append(link['link_id'])
            if 'activation_receipt' in link:
                validate_reference(envelope,link);accepted.append(link)
        if len(ids)!=len(set(ids)):raise ValueError('duplicate activation link ID')
        projected['legacy_continuation']['activation_zone']=[link for link in projected['legacy_continuation']['activation_zone'] if 'activation_receipt' not in link]
        return original_references(projected)+accepted
    try:
        triggers.activate=activate;board_links.validate_board_references=references;recovery.activate_normal=normal
        yield
    finally:
        triggers.activate=original_activate;board_links.validate_board_references=original_references;recovery.activate_normal=original_normal
