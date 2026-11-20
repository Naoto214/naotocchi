// VERSION 7: copies a manifest for another build: `variant` replaced, and (with --ids) the experiment card IDs of every deck
// mapped to the candidate IDs (same positions, so the same shuffles). Usage: node integration/map-manifest.mjs <in> <variant> [--ids] > out
import {readFileSync} from 'node:fs';
import {sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
import {mapId} from './candidate-cards.mjs';
const [inp,variant,flag]=process.argv.slice(2),M=JSON.parse(readFileSync(inp,'utf8'));
if(flag==='--ids')for(const d of Object.values(M.decks)){d.cards=d.cards.map(mapId);d.sha256=sha(d.cards);d.replaced=d.replaced?.map(r=>({...r,to:mapId(r.to)}));}
for(const g of M.groups){g.variant=variant;g.group=g.group.replace(/:[^:]+$/,':'+variant);const perm=permutations(g.orderSeed);g.orderSha={X:sha(apply(M.decks[g.X].cards,perm.A)),Y:sha(apply(M.decks[g.Y].cards,perm.B))};}
for(const m of M.matches){m.variant=variant;m.group=m.group.replace(/:[^:]+$/,':'+variant);m.match=m.group+':'+m.match.split(':').pop();}
M.variant=variant;M.name+=`→${variant}`;console.log(JSON.stringify(M,null,1));
