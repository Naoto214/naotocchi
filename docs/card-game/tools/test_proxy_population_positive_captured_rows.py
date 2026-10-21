"""A doubly captured resolution yields one occurrence for its triggered activation (group-044-A-first 335/336)."""
import copy,unittest
import proxy_population_positive_window as api


def occurrence(source='A-006#1',origin=335,ability='after_own_quick_effect_applied'):
 return dict(origin_event_seq=origin,source_instance_id=source,actor='A',category='optional',ability_key=ability,source_reference='55-insect-three-lines-card-text-draft.md#M-antlion-06')


class CapturedRowsTests(unittest.TestCase):
 def test_raw_and_normalized_captures_collapse_to_one_occurrence(self):
  event=dict(source_instance_id='A-006#1',trigger_origin_event_seq=335)
  captures={'raw':dict(occurrences=[occurrence()]),'final':dict(occurrences=[occurrence()]),'other':dict(occurrences=[occurrence(source='B-006#1')])}
  self.assertEqual(api.captured_rows(captures,event),[occurrence()])

 def test_distinct_occurrences_or_other_origins_stay_distinct(self):
  event=dict(source_instance_id='A-006#1',trigger_origin_event_seq=335)
  captures={'a':dict(occurrences=[occurrence()]),'b':dict(occurrences=[occurrence(ability='different_ability')])}
  self.assertEqual(len(api.captured_rows(captures,event)),2)
  self.assertEqual(api.captured_rows({'a':dict(occurrences=[occurrence(origin=334)])},event),[])


if __name__=='__main__':unittest.main()
