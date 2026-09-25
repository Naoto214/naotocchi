import copy
import unittest

import proxy_new_seed_ability_activation_209 as subject


class AbilityActivation209Test(unittest.TestCase):
    def test_one_board_activation_and_three_passes(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
        activated=[x for x in report['results'] if x['new_events'][0]['action_type']=='activate_response']
        self.assertEqual(1,len(activated))
        link=activated[0]['final_continuation_state']['activation_zone'][0]
        self.assertEqual('board',link['source_zone'])
        self.assertEqual('building',activated[0]['final_continuation_state']['response_context']['chain_status'])

    def test_changed_chain_hash_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['final_continuation_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
