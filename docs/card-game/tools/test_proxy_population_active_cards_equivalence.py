"""active_cards skips the self-comparison of single-generation cards; results are unchanged."""
import copy,unittest
from unittest.mock import patch
import proxy_population_incarnation_runtime as runtime
import proxy_population_incarnation as life


def reference(cards):
 """The pre-optimization body: digest every instance against its #1."""
 ids=life.identities(cards);groups={}
 for source,physical in ids.items():groups.setdefault(physical,[]).append(source)
 active={}
 for physical,instances in groups.items():
  generations=sorted(int(life.INSTANCE_RE.fullmatch(s).group(2)) for s in instances)
  if generations!=list(range(1,len(instances)+1)):raise ValueError('missing incarnation metadata generation')
  if any(life.digest(cards[s])!=life.digest(cards[physical+'#1']) for s in instances):raise ValueError('incarnation card definition changed')
  active[physical]=physical+'#'+str(len(instances))
 return active


def card(copy_id,generation=1,**extra):
 return dict(dict(card_copy_id=copy_id,initial_instance_id=copy_id+'#1',card_id='C-'+copy_id),**extra)


class ActiveCardsEquivalenceTests(unittest.TestCase):
 def cards(self):
  cards={'A-001#1':card('A-001'),'A-002#1':card('A-002'),'B-035#1':card('B-035'),'B-035#2':card('B-035')}
  return cards
 def test_same_result_and_far_fewer_digests(self):
  cards=self.cards();self.assertEqual(runtime.active_cards(cards),reference(cards))
  with patch.object(life,'digest',wraps=life.digest) as d:runtime.active_cards(cards)
  # Only the reentered physical (two generations) is digested: 1 for #1 plus 2 comparisons.
  self.assertEqual(d.call_count,3)
  with patch.object(life,'digest',wraps=life.digest) as d:reference(cards)
  self.assertEqual(d.call_count,8)
 def test_changed_definition_and_missing_generation_still_fail(self):
  cards=self.cards();cards['B-035#2']=card('B-035',card_id='C-other')
  for f in (runtime.active_cards,reference):
   with self.assertRaisesRegex(ValueError,'incarnation card definition changed'):f(cards)
  cards=self.cards();del cards['B-035#1'];cards['B-035#3']=card('B-035')
  for f in (runtime.active_cards,reference):
   with self.assertRaisesRegex(ValueError,'missing incarnation metadata generation'):f(cards)
 def test_single_generation_definition_is_never_compared_with_itself(self):
  cards={'A-001#1':card('A-001'),'A-002#1':card('A-002')}
  self.assertEqual(runtime.active_cards(cards),reference(cards))
  self.assertEqual(runtime.active_cards(cards),{'A-001':'A-001#1','A-002':'A-002#1'})


if __name__=='__main__':unittest.main()
