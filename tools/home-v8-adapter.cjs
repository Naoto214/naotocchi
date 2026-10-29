// Version 8 only. Keep the official bodies readable on a short landscape screen.
// A 150px stage collapses the large pet's bounds to y=138; that line is outside
// the star plaza. Use the existing scrollable 300px activity floor for small
// households too, retaining a nonempty safe band without weakening navigation.
function replaceExact(source,from,to){if(!source.includes(from))throw Error('V8 adapter: upstream marker missing');return source.replace(from,to);}
exports.adaptDiorama = source => replaceExact(source,
 'if(1+Number(!!args.hasPartner)+(args.companions?.length||0)>5&&args.height<300)',
 'if(args.height<300)');
exports.adaptScript = source => replaceExact(source,
 '&& 1 + Number(hasPartner) + recruited.length > 5 &&',
 '&&');
