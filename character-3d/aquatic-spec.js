// Unpromoted original-derived aquatic representatives. No runtime coverage yet.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;if(root)root.NaotocchiAquaticWave=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const twig=(path,r,bulb=1,taper=.35)=>({path,r,bulb,taper});
 const stones=[[-.28,.065,.02,.14,.065],[-.12,.045,.16,.13,.05],[.10,.06,.13,.15,.06],[.29,.055,-.02,.13,.055],[0,.065,-.14,.14,.065]];
 const rows={coral:{why:'02 low bulb with radial soft tentacles;05 wide antler-like red colony with rounded branching tips and rooted face-bearing core.',stages:{
  2:{archetype:'branch_organism',body:{width:.25,height:.23,depth:.22,y:.28},normalEye:'happy',stones,
   colors:{body:'#f3b99e',light:'#ffe1b4',branch:'#ed98ab',tip:'#f7b7c0',blush:'#f58c8f',stones:['#817095','#9a8bac','#b7a0ae']},branches:[
    twig([[0,.42,-.10],[-.02,.65,-.12],[-.03,.88,-.14]],.025,1.8),twig([[.08,.42,-.08],[.15,.67,-.09],[.18,.83,-.07]],.025,1.6),
    twig([[-.10,.43,-.06],[-.23,.67,-.08],[-.25,.80,-.07]],.025,1.6),twig([[.15,.40,0],[.32,.56,-.04],[.38,.74,-.04]],.028,1.4),
    twig([[-.15,.40,0],[-.32,.58,-.03],[-.39,.70,-.03]],.028,1.4),twig([[.20,.35,.03],[.40,.44,.01],[.49,.56,.01]],.027,1.5),
    twig([[-.20,.35,.03],[-.40,.44,.01],[-.52,.53,.01]],.027,1.5),twig([[.21,.28,.03],[.39,.30,.04],[.50,.39,.04]],.029,1.5),
    twig([[-.21,.27,.03],[-.39,.30,.04],[-.51,.33,.04]],.027,1.5),twig([[.08,.45,.03],[.25,.66,.03],[.29,.73,.02]],.023,1.6),
    twig([[-.05,.45,.04],[-.12,.67,.04],[-.14,.75,.02]],.025,1.6),twig([[.01,.47,.01],[.04,.70,.01],[.06,.79,.01]],.021,1.5)
   ]},
  5:{archetype:'branch_organism',body:{width:.27,height:.25,depth:.20,y:.28},normalEye:{left:'happy',right:'round'},stones:stones.map(s=>[s[0]*1.25,s[1],s[2],s[3],s[4]]),
   colors:{body:'#f66c26',light:'#ffb541',branch:'#f06b22',tip:'#ffb753',blush:'#f68d65',stones:['#dc9a56','#edbd73','#be8757']},branches:[
    twig([[0,.31,0],[.03,.57,-.01],[0,.84,-.02]],.080),twig([[0,.52,-.01],[-.18,.66,-.02],[-.20,.87,-.02]],.058),
    twig([[.02,.55,0],[.22,.70,0],[.25,.83,0]],.057),twig([[0,.38,0],[-.25,.47,0],[-.44,.65,.02]],.075),
    twig([[-.23,.48,0],[-.24,.66,0],[-.31,.76,0]],.049),twig([[-.32,.55,.01],[-.46,.55,.02],[-.54,.67,.02]],.046),
    twig([[.02,.34,0],[.30,.45,0],[.50,.62,.02]],.074),twig([[.27,.45,0],[.28,.62,0],[.36,.71,0]],.047),
    twig([[.37,.51,.01],[.51,.50,.02],[.60,.58,.02]],.043),twig([[-.12,.25,.02],[-.34,.32,.02],[-.60,.38,.04]],.060),
    twig([[-.40,.34,.03],[-.46,.44,.03],[-.51,.46,.03]],.038),twig([[.13,.25,.02],[.37,.31,.04],[.59,.36,.05]],.059),
    twig([[.44,.33,.04],[.48,.41,.04],[.54,.44,.04]],.038),twig([[.03,.68,-.01],[.14,.80,-.01],[.12,.92,-.01]],.044)
   ]}
 }}};
 const st=rows.coral.stages,copy=o=>JSON.parse(JSON.stringify(o));
 st[1]={archetype:'branch_organism',body:{width:.37,height:.37,depth:.34,y:.37},branches:[],stones:[],colors:{body:'#f29acc',light:'#ffd9eb',branch:'#ef9ecb',tip:'#f8bade',blush:'#eb6dac',stones:[]}};
 st[3]={archetype:'branch_organism',body:{width:.18,height:.30,depth:.17,y:.35},stones:copy(stones),colors:{...st[2].colors,body:'#ffc0a0',branch:'#f4a289',tip:'#ffd3b6'},branches:[
  twig([[0,.48,-.03],[.02,.74,-.02],[.01,1.00,-.02]],.050,1.2),
  twig([[-.06,.48,-.02],[-.18,.74,-.01],[-.22,.89,.01]],.040,1.3),
  twig([[.06,.48,-.02],[.23,.73,0],[.25,.91,.03]],.044,1.2),
  twig([[-.10,.48,0],[-.32,.64,.01],[-.43,.79,.02]],.044,1.3),
  twig([[.09,.45,.01],[.37,.62,.02],[.39,.73,.03]],.048,1.3),
  twig([[-.12,.40,.02],[-.36,.46,.04],[-.50,.59,.04]],.047,1.3),
  twig([[.12,.42,.03],[.45,.47,.04],[.53,.61,.04],[.45,.64,.04]],.045,1.2),
  twig([[-.13,.35,.03],[-.37,.31,.05],[-.43,.40,.05],[-.36,.45,.05]],.043,1.3),
  twig([[.12,.34,.04],[.33,.34,.06],[.47,.34,.06]],.042,1.3),
  twig([[.02,.53,-.02],[.16,.83,-.04],[.10,.98,-.03]],.040,1.2)
 ]};
 st[4]={archetype:'branch_organism',body:{width:.27,height:.24,depth:.21,y:.28},stones:copy(stones),colors:{...st[2].colors,body:'#ed8ebb',branch:'#eb8ec0',tip:'#ffc1db'},branches:[
  twig([[0,.37,0],[.04,.63,-.01],[.01,.89,0]],.083,1.3),
  twig([[.03,.58,0],[.17,.67,.01],[.21,.78,.01]],.060,1.3),
  twig([[0,.43,0],[-.27,.56,.01],[-.30,.78,.02]],.079,1.3),
  twig([[-.25,.55,.01],[-.44,.58,.03],[-.48,.68,.04]],.060,1.3),
  twig([[.04,.35,0],[.30,.50,.02],[.37,.73,.02]],.081,1.3),
  twig([[.29,.50,.02],[.49,.52,.04],[.55,.65,.04]],.057,1.3),
  twig([[-.12,.25,.02],[-.35,.31,.04],[-.53,.36,.06]],.070,1.3),
  twig([[.14,.24,.02],[.34,.29,.04],[.49,.33,.06]],.065,1.3)
 ]};
 const colored=(base,body,branch,tip,eye)=>({...copy(base),stones:[],normalEye:eye||'round',colors:{...base.colors,body,branch,tip,light:tip}});
 const orange=colored(st[5],'#ffa122','#f98b24','#ffd64f');
 const pink=colored(st[4],'#f09bc8','#e189c2','#ffc5dd','happy');
 const blue=colored(st[5],'#32bce5','#1d9bdd','#86e7ee');
 const violet=colored(st[4],'#c984ed','#a667d5','#e8acf7');
 const gravel=[[-.46,.06,.10,.13,.06],[-.30,.06,.18,.12,.055],[-.12,.05,.22,.14,.045],[.08,.05,.20,.11,.05],[.29,.06,.19,.14,.055],[.48,.055,.12,.12,.05],[.35,.05,-.15,.13,.06],[-.34,.05,-.13,.13,.05],[0,.05,-.22,.20,.05]];
 const stoneColors=['#8950b9','#43a4d6','#d651a8','#76af52','#ed9762'];
 st[6]={archetype:'branch_organism',stones:gravel,stoneColors,colony:[
  {spec:violet,at:[.11,.21,-.15],scale:.80,face:false},
  {spec:blue,at:[.42,.045,.20],scale:.64},
  {spec:orange,at:[-.06,.04,.10],scale:.78},
  {spec:pink,at:[-.43,0,.16],scale:.49},
  {spec:colored(st[3],'#ffa17a','#f18d76','#ffc7a1','happy'),at:[.30,-.005,.23],scale:.41}
 ]};
 st[7]={archetype:'branch_organism',stones:gravel,stoneColors,colony:[
  {spec:orange,at:[.00,.33,-.14],scale:1.02},
  {spec:{...pink,normalEye:{left:'happy',right:'round'}},at:[-.43,.015,.11],scale:.62},
  {spec:{...blue,normalEye:{left:'round',right:'happy'}},at:[.42,.015,.17],scale:.66}
 ]};
 const disk=(body,petal,tip,eye)=>({archetype:'branch_organism',body:{width:.15,height:.15,depth:.105,y:.20},branches:[],stones:[],normalEye:eye||'round',petals:{count:18,width:.038,length:.080,depth:.055},colors:{body,light:tip,branch:petal,tip,blush:'#ed88a0',stones:[]}});
 st[8]={archetype:'branch_organism',stones:gravel,stoneColors,mound:{r:.49,h:.55,colors:['#508d42','#6dac44','#2b9180','#2f7181','#8db640']},colony:[
  {spec:{...blue,body:{width:.10,height:.12,depth:.09,y:.12}},at:[-.29,.20,-.19],scale:.46,face:false},
  {spec:disk('#ffd34b','#f6bc24','#ffea63'),at:[.10,.25,.20],scale:1.03},
  {spec:disk('#cf8ae9','#b17be6','#e3aff3'),at:[-.20,.03,.28],scale:1.00},
  {spec:disk('#f88ead','#e9719c','#ffb0c0','happy'),at:[-.45,.12,.12],scale:.73},
  {spec:disk('#f789b0','#e9639d','#ffb3cf','happy'),at:[.43,.035,.21],scale:.76},
  {spec:disk('#fff0b8','#eaa2cc','#fff5d0','happy'),at:[.16,-.005,.36],scale:.61}
 ]};
 const youngBell={archetype:'jellyfish',bell:{radius:.38,height:.35,y:.55,alpha:.64,profile:[[.001,.35],[.14,.33],[.26,.23],[.34,.10],[.38,.025],[.36,0],[.31,.035],[.20,.09],[.001,.11]]},
  colors:{bell:'#97c9ef',rim:'#c9abed',core:'#adbfee',light:'#e4f7ff',arm:'#969ade',armLight:'#c7cbf6'},
  tentacles:[
   {r:.043,path:[[-.25,.045,0],[-.22,-.14,.02],[-.34,-.34,.05],[-.27,-.39,.07]]},
   {r:.044,path:[[-.14,.02,.10],[-.10,-.18,.12],[-.14,-.42,.10],[-.09,-.44,.10]]},
   {r:.048,path:[[0,.015,.13],[.02,-.19,.15],[.05,-.44,.12],[.10,-.46,.11]]},
   {r:.043,path:[[.14,.02,.08],[.14,-.15,.10],[.28,-.34,.10],[.26,-.38,.11]]},
   {r:.038,path:[[.26,.045,-.01],[.30,-.12,.01],[.39,-.21,.04],[.42,-.21,.05]]},
   {r:.035,path:[[.02,.03,-.15],[-.04,-.16,-.14],[-.08,-.30,-.11],[0,-.38,-.10]]}
  ],bubbles:[[-.47,.29,.02,.035],[.49,.21,-.02,.045],[-.42,-.16,.08,.024]]};
 const mature=copy(youngBell);mature.bell={radius:.50,height:.28,y:.80,alpha:.52,profile:[[.001,.28],[.18,.27],[.34,.20],[.45,.08],[.50,.015],[.48,-.005],[.39,.045],[.20,.09],[.001,.10]]};mature.normalEye='droop';
 mature.colors={bell:'#84b9eb',rim:'#a59aee',core:'#95b5e9',light:'#d4edff',arm:'#8e8cdb',armLight:'#c1c5f2'};
 // Explicit source filament groups; circumferential placement complements the
 // visible bell rather than creating new faces or gameplay organisms.
 mature.tentacles=[
 [-.38,.01,.01,-.45,-.65,.026],[-.30,.00,.12,-.34,-.72,.023],[-.22,.00,.22,-.29,-.68,.027],[-.12,.01,.25,-.10,-.78,.027],
 [.00,.01,.27,.08,-.71,.030],[.12,.01,.24,.22,-.76,.027],[.24,.01,.16,.36,-.70,.024],[.35,.01,.07,.47,-.63,.022],
 [-.31,.02,-.13,-.38,-.59,.020],[-.18,.02,-.24,-.21,-.69,.022],[.04,.02,-.26,.03,-.65,.020],[.22,.02,-.20,.29,-.61,.022],
 [-.08,.02,.04,-.13,-.73,.032],[.14,.02,.02,.17,-.67,.029]
 ].map(([x,y,z,end,len,r],i)=>({r,path:[[x,y,z],[x+(i%2?.09:-.08),len*.30,z+.035],[end+(i%2?-.09:.08),len*.66,z-.015],[end,len,z+.045]]}));
 const polyp={...copy(st[3]),body:{width:.115,height:.34,depth:.11,y:.36},normalEye:'round',colors:{body:'#87b6e2',light:'#d7ecff',branch:'#7aace0',tip:'#c0d9fa',blush:'#d597cc',stones:['#274c86','#3b60a1','#536bb4']},branches:[
  twig([[0,.61,0],[.02,.84,-.02],[.00,1.02,-.02]],.019,1.3),twig([[-.04,.60,0],[-.15,.78,0],[-.16,.93,0]],.019,1.3),
  twig([[.04,.60,0],[.17,.80,.01],[.20,.94,.02]],.020,1.3),twig([[-.08,.57,.02],[-.26,.70,.02],[-.28,.84,.04]],.019,1.3),
  twig([[.08,.58,.01],[.25,.72,.02],[.29,.80,.03]],.020,1.3),twig([[-.09,.56,.02],[-.25,.59,.03],[-.34,.71,.03]],.018,1.3),
  twig([[.09,.56,.02],[.26,.61,.03],[.35,.68,.03]],.018,1.3)
 ]};
 rows.jellyfish={why:'Rooted blue polyp01,young rounded bell04,and broad adult07 with numerous soft trailing filaments;one canonical face per source.',stages:{1:polyp,4:youngBell,7:mature}};
 return rows;
});
