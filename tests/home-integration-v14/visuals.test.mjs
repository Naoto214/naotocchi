import test from 'node:test';
import assert from 'node:assert/strict';
import controller from '../../home-production-diorama.js';
import {surfaceAt} from '../../home-ground-material.mjs';
import {usesAutumnLeaves,paintAutumnLeaves} from '../../home-autumn-leaves.mjs';

test('size B scales the existing painted bodies and interpolates population and width',()=>{
  for(const [count,width,extra] of [[18,390,1],[19,375,1.015],[20,375,1.03],[28,320,1],[28,347.5,1.075],[28,375,1.15],[28,430,1.15]]){
    for(const [kind,desired] of [['pet',1.2],['partner',1.2],['companion',1.05]]){
      assert.ok(Math.abs(controller.residentVisualScale(kind,count,width)-desired*extra)<1e-10);
    }
  }
});

test('contact material follows the full painting and excludes exposed rocks and uncertain ground',()=>{
  for(const [region,x,y,expected] of [['forest',.5,.8,'clearing'],['forest',.4,.3,'uncertain'],
    ['river_lake',.52,.37,'river'],['river_lake',.237,.324,'uncertain'],['river_lake',.5,.6,'pebbles'],
    ['city',.6,.8,'paving'],['home',.5,.65,'boards'],['desert',.6,.8,'']]){
    assert.equal(surfaceAt(region,x,y),expected);
  }
});

test('autumn B uses twenty forest and six sunset orchard slots with a bounded, deterministic wind track',()=>{
  const autumn={season:'autumn',weather:'sunny'};
  assert.equal(usesAutumnLeaves('countryside','night',autumn),false);
  assert.equal(usesAutumnLeaves('forest','day',{...autumn,weather:'rain'}),false);
  assert.equal(usesAutumnLeaves('mountain','day',autumn),false);
  for (const [region,time,count] of [['forest','day',20],['countryside','evening',6]]){
    assert.equal(usesAutumnLeaves(region,time,autumn),true);
    function sample(seconds){
      const leaves=[];
      const ctx=new Proxy({scale(x,y){if(x!==1||y!==1)leaves.push([x,y]);},
        createLinearGradient(){return {addColorStop(){}};}
      },{get(obj,key){return key in obj?obj[key]:()=>{};}});
      paintAutumnLeaves(ctx,{left:0,top:0,width:1000,height:1500},region,time,seconds,1);
      assert.ok(leaves.length>0 && leaves.length<=count);
      assert.ok(leaves.flat().every(Number.isFinite));
      return leaves;
    }
    const prior=sample(17);
    sample(200000);
    assert.deepEqual(sample(17),prior);
  }
});

test('portrait habitat crops keep the walking pane uniform and fill the footer continuously',async()=>{
  const {portraitGroundCrop}=await import('../../home-production-world.mjs');
  for(const [width,height,frameTop,frameBottom] of [[320,516,124,305],[390,630,140,380],[390,844,140,600],[430,932,158,675]]){
    const host={width,height,top:0};
    for(const [region,horizon] of [['forest',.56],['mountain',.445]]){
      const t=portraitGroundCrop(region,host,frameTop,frameBottom);
      assert.ok(Math.abs(t.width*1.5-t.height)<1e-9);
      assert.ok(t.left<=0 && t.left+t.width>=width && t.top<=0);
      assert.ok(t.footer>frameBottom);
      assert.ok(Math.abs(t.top+t.height*horizon-frameTop-24)<1e-6);
      const remaining=t.top+t.height-t.footer;
      assert.ok(remaining>0 && (height-t.footer)/remaining<=1.4+1e-9);
    }
    assert.equal(portraitGroundCrop('home',host,frameTop,frameBottom),null);
  }
});
