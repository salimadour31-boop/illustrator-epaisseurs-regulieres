var L=require('./lib'); var ER=require(process.env.ERF||'../EpaisseursRegulieres.jsx').ER;
var data=require('./fontdata.json'); // créé par / created by: python3 fonts.py
var seed=12345; function rnd(){ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; }
function mk(word){ var sid=0; return word.glyphs.map(function(g){ return {id:'G'+(sid++)+g.ch,label:g.ch,evenodd:false,editable:true,contours:g.contours.map(function(c){return {pts:c.map(function(p){return {a:p.a.slice(),l:p.l.slice(),r:p.r.slice()};})};})}; }); }
function key(st){ return st.F.id<st.G.id? st.F.id+'|'+st.G.id : st.G.id+'|'+st.F.id; }
function moveFeat(sh,F,d){ var ct=sh.contours[F.c], n=ct.pts.length, ks=F.kind==='flat'?[F.s,(F.s+1)%n]:[F.k]; var v=[-F.nIn[0]*d,-F.nIn[1]*d];
  ks.forEach(function(k){ var p=ct.pts[k]; ['a','l','r'].forEach(function(q){ p[q]=[p[q][0]+v[0],p[q][1]+v[1]]; }); }); }
var o=ER.defaults(); var args=process.argv.slice(2); if(args[0]) o.tolPct=+args[0];
var tot={words:0,stems:0,irrIntact:0,inj:0,det:0,fixedExact:0,afterIrr:0,famsH:0,t:0, alertWords:0, conflicts:0, refused:0};
var perFont={};
data.forEach(function(w){
  var t0=Date.now(); var shapes=mk(w); var r=ER.analyzeAll(shapes,[],o); tot.t+=Date.now()-t0;
  var c=ER.countStatus(r.stems); tot.words++; tot.stems+=c.total; tot.irrIntact+=c.irregulier; if(c.irregulier) tot.alertWords++;
  perFont[w.font]=(perFont[w.font]||0)+c.irregulier;
  // injections: 3 per word
  for(var rep=0;rep<3;rep++){
    var shapes2=mk(w); var r2=ER.analyzeAll(shapes2,[],o);
    var cands=r2.stems.filter(function(s){ if(s.status!=='ok'||s.kind==='trait') return false; var f=r2.fams.filter(function(f){return f.key===s.fam;})[0]; var tg=f.targets.filter(function(t){return Math.abs(t.val-s.target)<1e-9;})[0]; return tg&&tg.count>=3 && s.F.movable && (s.F.kind!=='extIn'); });
    if(!cands.length) break;
    var st=cands[Math.floor(rnd()*cands.length)], k0=key(st), orig=st.t;
    var frac=(o.tolPct/100)*(0.3+rnd()*0.6)*(rnd()<0.5?-1:1), d=orig*frac;
    var sh=st.shape; moveFeat(sh,st.F,d);
    var r3=ER.analyzeAll(shapes2,[],o); tot.inj++;
    var hit=r3.stems.filter(function(s){return key(s)===k0;})[0];
    if(hit && hit.status==='irregulier') tot.det++;
    var plan=ER.planFix(r3.stems,o);
    shapes2.forEach(function(s){ if(plan.refused[s.id]) {tot.refused++; return;} var a=ER.applyToShape(s,plan); tot.conflicts+=a.conflicts; });
    var r4=ER.analyzeAll(shapes2,[],o);
    var h2=r4.stems.filter(function(s){return key(s)===k0;})[0];
    if(h2 && Math.abs(h2.t-orig)<=o.eps) tot.fixedExact++; else if(process.env.V) console.log('FAIL',w.font,w.word,st.shape.label,st.fam,orig.toFixed(3),'inj',d.toFixed(3),'det',hit&&hit.status,hit&&hit.target&&hit.target.toFixed(3),'after',h2?h2.t.toFixed(3)+' '+h2.status:'gone', hit&&hit.conflict?'CONF':'', plan.refused[st.shape.id]?'REF':'');
    tot.afterIrr+=ER.countStatus(r4.stems).irregulier;
  }
});
console.log(JSON.stringify(tot)); console.log(JSON.stringify(perFont));
