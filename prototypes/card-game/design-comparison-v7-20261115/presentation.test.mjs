import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyTint,contrast,opticalOffset} from './presentation.mjs';
import {ATTRIBUTE_COLORS,CATEGORY_COLORS} from '../art-pilot/approved-colors.mjs';
test('All official colours retain a pale, readable display-only body tint',()=>{
 const colours=[...Object.values(ATTRIBUTE_COLORS),...Object.values(CATEGORY_COLORS)];
 for(const c of colours){const color=typeof c==='string'?c:c.color;assert(contrast('#28392f',bodyTint(color))>8.5);}
 assert.equal(bodyTint('#000000'),'#d6d4ca');assert.equal(bodyTint('#ffffff'),'#fffcf2');
});
test('Move the glyph ink centre to the existing circle centre, not the circle',()=>{
 assert.deepEqual(opticalOffset({targetX:50,targetY:50,left:42,baseline:58,leftBearing:1,rightBearing:11,ascent:20,descent:0,fontSize:30}),{x:3,y:2});
});
test('Reject unavailable metrics and bound correction to avoid a layout jump',()=>{
 assert.equal(opticalOffset({targetX:0}),null);
 assert.deepEqual(opticalOffset({targetX:100,targetY:100,left:0,baseline:0,leftBearing:0,rightBearing:10,ascent:10,descent:0,fontSize:20}),{x:3.6,y:3.6});
});
