"""Next-turn board classification for C-cat_friend from the text-bound start catalog.

The frozen 401 classifier refuses C-cat_friend whenever the owner's discard
holds a companion, because its activated ability might then be legal. The
next-turn classification only asks for turn-start triggers. The start-source
catalog (section-hash bound to the card text) already records that C-cat_friend
has no start trigger; only in that exact refusal is the companion classified
from the catalog, and the rest of the board still goes to the frozen classifier.
No ability legality, target or effect is inferred.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_reached_mixed_contracts_401 as reached
import proxy_population_start_obligations as starts

REFUSAL='reached cat target needs separate proof'
_LOCK=Lock()


def classify(native,game,actor):
    try:return native(game,actor)
    except ValueError as error:
        if str(error)!=REFUSAL:raise
    board=game['players'][actor]['board'];cats=[s for s in board['companions'] if game['cards'][s]['card_id']=='C-cat_friend']
    row=starts.catalog()['cards']['C-cat_friend']
    if not cats or row['start_kind']!='none':raise ValueError(REFUSAL)
    projected=copy.deepcopy(game)
    for source in cats:projected['players'][actor]['board']['companions'].remove(source)
    rest=native(projected,actor)
    return rest+[dict(source_instance_id=s,card_id='C-cat_friend',trigger_kind='no_turn_start_trigger',source_reference=row['reference'],source_section_sha256=row['section_sha256'],start_catalog_sha256=starts.CATALOG_SHA) for s in cats]


@contextmanager
def scope():
    if not _LOCK.acquire(blocking=False):raise ValueError('next board scope concurrency/reentry forbidden')
    native=reached.classify_next_board
    try:
        reached.classify_next_board=lambda game,actor:classify(native,game,actor);yield
    finally:reached.classify_next_board=native;_LOCK.release()
