import copy
import unittest
from test_proxy_mandatory_choice_boundary import frame
from test_proxy_mandatory_policy_local import ROOT_HEX,context
import proxy_mandatory_policy_local as local
try:
    import proxy_mandatory_policy_journal as api
except ImportError:
    api=None

BINDING=dict(protocol_id='unit-test-only',group_id='synthetic',mirror_side='A_first',match_id='unit-match')

def item(kind='egg_exchange_bottom'):
    f=frame(kind);c=context(kind)
    return dict(frame=f,context=c,root_hex=ROOT_HEX,record=local.build_local_record(f,ROOT_HEX,c))


class JournalTests(unittest.TestCase):
    def setUp(self):self.assertIsNotNone(api,'retry journal verifier missing')

    def test_identical_retry_is_one_supplied_address_not_two_judgments(self):
        a=item();v=api.audit_journal([a,copy.deepcopy(a)],BINDING)
        self.assertTrue(v['journal_consistent'])
        self.assertEqual(v['distinct_supplied_addresses'],1)
        self.assertEqual(v['identical_retries'],1)
        self.assertIsNone(v['judgment_opportunities'])
        self.assertIsNone(v['policy_eligible'])
        self.assertIn('origin_obligation_ledger_unverified',v['gaps'])

    def test_changed_candidates_same_address_and_valid_redraw_are_rejected(self):
        a=item();b=copy.deepcopy(a)
        b['frame']['game_state']['players']['A']['hand'].remove('h2')
        b['record']=local.build_local_record(b['frame'],b['root_hex'],b['context'])
        self.assertFalse(api.audit_journal([a,b],BINDING)['journal_consistent'])

    def test_root_switch_is_rejected_even_at_a_new_address(self):
        a=item();b=item('ability_hand_bottom');b['root_hex']='00'*32
        b['record']=local.build_local_record(b['frame'],b['root_hex'],b['context'])
        self.assertFalse(api.audit_journal([a,b],BINDING)['journal_consistent'])

    def test_mirror_and_population_context_cannot_mix_inside_match(self):
        for field,value in [('mirror_side','B_first'),('group_id','other'),('protocol_id','other')]:
            a=item();a['context'][field]=value
            a['record']=local.build_local_record(a['frame'],a['root_hex'],a['context'])
            self.assertFalse(api.audit_journal([a],BINDING)['journal_consistent'])

    def test_empty_or_dropped_records_never_prove_coverage(self):
        for items in ([],[item()]):
            v=api.audit_journal(items,BINDING)
            self.assertTrue(v['journal_consistent'])
            self.assertIsNone(v['judgment_opportunities'])
            self.assertFalse(v['ready_for_execution'])
            self.assertIsNone(v['balance_admitted'])

    def test_record_tampering_and_unknown_claims_are_errors(self):
        a=item();a['record']['strategic_unproven']=False
        self.assertFalse(api.audit_journal([a],BINDING)['journal_consistent'])
        a=item();a['origin_verified']=True
        self.assertFalse(api.audit_journal([a],BINDING)['journal_consistent'])
        bad=dict(BINDING,approved=True)
        self.assertFalse(api.audit_journal([item()],bad)['journal_consistent'])

class CliTests(unittest.TestCase):
    def invoke(self,text,*extra):
        import tempfile,subprocess,sys
        from pathlib import Path
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'request.json';path.write_text(text)
            return subprocess.run([sys.executable,str(Path(__file__).with_name('proxy_mandatory_policy_journal.py')),
                                   '--evidence',str(path),*extra],capture_output=True,text=True)

    def test_cli_pending_invalid_no_seeds_or_execution_or_material_leak(self):
        import json
        good=json.dumps(dict(binding=BINDING,attempts=[item()]))
        p=self.invoke(good)
        self.assertEqual(p.returncode,1)
        self.assertFalse(json.loads(p.stdout)['ready_for_execution'])
        self.assertNotIn(ROOT_HEX,p.stdout+p.stderr)
        for text in ('{"binding":1,"binding":2}', '['*10000+']'*10000,
                     json.dumps(dict(binding=BINDING,attempts=[{}]))):
            p=self.invoke(text);self.assertEqual(p.returncode,2)
            self.assertTrue(json.loads(p.stdout)['errors'])
            self.assertNotIn('Traceback',p.stderr)
        for option in ('--execute','--generate'):
            self.assertEqual(self.invoke(good,option).returncode,2)

if __name__=='__main__':unittest.main()
