// Formatting only: preserve the AST, remove comments and compact whitespace.
module.exports=()=>({manipulateOptions(options,parserOptions){parserOptions.createParenthesizedExpressions=true;options.generatorOpts={...options.generatorOpts,compact:true,comments:false,jsescOption:{minimal:true}};options.compact=true;options.comments=false;options.sourceMaps=false;}});
