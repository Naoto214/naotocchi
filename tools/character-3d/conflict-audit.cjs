// Read-only integration audit. merge-tree writes only unreachable Git objects;
// it never changes HEAD, an index, a worktree, a branch, or another lane.
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const git=(args)=>cp.spawnSync('git',args,{cwd:root,encoding:'utf8'});
const sha=ref=>{const r=git(['rev-parse',ref]);assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const before=sha('HEAD'),targets=['main','pr367','pr369','pr371','pr374'];
const fetch=git(['fetch','--no-tags','origin','refs/heads/main:refs/remotes/audit/main',...targets.slice(1).map(id=>`refs/pull/${id.slice(2)}/head:refs/remotes/audit/${id}`)]);
assert.equal(fetch.status,0,fetch.stderr);
const rows=targets.map(id=>{const head=sha('refs/remotes/audit/'+id),r=git(['merge-tree','--write-tree','--messages','--name-only',before,head]);
 assert.ok(r.status===0||r.status===1,r.stderr||r.stdout);
 const lines=r.stdout.trim().split('\n'),files=[];
 if(r.status===1)for(const line of lines.slice(1)){if(!line.trim())break;files.push(line);}
 return {lane:id,head,mechanical:r.status===0?'clean':'conflicts',files,mergeTreeOutput:r.stdout,semantic:id==='main'?'Respect latest main; World/lifecycle ownership still requires integration QA.':'Unintegrated feature lane; visibility, ground contact, occlusion, motion/emotion ownership and actor lifecycle not resolved by mechanical result.'};
});
assert.equal(sha('HEAD'),before);
const out=process.argv[2]||'test-results/full-rollout/conflicts.json';fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({source:before,when:new Date().toISOString(),readOnly:true,rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(({lane,head,mechanical,files})=>({lane,head,mechanical,files})),null,2));
