// CPU policy versions and save compatibility.
// - New CPU matches are saved with the current policy version (heuristic-2).
// - A saved CPU match keeps the policy version it was started with: a heuristic-1 save restores and its CPU keeps
//   choosing with heuristic-1 (same moves as before heuristic-2 existed); an unknown version is still refused.
// - heuristic-1 CPU-vs-CPU games reproduce the golden saves recorded on main 851cf09a; beginner-only games are
//   identical under heuristic-2 (B1 is intermediate-only).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as e from '../engine.mjs';
import {CpuSession,restoreMatch} from '../cpu-session.mjs';
import {POLICY_VERSION,POLICY_VERSIONS} from '../cpu-policy.mjs';
import {goldenGames,GAMES} from './fixtures/cpu-golden.mjs';
const golden=JSON.parse(readFileSync(new URL('./fixtures/cpu-golden.json',import.meta.url))).games;
const F=JSON.parse(readFileSync(new URL('./fixtures/cpu-b1-positions.json',import.meta.url)));
const STAT={power:'power',wisdom:'wisdom','パンチ':'power','キック':'power','ガード':'wisdom'};
const cpuSave=(f,policy,policySeed)=>JSON.stringify({version:'cpu-match-1',policy,humanSeat:f.seat==='A'?'B':'A',difficulty:'intermediate',policySeed,step:0,guard:{turn:null,count:0,seen:{}},diagnostic:null,game:JSON.parse(f.save)});
// Restore a CPU save at a position where the CPU must choose a stat, step once, return the chosen command.
function stepOnce(raw){const s=restoreMatch(raw);assert.ok(s.cpuPending,'CPU to move');const before=JSON.parse(s.engineSave).commands.length;
 assert.ok(s.stepCpu(s.projection.revision));const cmds=JSON.parse(s.engineSave).commands;assert.equal(cmds.length,before+1);return {session:s,command:JSON.parse(cmds.at(-1))};}
test('方針の版：現在は heuristic-2、既知の版は heuristic-1 と heuristic-2',()=>{assert.equal(POLICY_VERSION,'heuristic-2');assert.deepEqual([...POLICY_VERSIONS],['heuristic-1','heuristic-2']);});
test('新しいCPU対戦は heuristic-2 で保存される',()=>{const s=new CpuSession({humanSeat:'A',difficulty:'intermediate',policySeed:3});s.start(e.createGame(5));assert.equal(JSON.parse(s.save()).policy,'heuristic-2');});
test('heuristic-1 の途中保存は再開でき、続きも heuristic-1 で指す（再保存しても heuristic-1）',()=>{
 const f=F['ski:power'];let differs=0;
 for(let seed=1;seed<=12;seed++){
  const h1=stepOnce(cpuSave(f,'heuristic-1',seed)),h2=stepOnce(cpuSave(f,'heuristic-2',seed));
  assert.equal(JSON.parse(h1.session.save()).policy,'heuristic-1');assert.equal(JSON.parse(h2.session.save()).policy,'heuristic-2');
  // heuristic-1 continuation = the move the official CPU made before heuristic-2 existed (h1Choices, step 0)
  const s=e.restore(f.save),i=e.legalActions(s).findIndex(x=>x.id===JSON.stringify(h1.command));
  assert.equal(i,F['ski:power'].h1Choices.intermediate[seed-1],`seed ${seed}`);
  if(h2.command.variant in STAT)assert.equal(STAT[h2.command.variant],s.challenge.parameter);
  if(JSON.stringify(h1.command)!==JSON.stringify(h2.command))differs++;}
 assert.ok(differs>0,'some seeds choose differently: the version really selects the policy');});
test('未知の方針の版は従来どおり拒否する',()=>{assert.throws(()=>restoreMatch(cpuSave(F['ski:power'],'heuristic-9',1)),/CPU保存形式が異なります/);});
test('heuristic-1 のCPU同士の対戦は、実装前の main の保存と完全に一致する',()=>{
 const got=goldenGames('heuristic-1');got.forEach((g,i)=>assert.equal(g.sha,golden[i].sha,`game ${i} seed ${g.seed}`));});
test('heuristic-2：初級だけの対戦は heuristic-1 と同一、中級を含む対戦も完走する',()=>{
 const got=goldenGames('heuristic-2');GAMES.forEach((g,i)=>{const beginnerOnly=g.difficulty.A==='beginner'&&g.difficulty.B==='beginner';
  if(beginnerOnly)assert.equal(got[i].sha,golden[i].sha,`beginner-only game ${i}`);assert.equal(got[i].result.reason,'R10最終比較');});});
