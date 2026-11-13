import test from 'node:test';
import assert from 'node:assert/strict';
import {stages} from '../stages.mjs';
import {solutions} from '../solutions.mjs';
import {ChapterSession,STORAGE_KEY} from '../session.mjs';
import {createCastleState,castleMove,doorOpen} from '../runtime.mjs';

test('pressure releases; occupied closed door cannot admit a follower',()=>{
 const s=createCastleState(stages[0].board);
 for(const step of [['parent',1,0],['parent',1,0],['child1',0,-1],['parent',1,0]])assert(castleMove(s,...step).ok);
 assert(s.flags.AHeld);assert(doorOpen(s,s.mechanisms.doors[0]));
 assert(castleMove(s,'child1',1,0).ok);assert(!s.flags.AHeld);
 assert(!doorOpen(s,s.mechanisms.doors[0]));
 assert(castleMove(s,'child1',1,0).ok);
 const before=structuredClone(s);assert(!castleMove(s,'child1',1,0).ok);assert.deepEqual(s,before);
});

test('cooperation is followed by a separate player-controlled puzzle',()=>{
 for(const [i,help] of [[7,'owlHelp'],[8,'bearHelp']]){
  const q=new ChapterSession(i);let helpedAt=-1,unlockedAt=-1,splitAfter=false;
  for(const [n,a] of solutions[i].entries()){
   const r=q.step(...a);assert(r.ok);
   if(helpedAt<0&&q.state.flags[help]){helpedAt=n;assert(!q.state.flags.B);assert(!q.cleared);}
   if(helpedAt>=0&&n>helpedAt&&r.split)splitAfter=true;
   if(unlockedAt<0&&q.state.flags.B)unlockedAt=n;
  }
  assert(helpedAt>=0&&unlockedAt>helpedAt+1);assert(q.cleared);
  if(i===8)assert(splitAfter,'bear rescue is followed by another split');
 }
});

test('NPC artwork has its own floor and never becomes an actor',()=>{
 for(const s of stages)for(const p of [s.board.mechanisms.owl,s.board.mechanisms.guardian,s.board.mechanisms.bear].filter(Boolean)){
  assert(!s.board.walls.some(([x,y])=>x===p.x&&y===p.y));
  assert(!s.board.actors.some(a=>a.x===p.x&&a.y===p.y));
  assert(p.y>=1&&p.y<=6);
 }
});

test('V2 saves are isolated and alphabet labels only explain the ordered pair',()=>{
 assert(STORAGE_KEY.includes('.v2.'));
 for(const s of stages)for(const p of s.board.mechanisms.plates||[])assert.equal(p.label,s.number===13?p.id:'');
});

test('final puzzle separates high contact, pressure, release, and full-mass lift',()=>{
 const q=new ChapterSession(9),first={};
 for(const [n,a]of solutions[9].entries()){assert(q.step(...a).ok);for(const k of ['H','A','B','W'])if(q.state.flags[k]&&first[k]===undefined)first[k]=n;}
 assert(first.H<first.A&&first.A<first.B&&first.B<first.W);assert(q.cleared);
});
