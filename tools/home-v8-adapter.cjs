// Keep a legal ground band for both old and new star artwork in landscape.
// At 582px the old plaza ends at stageHeight - 157.14px. A six-person
// married cast also reserves ring/heart extents above the partner: 340px
// has no valid foot position (minimum y=189.87 > ground maximum=182.86).
// 380px accommodates the complete official cast and attachments without changing
// any ground polygon, collision rule, character size or movement constraint.
function replaceExact(source,from,to){if(!source.includes(from))throw Error('V8 adapter: upstream marker missing');return source.replace(from,to);}
exports.adaptDiorama = source => replaceExact(source,
 'if(1+Number(!!args.hasPartner)+(args.companions?.length||0)>5&&args.height<300)args={...args,height:300};',
 'if(args.height<380)args={...args,height:380};');
