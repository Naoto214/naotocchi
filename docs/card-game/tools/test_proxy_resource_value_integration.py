import copy
import json
from pathlib import Path
import tempfile
import unittest
import proxy_resource_value_integration as i

class IntegrationTests(unittest.TestCase):
    def test_saved_artifacts_and_protected_sources_validate(self):
        self.assertEqual(i.validate_saved(),[])
    def test_evaluation_tampering_is_rejected(self):
        data=i.load_saved();data['evaluation']['shadow']['choice_changes']['count']+=1
        self.assertTrue(i.validate_data(data))
    def test_shadow_id_missing_is_rejected(self):
        data=i.load_saved();data['shadow']['results'].pop()
        self.assertTrue(i.validate_data(data))
    def test_trajectory_id_duplicate_is_rejected(self):
        data=i.load_saved();data['paired']['results'][-1]=copy.deepcopy(data['paired']['results'][0])
        self.assertTrue(i.validate_data(data))
    def test_protected_data_tampering_in_temporary_copy_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'source.json').write_text('{}\n')
            manifest={'source.json':i.sha((root/'source.json').read_bytes())}
            self.assertEqual(i.validate_protected(root,manifest),[])
            (root/'source.json').write_text('{"modified":true}\n')
            self.assertEqual(i.validate_protected(root,manifest),['protected raw differs: source.json'])
    def test_missing_artifact_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertTrue(i.validate_saved(Path(tmp)))

if __name__=='__main__':unittest.main()
