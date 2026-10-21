import unittest
import proxy_new_seed_normal_choice_229 as subject
class NormalChoice229Test(unittest.TestCase):
    def test_all_saved_choices(self):
        rows=subject.build_report()['results']
        self.assertEqual(3,sum(r['selected_candidate']=='pass' for r in rows))
        self.assertEqual(1,sum(r['selected_candidate']=='response-pass' for r in rows))
        self.assertTrue(all(not subject.validate_result(r) for r in rows))
        self.assertEqual([2,2,1],sorted([len(r.get('paid_comparisons',[])) for r in rows if
                                            r['selected_candidate']=='pass'],reverse=True))
if __name__=='__main__':unittest.main()
