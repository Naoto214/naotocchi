"""474 approved B: conditional operation evidence, not source authentication."""

def growth(before,requested_delta):
 if type(before) is not int or not 0<=before<=100 or type(requested_delta) is not int:raise ValueError('growth operands differ')
 after=max(0,min(100,before+requested_delta));actual=after-before
 return dict(operation='growth',before=before,requested_delta=requested_delta,after=after,actual_delta=actual,bound_prevented_delta=requested_delta-actual,status='applied' if actual else 'not_applied',reason='effective_change' if actual else 'zero_instruction' if requested_delta==0 else 'canonical_bound')


def classify(parts,complete):
 if type(complete) is not bool or type(parts) is not list:raise ValueError('application completeness must be typed')
 statuses=[p['status'] for p in parts]
 if any(s not in ('applied','not_applied','unproved') for s in statuses):raise ValueError('unknown application classification')
 if 'applied' in statuses:return 'applied'
 return 'not_applied' if complete and 'unproved' not in statuses else 'unproved'
