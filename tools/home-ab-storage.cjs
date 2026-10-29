// Presentation builds change only storage names, never dialogue or timing rules.
exports.scopeConversation=(source,scope)=>{
 if(!['a-qa','b-qa','play'].includes(scope))throw Error('Unknown A/B storage scope');
 for(const key of ['naotocchi-conversation-v1','naotocchi-conversation-away-v1','naopoyo-rescue-v1','naopoyo.chapter1.20261023.v1','naotocchi-card-records-v1'])source=source.replaceAll("'"+key+"'","'naotocchi-home-ab-"+scope+":"+key+"'");
 return source;
};
