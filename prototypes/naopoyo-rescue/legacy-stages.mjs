import {stages} from './stages.mjs';
export const legacyStages = new Map([
 [6,{...stages[6],walls:[],gates:[{x:3,y:2,min:2,required:true}]}],
 [9,{...stages[9],walls:[[3,3],[4,3],[5,3]]}]
]);

