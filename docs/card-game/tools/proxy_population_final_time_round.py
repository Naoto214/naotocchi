"""E-final-time at R10 without an own main, from the card text's independent R10 branch.

91 E-final-time reads 「自分のメインが⑧、または現在のラウンドがR10の場合」 and its
connection note says 「R10ならたまごでも条件可」. The frozen 121 adjudicator adds
required_own_main_absent to any hand template whose prerequisite text mentions
"own main", so at R10 with no main it excludes a use the text allows. Only in
that exact case (E-final-time from hand, the sole reason being the absent main,
round 10, the section hash and prerequisite fragment re-verified) does this
scope drop the reason, and the frozen pipeline continues as for any reasonless
unit: its single-target ID grammar, then the existing condition, same-name,
cost and discard-target checks of the quick-use inventory. Every other unit,
round or card keeps the frozen result. No effect, target or cost is changed.
"""
from contextlib import contextmanager
from threading import Lock
import proxy_normal_action_candidate_completeness as candidate_121
import proxy_continuation_conditions as conditions
import proxy_continuation_quick as quick

CARD='E-final-time'
PREREQUISITES='hand; at least 2 time; own main is stage 8 or round is R10; eligible non-main in own discard; same-name use unused this turn'
_LOCK=Lock()


def round_ten_unit(view,unit,row):
    """True only when the absent main is the frozen row's sole, text-contradicted reason."""
    if unit['card_id']!=CARD or unit['source_family']!='hand_card_action' or unit['action_type']!='use_event':return False
    if row['reason_codes']!=['required_own_main_absent']:return False
    actor=view['actor']
    if view['players'][actor]['board']['main'] is not None or view['round']!=10:return False
    template=unit['template']
    if template['prerequisites']!=PREREQUISITES or template['source_text_reference']!=conditions.PREREQUISITES[CARD]['reference']:
        raise ValueError('final-time registered prerequisite differs')
    quick.final_capability()
    proof=conditions.prove(CARD,view,actor)
    if proof['status']!='possible' or proof['observations']!=dict(round=10,main_stage=None):raise ValueError('final-time round-ten condition differs')
    return True


def adjudicate(native,view,units,registry):
    rows=native(view,units,registry)
    if not any(round_ten_unit(view,unit,row) for unit,row in zip(units,rows)):return rows
    if len(units)!=1:raise ValueError('final-time round-ten adjudication requires a single unit')
    # 121 raises this for every reasonless unit outside its own ID grammar.
    raise ValueError('missing_candidate_id_grammar: legal action')


@contextmanager
def scope():
    if not _LOCK.acquire(blocking=False):raise ValueError('final-time round scope concurrency/reentry forbidden')
    native=candidate_121.adjudicate_units
    try:
        candidate_121.adjudicate_units=lambda view,units,registry:adjudicate(native,view,units,registry);yield
    finally:candidate_121.adjudicate_units=native;_LOCK.release()
