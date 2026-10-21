const equipment=(filter={})=>({key:'equipment',zone:'ownEquipment',count:1,filter});
const destination=(filter={})=>({key:'destination',zone:'ownField',count:1,filter:{types:['main','companion','partner'],fitsEquipment:'equipment',excludeEquipmentTarget:'equipment',...filter}});
const transfer={op:'reattach',equipmentKey:'equipment',targetKey:'destination'};
const active=(select,extra={})=>({condition:'ownTurn',once:true,select,steps:[transfer],...extra});
export const EQUIPMENT_RULES={
 'C-penguin_friend':{mode:'companion',triggers:[{when:'worldChange',condition:'changedName',once:true,select:[equipment({attachedTo:'person',fitOwnMain:true})],steps:[{op:'reattach',equipmentKey:'equipment',target:'ownMain'}]}]},
 'G-dragDecorate-cake':{mode:'quick',select:[equipment(),destination()],steps:[transfer,{op:'if',condition:{all:['reattached','cakeBonus']},steps:[{op:'growth',n:5}]}]},
 'G-push-puzzle':{mode:'quick',select:[equipment({attachedTo:'main'}),destination({types:['companion'],unequipped:true})],steps:[transfer,{op:'if',condition:'reattached',steps:[{op:'draw',n:1}]}]},
 'M-clownfish-04':{active:active([equipment({attachedTo:'main'}),destination()])},
 'M-clownfish-07':{triggers:[{when:'arrival',select:[equipment({attachedTo:'person',fitOwnMain:true})],steps:[{op:'reattach',equipmentKey:'equipment',target:'sourceMain'}]}]},
 'P-rock_octopus':{mode:'partner',active:active([equipment(),destination()],{condition:{all:['ownTurn','prepared2',{value:'companions',op:'gte',n:1}]},cost:1})},
 'W-sea':{mode:'world',active:active([equipment(),destination()])}
};
