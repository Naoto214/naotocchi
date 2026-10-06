import copy,unittest
from test_proxy_population_first_response import game_with
import proxy_continuation_public_history as legacy
import proxy_population_runtime as runtime
from test_proxy_population_runtime import initial
try:import proxy_population_public_application as api
except ImportError:api=None

def trace():
 g,actor,_=game_with('C-chameleon');other='B' if actor=='A' else 'A';p=g['players'][actor]
 ch=next(s for s in p['hand'] if g['cards'][s]['card_id']=='C-chameleon');worlds={who:next(s for s in g['players'][who]['hand']+g['players'][who]['deck'] if g['cards'][s]['card_id'].startswith('W-')) for who in (actor,other)}
 states=[copy.deepcopy(g)];events=[]
 def add(kind,who,source):
  before=states[-1];events.append(dict(seq=len(events)+1,action_type=kind,actor=who,source_instance_id=source,game_state_before_sha256=api.game_hash(before),game_state_after_sha256=api.game_hash(g)));states.append(copy.deepcopy(g))
 for who in (actor,other):
  player=g['players'][who];main=next(s for s in player['hand']+player['deck'] if g['cards'][s]['card_id'].startswith('M-'))
  (player['hand'] if main in player['hand'] else player['deck']).remove(main);player['board']['main']=main;add('main_movement',who,main)
 p['hand'].remove(ch);p['board']['companions'].append(ch);add('person_placement',actor,ch)
 p['board']['companions'].remove(ch);p['discard'].append(ch);add('person_placement',actor,None)
 for who,source in worlds.items():
  player=g['players'][who];(player['hand'] if source in player['hand'] else player['deck']).remove(source);player['board']['world']=source;add('place_world',who,source)
 shots=[dict(event_seq=i,game_state=s) for i,s in enumerate(states)]
 return g,events,shots,actor,ch

class ActualApplicationTests(unittest.TestCase):
 def test_removed_continuous_source_cannot_be_invented_by_later_worlds(self):
  self.assertIsNotNone(api,'actual-public-state application audit absent')
  def run(forced):
   g,events,shots,actor,ch=trace();result=api.companion_applied(g,events,shots,actor)
   self.assertTrue(legacy.companion_applied(g,events,actor)['condition_met'])
   self.assertFalse(result['condition_met']);self.assertFalse(result['origin_authenticated'])
   bad=copy.deepcopy(shots);bad[4]['game_state']['players'][actor]['board']['companions'].append(ch)
   with self.assertRaises(ValueError):api.companion_applied(g,events,bad,actor)
   return {}
  runtime.operation(initial(),run)
 def test_actual_current_public_continuous_application_is_retained(self):
  self.assertIsNotNone(api)
  def run(forced):
   g,events,shots,actor,ch=trace();before=copy.deepcopy(g);g['players'][actor]['discard'].remove(ch);g['players'][actor]['board']['companions'].append(ch);seq=len(events)+1
   events.append(dict(seq=seq,action_type='person_placement',actor=actor,source_instance_id=ch,game_state_before_sha256=api.game_hash(before),game_state_after_sha256=api.game_hash(g)));shots.append(dict(event_seq=seq,game_state=copy.deepcopy(g)))
   result=api.companion_applied(g,events,shots,actor);self.assertTrue(result['condition_met']);self.assertEqual({r['source_instance_id'] for r in result['applications']},{ch});return {}
  runtime.operation(initial(),run)
 def test_native_companion_recovery_success_and_no_application_are_distinct(self):
  from test_proxy_population_discard_recovery import fixture
  import proxy_population_discard_recovery as recovery
  import proxy_continuation_state as state
  def run(forced):
   for succeeds in (True,False):
    with self.subTest(succeeds=succeeds),recovery.scope():
     e,history,source,target=fixture();e=runtime.engine.payments.upgrade(e)
     action=recovery.board_candidates(state.current(e),history,source)[0][0]
     activated,_=recovery.activate(e,dict(selected_action=action),history);before=state.current(activated)
     before['response_context']['chain_status']='resolving';p=before['game_state']['players']['A']
     if not succeeds:p['discard'].remove(target);p['deck'].insert(0,target)
     resolved=recovery.resolve(before,initial());event=copy.deepcopy(resolved['new_events'][0]);game=resolved['final_continuation_state']['game_state']
     # Conditional one-transition public-history slice, not a legal full game.
     event['seq']=1;shots=[dict(event_seq=0,game_state=before['game_state']),dict(event_seq=1,game_state=game)]
     self.assertEqual(api.companion_applied(game,[event],shots,'A')['condition_met'],succeeds)
     bad=copy.deepcopy(event);bad['result']['returned_to_hand']=not succeeds
     with self.assertRaises(ValueError):api.companion_applied(game,[bad],shots,'A')
     bad=copy.deepcopy(event);bad['result']['returned_to_hand']=int(succeeds)
     with self.assertRaises(ValueError):api.companion_applied(game,[bad],shots,'A')
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
