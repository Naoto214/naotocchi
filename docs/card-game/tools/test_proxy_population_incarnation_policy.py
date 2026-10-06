"""Active-copy local policy frames preserve full retained history outside465."""
import copy,unittest
import test_proxy_population_incarnation as fixtures
import proxy_population_incarnation as life
import proxy_population_policy_bridge as bridge
import proxy_mandatory_choice_boundary as boundary
try:import proxy_population_incarnation_policy as api
except ImportError:api=None

class IncarnationPolicyTests(unittest.TestCase):
 def fixture(self):
  helper=fixtures.IncarnationTests();e,s,j=helper.root();j=helper.recover(e,s,j);e,t,j=helper.enter(e,s,j)
  f=dict(schema='mandatory_rule_slice_input.v1',choice_contract_id='egg_exchange_bottom',actor='A',entry='after_normal_draw',source_instance_id=None,target_instance_id=None,game_state=copy.deepcopy(life.game(e)))
  p=f['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0))
  return f,j
 def test_full_local_application_and_rng_match_active_projection(self):
  self.assertIsNotNone(api,'lifecycle policy bridge absent');f,j=self.fixture();binding=dict(protocol_id='unit',group_id='unit',mirror_side='A_first');roots={'A':'00'*32,'B':'00'*32}
  with self.assertRaisesRegex(ValueError,'duplicate physical'):boundary.prepare(f)
  projected=copy.deepcopy(f);projected['game_state']=life.project_game(j,f['game_state']);b=boundary.prepare(projected)
  old=bridge.Session(binding,roots);old.turn_start('A','start');expected=old.choose('start',projected,b['choice_game_state'],b['candidate_ids'])
  s=api.Session(binding,roots,lambda game:j);s.turn_start('A','start')
  full_choice=life.restore_game(j,f['game_state'],b['choice_game_state']);r=s.choose('start',f,full_choice,b['candidate_ids'])
  self.assertEqual(r['local_policy_evidence'],expected['local_policy_evidence']);self.assertFalse(r['lifecycle_entry_evidence']['origin_authenticated']);self.assertTrue(r['strategic_unproven']);self.assertIsNone(r['policy_eligible'])
  after=life.restore_game(j,f['game_state'],boundary.apply_choice(projected,r['selected_candidate'])['local_after_game_state']);s.verify_after('start',f,after)
  bad=copy.deepcopy(after);bad['players']['B']['time']+=1
  with self.assertRaises(ValueError):s.verify_after('start',f,bad)
 def test_retired_metadata_changes_and_retired_physical_locations_rejected(self):
  self.assertIsNotNone(api);f,j=self.fixture();s=api.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32},lambda game:j)
  old=next(i for i in f['game_state']['cards'] if i not in j['active'].values());bad=copy.deepcopy(f);bad['game_state']['cards'][old]['card_id']='C-bat'
  with self.assertRaises(ValueError):s.project(bad)
  bad=copy.deepcopy(f);bad['game_state']['players']['A']['hand'].append(old)
  with self.assertRaises(ValueError):s.project(bad)

 def test_existing_board_handler_keeps_full_state_and_scopes_restore(self):
  import proxy_continuation_triggers as triggers
  from proxy_population_start_window import _context
  from test_proxy_population_runtime import initial
  f,j=self.fixture();g=f['game_state'];p=g['players']['A'];source=next(s for s in p['deck'] if g['cards'][s]['card_id']=='M-beetle-01');p['deck'].remove(source);p['board']['main']=source;g['phase']='response_window'
  ctx=_context('A','A');ctx.update(chain_status='resolving',chain_links=['unit-link'])
  c=dict(game_state=g,response_context=ctx,activation_zone=[dict(link_id='unit-link',actor='A',card_id='M-beetle-01',source_instance_id=source,source_zone='board',target_instance_ids=[],action_type='activate_board_ability')],pending_triggers=[],return_target='normal_action_opportunity',last_event_seq=9)
  def session():
   s=api.Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32},lambda game:j);s.turn_start('A','start');s.effect(bridge.occurrence_key(c),'A');return s
  original=(bridge.prepare,triggers.resolve)
  with bridge.handler_scope(session()),self.assertRaisesRegex(ValueError,'duplicate physical'):triggers.resolve(c,initial())
  with api.handler_scope(session()):r=triggers.resolve(c,initial())
  self.assertEqual(original,(bridge.prepare,triggers.resolve));self.assertEqual(r['final_continuation_state']['game_state']['cards'],g['cards']);self.assertIn('lifecycle_entry_evidence',r['new_decisions'][0]);self.assertEqual(r['new_events'][0]['continuation_state_after_sha256'],triggers.old.start._hash(r['final_continuation_state']))

if __name__=='__main__':unittest.main()
