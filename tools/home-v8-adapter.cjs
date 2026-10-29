// Keep a legal ground band for both old and new star artwork in landscape.
// At 567px the old plaza ends at stageHeight - 153.09px, while a large
// actor needs y >= 160.9px. 340px leaves a real safe band without changing
// any ground polygon, collision rule, character size or movement constraint.
function replaceExact(source,from,to){if(!source.includes(from))throw Error('V8 adapter: upstream marker missing');return source.replace(from,to);}
exports.adaptDiorama = source => replaceExact(source,
 'if(1+Number(!!args.hasPartner)+(args.companions?.length||0)>5&&args.height<300)args={...args,height:300};',
 'if(args.height<340)args={...args,height:340};');
