var L=require('./lib'); var ER=require(process.env.ERF||'../EpaisseursRegulieres.jsx').ER;
var seed=777; function rnd(){ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; }
function glyph(type,x){ var V=20,Hh=14,rev=rnd()<0.5;
  switch(type){
   case 'I': return [L.rect(x,0,V,100)];
   case 'H': return [L.poly([[x,0],[x+V,0],[x+V,43],[x+60,43],[x+60,0],[x+60+V,0],[x+60+V,100],[x+60,100],[x+60,43+Hh],[x+V,43+Hh],[x+V,100],[x,100]])];
   case 'E': return [L.poly([[x,0],[x+60,0],[x+60,Hh],[x+V,Hh],[x+V,43],[x+50,43],[x+50,43+Hh],[x+V,43+Hh],[x+V,100-Hh],[x+60,100-Hh],[x+60,100],[x,100]])];
   case 'O': return [L.ellipse(x+40,50,40,50),L.ellipse(x+40,50,18,50-15,true)];
   case 'D': return [L.rect(x,0,60,100), L.rect(x+V,Hh,60-2*V,100-2*Hh,true)];
  } }
function word(n,evenodd){ var types=['I','H','E','O','D'], x=0, shapes=[];
  for(var i=0;i<n;i++){ var t=types[Math.floor(rnd()*types.length)]; var cs=glyph(t,x);
    if(evenodd){ cs.forEach(function(c,ci){ if(ci>0){ c.pts.reverse(); c.pts=c.pts.map(function(p){return {a:p.a,l:p.r,r:p.l};}); } }); }
    var sh=L.shape(cs,evenodd); sh.label=t; shapes.push(sh); x+=100; }
  return shapes; }
function key(st){ return st.F.id<st.G.id? st.F.id+'|'+st.G.id : st.G.id+'|'+st.F.id; }
function moveFeat(sh,F,d){ var ct=sh.contours[F.c], n=ct.pts.length, ks=F.kind==='flat'?[F.s,(F.s+1)%n]:[F.k]; var v=[-F.nIn[0]*d,-F.nIn[1]*d];
  ks.forEach(function(k){ var p=ct.pts[k]; ['a','l','r'].forEach(function(q){ p[q]=[p[q][0]+v[0],p[q][1]+v[1]]; }); }); }
function bbox(sh){ var b=[1e9,1e9,-1e9,-1e9]; sh.contours.forEach(function(c){c.pts.forEach(function(p){ b[0]=Math.min(b[0],p.a[0]);b[1]=Math.min(b[1],p.a[1]);b[2]=Math.max(b[2],p.a[0]);b[3]=Math.max(b[3],p.a[1]);});}); return b; }
var R={scenes:0,checks:0,fails:0,injected:0,detected:0,restored:0,remainAfter:0,idemMoves:0,silhouetteKept:0,silhouetteChecks:0,falseIntact:0};
function check(c,msg){ R.checks++; if(!c){ R.fails++; if(R.fails<15) console.log('FAIL',msg);} }
['sym','inner'].forEach(function(side){
 [false,true].forEach(function(eo){
  for(var sc=0;sc<150;sc++){
    var o=ER.defaults(); o.side=side; R.scenes++;
    var shapes=word(3+Math.floor(rnd()*5),eo);
    var r0=ER.analyzeAll(shapes,[],o); var c0=ER.countStatus(r0.stems);
    check(c0.irregulier===0,'intact has irregular '+side+eo); if(c0.irregulier) R.falseIntact+=c0.irregulier;
    // inject 1-3 errors on distinct shapes
    var inj=[], used={};
    var k=1+Math.floor(rnd()*3);
    for(var q=0;q<k;q++){
      var cand=r0.stems.filter(function(s){ if(s.kind==='trait'||used[s.shape.id]||!s.F.movable) return false; var peers=r0.stems.filter(function(t){return t!==s&&t.fam===s.fam&&t.shape!==s.shape&&Math.abs(t.t-s.t)<1e-6;}); return peers.length>=1;}); if(!cand.length)break;
      var st=cand[Math.floor(rnd()*cand.length)]; used[st.shape.id]=1;
      var d=st.t*(o.tolPct/100)*(0.3+0.6*rnd())*(rnd()<0.5?-1:1); moveFeat(st.shape,st.F,d); inj.push({k:key(st),orig:st.t,sh:st.shape}); }
    var b1=shapes.map(bbox);
    var r1=ER.analyzeAll(shapes,[],o);
    inj.forEach(function(j){ R.injected++; var h=r1.stems.filter(function(s){return key(s)===j.k;})[0]; if(h&&h.status==='irregulier')R.detected++; check(h&&h.status==='irregulier','not detected '+(h?h.fam+' '+h.t.toFixed(3)+' st='+h.status+' tg='+h.target:'gone')+' '+j.sh.label); });
    var plan=ER.planFix(r1.stems,o); global.PLAN=plan; shapes.forEach(function(s){ if(!plan.refused[s.id]) ER.applyToShape(s,plan); });
    var r2=ER.analyzeAll(shapes,[],o); var c2=ER.countStatus(r2.stems); R.remainAfter+=c2.irregulier; check(c2.irregulier===0,'remaining after fix '+side+eo);
    inj.forEach(function(j){ var h=r2.stems.filter(function(s){return key(s)===j.k;})[0]; var ok=h&&Math.abs(h.t-j.orig)<=o.eps; if(ok)R.restored++; check(ok,'not restored '+(h?h.t+' vs '+j.orig:'gone')); });
    check(r2.stems.length===r1.stems.length,'stem count changed '+r1.stems.length+'->'+r2.stems.length);
    if(side==='inner'){ shapes.forEach(function(s,i){ var irr=r1.stems.filter(function(t){return t.shape===s&&t.status==='irregulier';}); if(!irr.length||!irr.every(function(t){return ER.wallInner(t.F)||ER.wallInner(t.G);})) return; var b=bbox(s); R.silhouetteChecks++; var same=b.every(function(v,t){return Math.abs(v-b1[i][t])<1e-6;}); if(same)R.silhouetteKept++; if(!same){ console.log('SIL',s.label,JSON.stringify(b1[i]),JSON.stringify(b), irr.map(function(t){return t.fam+' '+t.t.toFixed(3)+'->'+t.target+' F='+t.F.id+(ER.wallInner(t.F)?'(in)':'(out)')+' G='+t.G.id+(ER.wallInner(t.G)?'(in)':'(out)')+' res='+t.residual;}).join(' ; ')); } check(same,'silhouette moved '+s.label); }); }
    // idempotence
    var plan2=ER.planFix(r2.stems,o); var mv=0; shapes.forEach(function(s){ mv+=ER.applyToShape(s,plan2).moved; }); R.idemMoves+=mv; check(mv===0,'second fix moved '+mv);
  }
 });
});
console.log(JSON.stringify(R));
