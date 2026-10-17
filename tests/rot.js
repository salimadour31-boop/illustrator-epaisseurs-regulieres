var L=require('./lib'); var ER=require(process.env.ERF||'../EpaisseursRegulieres.jsx').ER; var checks=0,fails=0; function check(c,m){checks++; if(!c){fails++;console.log('FAIL',m);}}
function rot(sh,ang,cx,cy){ var c=Math.cos(ang),s=Math.sin(ang); sh.contours.forEach(function(ct){ct.pts.forEach(function(p){['a','l','r'].forEach(function(k){var x=p[k][0]-cx,y=p[k][1]-cy; p[k]=[cx+c*x-s*y, cy+s*x+c*y];});});}); return sh; }
[17,30,45,62].forEach(function(deg){
  var a=deg*Math.PI/180, o=ER.defaults();
  var I1=rot(L.shape([L.rect(0,0,20,100)]),a,0,0), I2=rot(L.shape([L.rect(50,0,20,100)]),a,0,0), I3=rot(L.shape([L.rect(100,0,20.4,100)]),a,0,0);
  var r=ER.analyzeAll([I1,I2,I3],[],o); var d=r.stems.filter(function(s){return s.fam==='D-droit'&&s.t<50;});
  check(d.length===3,'diag stems '+deg+' '+d.length);
  var irr=r.stems.filter(function(s){return s.status==='irregulier';}); check(irr.length===1 && Math.abs(irr[0].t-20.4)<1e-6,'diag irregular '+deg);
  var plan=ER.planFix(r.stems,o); [I1,I2,I3].forEach(function(s){ER.applyToShape(s,plan);});
  var r2=ER.analyzeAll([I1,I2,I3],[],o); check(ER.countStatus(r2.stems).irregulier===0,'diag fixed '+deg);
  var w=r2.stems.filter(function(s){return s.shape===I3&&s.t<50;})[0]; check(w&&Math.abs(w.t-20)<1e-6,'diag width '+(w&&w.t));
  o.diagonals=false; var r3=ER.analyzeAll([I1,I2,I3],[],o); check(r3.stems.filter(function(s){return s.fam==='D-droit';}).length===0,'diag off');
});
// overlapping contours nonzero (variable-font style): two overlapping rects in one shape, L-shape
var Ls=L.shape([L.rect(0,0,20,100),L.rect(0,0,70,20)]); var rl=ER.analyzeShape(Ls,ER.defaults());
var v=rl.filter(function(s){return s.axis==='V'&&Math.abs(s.t-20)<1e-6;}), h=rl.filter(function(s){return s.axis==='H'&&Math.abs(s.t-20)<1e-6;});
check(v.length>=1&&h.length>=1,'overlap L stems '+rl.map(function(s){return s.axis+s.t.toFixed(2);}));
check(rl.every(function(s){return s.t<=70+1e-6;}),'overlap no crazy');
// evenodd with same direction contours O
var Oe=L.shape([L.ellipse(0,0,40,50),L.ellipse(0,0,20,38)],true); var ro=ER.analyzeShape(Oe,ER.defaults()); check(ro.length===4,'evenodd O '+ro.length);
// nonzero same direction (counter filled) -> no stems inside counter, measures whole
var On=L.shape([L.ellipse(0,0,40,50),L.ellipse(0,0,20,38)],false); var rn=ER.analyzeShape(On,ER.defaults()); check(rn.every(function(s){return s.t>50;}),'nonzero filled counter '+rn.map(function(s){return s.t.toFixed(1)}));
console.log('rot checks',checks,'fails',fails);
