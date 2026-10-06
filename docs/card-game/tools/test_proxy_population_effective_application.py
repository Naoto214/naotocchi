import copy,unittest
try:import proxy_population_effective_application as api
except ImportError:api=None

class ApplicationTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'approved B application contract absent')
 def test_capped_growth_is_not_application_but_positive_partial_is(self):
  zero=api.growth(100,10);self.assertEqual(zero['after'],100);self.assertEqual(zero['actual_delta'],0);self.assertEqual(zero['status'],'not_applied')
  self.assertEqual(api.classify([zero],True),'not_applied')
  partial=api.growth(95,10);self.assertEqual(partial['actual_delta'],5);self.assertEqual(api.classify([partial],True),'applied')
  self.assertEqual(api.classify([zero,dict(status='applied')],True),'applied')
 def test_unknown_is_not_false_and_resolution_alone_is_insufficient(self):
  self.assertEqual(api.classify([],False),'unproved')
  self.assertEqual(api.classify([dict(status='unproved')],True),'unproved')
  self.assertEqual(api.classify([dict(status='not_applied')],False),'unproved')
  for before,delta in ((True,10),(101,10),(100,True)):
   with self.assertRaises(ValueError):api.growth(before,delta)
  with self.assertRaises(ValueError):api.classify([],1)

if __name__=='__main__':unittest.main()
