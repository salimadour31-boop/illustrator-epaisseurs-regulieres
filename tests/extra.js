var L=require('./lib'); var ER=require(process.env.ERF||'../EpaisseursRegulieres.jsx').ER; var checks=0,fails=0; function check(c,m){checks++; if(!c){fails++;console.log('FAIL',m);}}
var o=ER.defaults();
// 1. ray touching a vertex (notch apex exactly on the ray) must not count as a crossing
var notch=ER.prepShape(L.shape([L.poly([[-5,-5],[30,-5],[30,15],[14,15],[10,5],[6,15],[-5,15]])]));
var h=ER.walkRay(notch,[0,5],[1,0]); check(h && Math.abs(h.d-30)<1e-9,'touch apex exit '+(h&&h.d));
var h2=ER.walkRay(notch,[0,5.0000001],[1,0]); check(h2 && h2.d<11,'just above apex exits at notch '+(h2&&h2.d));
var notchE=ER.prepShape(L.shape([L.poly([[-5,-5],[30,-5],[30,15],[14,15],[10,5],[6,15],[-5,15]])],true)); var he=ER.walkRay(notchE,[0,5],[1,0]); check(he && Math.abs(he.d-30)<1e-9,'touch apex evenodd '+(he&&he.d));
check(ER.insideAt(notchE,[20,5]) && !ER.insideAt(notchE,[10,10]),'inside evenodd notch');
// collinear edge on the ray
var step=ER.prepShape(L.shape([L.poly([[0,0],[40,0],[40,5],[20,5],[20,10],[0,10]])]));
var h3=ER.walkRay(step,[1,5],[1,0]); check(h3 && Math.abs(h3.d-39)<1e-9,'collinear run exit (end of run) '+(h3&&h3.d));
// 2. diagonal neighbour keeps its angle when the vertical wall moves (corner slides along the diagonal)
function N(x,w){ return L.shape([L.poly([[x,0],[x+w,0],[x+w,60],[x+60,0],[x+80,0],[x+80,100],[x+60,100],[x+60,40],[x+w,100],[x,100]])]); }
var n1=N(0,20),n2=N(200,20),n3=N(400,20.5);
var r=ER.analyzeAll([n1,n2,n3],[],o); var plan=ER.planFix(r.stems,o); [n1,n2,n3].forEach(function(s){ER.applyToShape(s,plan);});
var p=n3.contours[0].pts.map(function(q){return q.a;});
function ang(a,b){return Math.atan2(b[1]-a[1],b[0]-a[0]);}
check(Math.abs(ang(p[2],p[3])-ang([420.5,60],[460,0]))<1e-9,'diagonal angle kept '+JSON.stringify(p.slice(1,4)));
check(Math.abs(p[1][0]-p[0][0]-20)<1e-9 || Math.abs(p[9][0]-p[0][0])<1e-9,'N stem fixed');
var r2=ER.analyzeAll([n1,n2,n3],[],o); check(ER.countStatus(r2.stems).irregulier===0,'N fixed '+JSON.stringify(ER.countStatus(r2.stems)));
// 3. pill: only its thickness, not its length; and no duplicate measure at flat/curve junctions
var K=0.5522847498; function pill(x,y,len,hh){ var r=hh/2; return L.shape([{pts:[
 {a:[x+r,y],l:[x+r-K*r,y],r:[x+r,y]}, {a:[x+len-r,y],l:[x+len-r,y],r:[x+len-r+K*r,y]}, {a:[x+len,y+r],l:[x+len,y+r-K*r],r:[x+len,y+r+K*r]},
 {a:[x+len-r,y+hh],l:[x+len-r+K*r,y+hh],r:[x+len-r,y+hh]}, {a:[x+r,y+hh],l:[x+r,y+hh],r:[x+r-K*r,y+hh]}, {a:[x,y+r],l:[x,y+r+K*r],r:[x,y+r-K*r]} ]}]); }
var pl=ER.analyzeShape(pill(0,0,100,20),o); check(pl.length===1 && Math.abs(pl[0].t-20)<1e-9 && pl[0].axis==='H','pill stems '+pl.map(function(s){return s.axis+s.kind+s.t.toFixed(2);}));
// ellipse length rejected, ring kept
var el=ER.analyzeShape(L.shape([L.ellipse(0,0,40,10)]),o); check(el.every(function(s){return s.t<=20+1e-9;}),'ellipse length rejected '+el.map(function(s){return s.t.toFixed(1);}));
// 4. hitIs on joints at flat endpoints
var sq=ER.prepShape(L.shape([L.rect(0,0,10,10)])); ER.analyzeShape(sq,o);
var G=sq.flatBySeg['0:1']; check(G && ER._hitIs(sq,{c:0,joint:true,k:1},G) && ER._hitIs(sq,{c:0,joint:true,k:2},G) && !ER._hitIs(sq,{c:0,joint:true,k:3},G),'hitIs joints');
// ray aimed exactly at a corner identifies the parallel flat there
var F=sq.flatBySeg['0:3']; var hh=ER.walkRay(sq,[0.001,0],[1,0]);
console.log('extra checks',checks,'fails',fails);
