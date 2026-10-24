"""Operator launch of the checkpoint supervisor, generation 0 (no automatic retry/resume)."""
import sys,json,time,datetime,os
R='/home/user/naotocchi';sys.path.insert(0,R+'/docs/card-game/tools')
import proxy_population_checkpoint_operator as op
S=sys.argv[1];CID=int(sys.argv[2]);C=sys.argv[3];CT=sys.argv[4]
saved=json.loads(open(S+'/launch-request-ckpt/context.json','rb').read())
B='docs/card-game/data/proxy-population-effective-application/verification/fixed400-checkpoint-binding-7d181ce3-20261023'
ctx=op.load_context(R,saved['publication']['commit'],B)
print('start',datetime.datetime.now(datetime.timezone.utc).isoformat(),'pid',os.getpid(),flush=True)
t=time.monotonic()
report=op.run(R,ctx,R+'/'+saved['destination'],CID,C,CT,saved['resume'],S+'/ckpt-ws')
print('end',datetime.datetime.now(datetime.timezone.utc).isoformat(),round(time.monotonic()-t,1),json.dumps({k:report[k] for k in ('status','completed_rows','reused_rows','persisted_rows','not_executed_rows','unsaved_completed_rows','results_branch','results_head')}),flush=True)
