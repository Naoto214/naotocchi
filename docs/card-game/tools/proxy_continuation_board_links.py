"""Opt-in envelope validation for board ability references, not card moves.

01/06/72: activating a board ability keeps its source on board. The full
activation reference remains inside the canonical envelope hash and replay.
Historical default validation is restored after this execution scope.
"""
import copy
from contextlib import contextmanager
import proxy_continuation_state as state


def validate_board_references(envelope):
    payload=envelope['legacy_continuation'];game=payload['game_state'];references=[];seen=set()
    for link in payload['activation_zone']:
        identifier=link.get('link_id')
        if not isinstance(identifier,str) or not identifier or identifier in seen:
            raise ValueError('invalid or duplicate activation link ID')
        seen.add(identifier)
        if link.get('source_zone')!='board':continue
        actor=link.get('actor');source=link.get('source_instance_id')
        if link.get('action_type')!='activate_board_ability' or actor not in game['players']:
            raise ValueError('invalid or duplicate board ability reference')
        board=game['players'][actor]['board']
        public_prepared=source in board['prepared'] and source in envelope['runtime']['attachments'] and envelope['runtime']['public_prepared'].get(source,{}).get('face_up') is True
        if (source not in [board['main'],*board['companions'],board['partner'],board['world']] and not public_prepared) or source is None:
            raise ValueError('board ability source is not on owner board')
        card=game['cards'][source]
        if link.get('card_id')!=card['card_id'] or link.get('card_copy_id')!=card['card_copy_id']:
            raise ValueError('board ability card identity differs')
        references.append(link)
    return references


@contextmanager
def scope():
    original=state.validate
    try:
        def validate(envelope):
            refs=validate_board_references(envelope)
            if not refs:return original(envelope)
            projected=copy.deepcopy(envelope)
            projected['legacy_continuation']['activation_zone']=[link for link in projected['legacy_continuation']['activation_zone'] if link.get('source_zone')!='board']
            # The existing validator still checks every physical source, runtime
            # attachment and field. Projection is used only for location counts.
            return original(projected)
        state.validate=validate
        yield
    finally:state.validate=original
