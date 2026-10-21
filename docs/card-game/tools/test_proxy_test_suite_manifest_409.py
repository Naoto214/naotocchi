import ast
import importlib
from pathlib import Path
import tempfile
import unittest

class HistoricalSuite409Tests(unittest.TestCase):
    def subject(self):
        return importlib.import_module('proxy_test_suite_manifest')

    def test_historical_counts_and_future_additions_are_separate(self):
        m=self.subject();root=Path(__file__).parent
        for number,expected in [(117,190),(119,221),(120,263)]:
            result=m.count_historical_suite(root,number)
            self.assertEqual(expected,result['test_count']);self.assertEqual([],result['errors'])
        current=m.count_current_suite(root)
        self.assertGreater(current['test_count'],263)
        self.assertIn('test_proxy_new_seed_mixed_replay_408.py',current['files'])
        self.assertNotIn('test_proxy_new_seed_mixed_replay_408.py',m.count_historical_suite(root,120)['files'])

    def test_future_module_cannot_change_historical_suite(self):
        m=self.subject();root=Path(__file__).parent
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)
            for name in m.count_historical_suite(root,120)['files']:
                (target/name).write_bytes((root/name).read_bytes())
            before=m.count_historical_suite(target,120)
            (target/'test_proxy_future_999.py').write_text('def test_new(): pass\n')
            self.assertEqual(before,m.count_historical_suite(target,120))
            self.assertEqual(264,m.count_current_suite(target)['test_count'])

    def test_missing_or_changed_historical_module_is_rejected(self):
        m=self.subject();root=Path(__file__).parent
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)
            for name in m.count_historical_suite(root,120)['files']:
                (target/name).write_bytes((root/name).read_bytes())
            chosen=target/'test_proxy_response_window_contract.py'
            original=chosen.read_bytes();chosen.unlink()
            self.assertTrue(m.count_historical_suite(target,119)['errors'])
            chosen.write_bytes(original+b'\ndef test_unexpected_extra(): pass\n')
            result=m.count_historical_suite(target,119)
            self.assertEqual(222,result['test_count']);self.assertTrue(result['errors'])
            chosen.write_text('def malformed(:\n')
            self.assertTrue(m.count_historical_suite(target,119)['errors'])

if __name__=='__main__':unittest.main()
