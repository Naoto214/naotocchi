// Historical QA opts into one layout explicitly. Never rewrite the source entry.
module.exports=(html,version)=>html.replace(/<body\b[^>]*>/,body=>{
 const clean=body.replace(/\sdata-home-(?:viewport|display)-version="[^"]*"/g,'');
 return version?clean.replace('<body',`<body data-home-viewport-version="${version}"`):clean;
});
