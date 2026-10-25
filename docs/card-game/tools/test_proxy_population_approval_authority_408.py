"""2026-10-20 owner decision: approval PR moves #259 -> #408, nothing else changes."""
import copy,unittest
from unittest.mock import patch
import proxy_population_external_approval as api
import proxy_population_approval_transport as transport
import proxy_population_remote_publication as remote
from test_proxy_population_external_approval import request,replies


class ApprovalAuthority408Tests(unittest.TestCase):
 def test_current_authority_is_408_branch_and_publication_ref_agree(self):
  self.assertEqual((api.PR,transport.PULL_REQUEST),(408,408))
  self.assertEqual(remote.REF,'refs/heads/'+api.BRANCH)
  self.assertEqual(api.HISTORICAL_PULL_REQUESTS,{259:'design/card-pool-master-20260914'})
  self.assertEqual(api.AUTHORITY,323909980)

 def test_new_requests_target_408_and_historical_259_request_is_rejected(self):
  req=request();self.assertEqual(req['pull_request'],408)
  old=copy.deepcopy(req);old['pull_request']=259
  with self.assertRaises(ValueError):api.approval_text(old)
  self.assertFalse(api.verify_live(old,17)['external_approval_verified'])
  # Same target text, different PR: digests and required bodies never coincide.
  self.assertNotEqual(api.digest(old),api.digest(req))

 def test_comment_posted_on_259_cannot_authorize_408_request(self):
  req=request();get,comment,repo,pr=replies(req)
  comment.update(issue_url=api.API+'/issues/259',html_url='https://github.com/Naoto214/naotocchi/pull/259#issuecomment-17')
  def moved(path):
   value=get(path)
   if path=='/issues/comments/17':value.update(issue_url=comment['issue_url'],html_url=comment['html_url'])
   if path.startswith('/issues/408/comments'):value=[dict(value[0],issue_url=comment['issue_url'],html_url=comment['html_url'])]
   return value
  with patch.object(api,'_get',side_effect=moved):self.assertFalse(api.verify_live(req,17)['external_approval_verified'])

 def test_merged_or_non_draft_408_and_other_branch_fail_closed(self):
  req=request()
  for mutate in (lambda p:p.update(merged=True),lambda p:p.update(state='closed'),lambda p:p.update(draft=False),
                 lambda p:p['head'].update(ref='design/card-pool-master-20260914'),lambda p:p.update(number=259)):
   get,_,_,pr=replies(req);mutate(pr)
   with patch.object(api,'_get',side_effect=get):self.assertFalse(api.verify_live(req,17)['external_approval_verified'])

 def test_transport_refuses_259_paths(self):
  for path in ('/pulls/259','/issues/259/comments?per_page=100&page=1'):
   with self.assertRaises(ValueError):transport.allowed(path)
  transport.allowed('/pulls/408');transport.allowed('/issues/408/comments?per_page=100&page=1')


if __name__=='__main__':unittest.main()
