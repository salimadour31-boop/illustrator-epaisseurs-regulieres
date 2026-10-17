var fs=require('fs'); var SRC=fs.readFileSync(process.env.ERF||require('path').join(__dirname,'..','EpaisseursRegulieres.jsx'),'utf8');
var checks=0, fails=0; function check(c,m){checks++; if(!c){fails++; console.log('FAIL',m);} }
function PP(a,l,r){ var o={_a:a.slice(),_l:(l||a).slice(),_r:(r||a).slice()};
  Object.defineProperty(o,'anchor',{get:function(){return this._a.slice();},set:function(v){this._a=v.slice();}});
  Object.defineProperty(o,'leftDirection',{get:function(){return this._l.slice();},set:function(v){this._l=v.slice();}});
  Object.defineProperty(o,'rightDirection',{get:function(){return this._r.slice();},set:function(v){this._r=v.slice();}}); return o; }
var uid=0;
function Path(pts,opt){ opt=opt||{}; var p={typename:'PathItem',uuid:String(++uid),pathPoints:pts,closed:opt.closed!==false,filled:opt.filled!==false,stroked:!!opt.stroked,strokeWidth:opt.sw||0,evenodd:!!opt.evenodd,locked:!!opt.locked,hidden:false,guides:false,clipping:false,name:opt.name||'',parent:null,layer:null};
  p.duplicate=function(target){ var d=Path(this.pathPoints.map(function(q){return PP(q.anchor,q.leftDirection,q.rightDirection);}),{closed:this.closed}); target.pageItems.push(d); d.parent=target; DUPS++; return d; };
  Object.defineProperty(p,'geometricBounds',{get:function(){var xs=this.pathPoints.map(function(q){return q.anchor[0];}),ys=this.pathPoints.map(function(q){return q.anchor[1];});return [Math.min.apply(0,xs),Math.max.apply(0,ys),Math.max.apply(0,xs),Math.min.apply(0,ys)];}});
  return p; }
var DUPS=0;
function rectPath(x,y,w,h,rev,opt){ var a=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]; if(rev)a.reverse(); return Path(a.map(function(q){return PP(q);}),opt); }
function polyPath(a,opt){ return Path(a.map(function(q){return PP(q);}),opt); }
var K=0.5522847498;
function ellPath(cx,cy,rx,ry,rev){ var pts=[ [[cx+rx,cy],[cx+rx,cy-K*ry],[cx+rx,cy+K*ry]], [[cx,cy+ry],[cx+K*rx,cy+ry],[cx-K*rx,cy+ry]], [[cx-rx,cy],[cx-rx,cy+K*ry],[cx-rx,cy-K*ry]], [[cx,cy-ry],[cx-K*rx,cy-ry],[cx+K*rx,cy-ry]] ];
  if(rev){ pts.reverse(); pts=pts.map(function(p){return [p[0],p[2],p[1]];}); } return Path(pts.map(function(p){return PP(p[0],p[1],p[2]);})); }
function Compound(paths){ var c={typename:'CompoundPathItem',uuid:String(++uid),pathItems:paths,locked:false,hidden:false,name:'',layer:null};
  paths.forEach(function(p){p.parent=c;}); c.duplicate=function(t){t.pageItems.push({typename:'CompoundPathItem'}); DUPS++;}; Object.defineProperty(c,'geometricBounds',{get:function(){return paths[0].geometricBounds;}}); return c; }
function Group(items){ var g={typename:'GroupItem',uuid:String(++uid),pageItems:items,locked:false,hidden:false,name:'',layer:null}; items.forEach(function(i){i.parent=g;}); g.geometricBounds=[0,0,0,0]; return g; }
function Layer(name){ var L={typename:'Layer',name:name,locked:false,visible:true,printable:true,pageItems:[],parent:null};
  L.pathItems={add:function(){ var p=Path([],{filled:false}); p.setEntirePath=function(a){p.pathPoints=a.map(function(q){return PP(q);});}; p.remove=function(){L.pageItems.splice(L.pageItems.indexOf(p),1);}; L.pageItems.push(p); p.kind='mark'; return p; }};
  L.textFrames={pointText:function(at){ var t={typename:'TextFrame',at:at,contents:'',textRange:{characterAttributes:{}},remove:function(){L.pageItems.splice(L.pageItems.indexOf(t),1);}}; L.pageItems.push(t); return t; }};
  L.zOrder=function(){}; return L; }
function Doc(sel,cs){ var d={name:'test.ai',saved:true,fullName:'/tmp/test.ai',documentColorSpace:cs||'RGB',selection:sel,layers:[]};
  d.path={exists:true,toString:function(){return '/tmp/ertest';}}; d.layers.add=function(){var l=Layer('Layer'); d.layers.unshift(l); return l;}; return d; }
var FILES={};
function makeEnv(docs,button,cfgOverride){
  var alerts=[]; var env={
    app:{documents:docs,activeDocument:docs[0],redraw:function(){},locale:'fr_FR'},
    $:{locale:'fr_FR'}, alert:function(m){alerts.push(String(m));},
    DocumentColorSpace:{CMYK:'CMYK',RGB:'RGB'}, ZOrderMethod:{BRINGTOFRONT:1}, ElementPlacement:{PLACEATEND:1},
    RGBColor:function(){this.t='rgb';}, CMYKColor:function(){this.t='cmyk';},
    Folder:{userData:'/tmp/ud',desktop:{exists:true,toString:function(){return '/tmp/desk';}}},
    File:function(p){ var f=this; f.p=String(p); f.fsName=f.p; Object.defineProperty(f,'exists',{get:function(){return FILES[f.p]!==undefined;}}); var buf='',lines=[],pos=0,mode='';
       f.open=function(m){mode=m; if(m==='r'){lines=(FILES[f.p]||'').split('\n'); if(lines[lines.length-1]==='')lines.pop(); pos=0; f.eof=pos>=lines.length;} else buf=''; return true;};
       f.readln=function(){var l=lines[pos++]; f.eof=pos>=lines.length; return l;}; f.writeln=function(s){buf+=s+'\n';}; f.write=function(s){buf+=s;};
       f.close=function(){ if(mode==='w') FILES[f.p]=buf; }; },
    Window:function(){ var w=this, ctrls=[]; function mk(type,text,props){ var c={type:type,text:text===undefined?'':String(text),value:false,characters:0,items:[],add:add,alignChildren:null};
         if(type==='dropdownlist'){ c.items=text.map(function(t){return {text:t};}); c.text=''; Object.defineProperty(c,'selection',{get:function(){return c._sel;},set:function(v){c._sel=typeof v==='number'?c.items[v]:v;}}); }
         ctrls.push(c); return c; }
       function add(type,b,text,props){ return mk(type,text,props); }
       w.add=add; w.close=function(){}; w.show=function(){ var btn=ctrls.filter(function(c){return c.type==='button';});
         if(cfgOverride) cfgOverride(ctrls);
         var b=btn.filter(function(c){return c.text===button;})[0]; b.onClick(); return 1; }; }
  };
  return {env:env,alerts:alerts};
}
function runScript(docs,button,ov){ var E=makeEnv(docs,button,ov); var names=Object.keys(E.env); var f=new Function(names.concat(['module']).join(','), SRC); f.apply(null,names.map(function(n){return E.env[n];}).concat([undefined])); return E.alerts; }
function setByLabel(ctrls,label,val){ var i=ctrls.findIndex(function(c){return c.text===label;}); return i; }
// helpers to find edit fields after a statictext label
function fieldAfter(ctrls,label){ var i=ctrls.findIndex(function(c){return c.type==='statictext'&&c.text===label;}); return ctrls[i+1]; }
function ctl(ctrls,text){ return ctrls.filter(function(c){return c.text===text;})[0]; }

// 1. no doc
var a=runScript([], 'Analyser'); check(/Aucun document/.test(a[0]),'noDoc '+a);
// 2. empty selection
a=runScript([Doc([])],'Analyser'); check(/Rien n'est s/.test(a[0]),'noSel');
// 3. TextRange selection
a=runScript([Doc({typename:'TextRange'})],'Analyser'); check(/Quittez/.test(a[0]),'textSel');
// 4. text only
a=runScript([Doc([{typename:'TextFrame',uuid:'t1'}])],'Analyser'); check(/Aucune forme/.test(a[0]) && /1 texte/.test(a[0]),'nothing '+a);
// Scene
function scene(){
  var H=polyPath([[100,0],[120,0],[120,45],[160,45],[160,0],[180.3,0],[180.3,100],[160,100],[160,57],[120,57],[120,100],[100,100]],{name:'H'});
  var I=rectPath(0,0,20,100); var I2=rectPath(200,0,20,100);
  var O=Compound([ellPath(290,50,40,50),ellPath(290,50,20,38,true)]); var O2=Compound([ellPath(390,50,40,50),ellPath(390,50,20.4,38,true)]);
  var T={typename:'TextFrame',uuid:'tt'}; var G=Group([H,I,I2,T]);
  var locked=rectPath(500,0,21,100,false,{locked:true});
  return {H:H,I:I,O:O,O2:O2,G:G,sel:[G,O,O2,locked]};
}
// 5. analyse
var s=scene(), d=Doc(s.sel); var beforeH=JSON.stringify(s.H.pathPoints.map(function(q){return q.anchor;}));
a=runScript([d],'Analyser');
check(JSON.stringify(s.H.pathPoints.map(function(q){return q.anchor;}))===beforeH,'analyse changed geometry');
var mk=d.layers.filter(function(l){return l.name==='Épaisseurs — repères';})[0];
check(mk && mk.printable===false,'marker layer non printable');
var lines=mk.pageItems.filter(function(i){return i.kind==='mark';}), texts=mk.pageItems.filter(function(i){return i.typename==='TextFrame';});
check(lines.length===15,'marker lines '+lines.length);
check(texts.length===4 && texts.every(function(t){return /→/.test(t.contents);}),'labels '+texts.length+' '+texts.map(function(t){return t.contents;}));
check(/20,300 pt → 20,000 pt/.test(texts.map(function(t){return t.contents;}).join('|')),'label format FR');
check(Array.isArray(d.selection) && d.selection.length===4 && d.selection.indexOf(s.H)>=0 && d.selection.indexOf(s.O2)>=0,'selection irregular '+(d.selection&&d.selection.length));
check(/à égaliser/.test(a[0]) && /1 texte/.test(a[0]) && /1 verrouill/.test(a[0]),'summary '+a[0]);
console.log('--- analyse summary:\n'+a[0]);
// 6. fix (default sym) + report
var s2=scene(), d2=Doc(s2.sel); DUPS=0;
a=runScript([d2],'Corriger',function(c){ ctl(c,'Enregistrer un rapport .txt').value=true; });
var Hx=s2.H.pathPoints.map(function(q){return q.anchor[0];});
check(Math.abs(Hx[5]-Hx[4]-20)<1e-9 && Math.abs(Hx[6]-Hx[7]-20)<1e-9,'H stems equalised '+Hx);
var bl=d2.layers.filter(function(l){return l.name==='Épaisseurs — originaux';})[0];
check(bl && bl.visible===false && bl.locked===true && DUPS===2,'backup layer '+DUPS);
check(/Écarts restants après correction : 0/.test(a[0]),'remaining 0 '+a[0]);
var rep=FILES['/tmp/ertest/test_epaisseurs.txt']; check(rep && /Fûts verticaux droits/.test(rep),'report saved');
console.log('--- fix summary:\n'+a[0]); console.log('--- report:\n'+rep);
// 7. second fix: nothing to do
a=runScript([d2],'Corriger'); check(/Rien à corriger/.test(a[0]),'idempotent '+a[0]);
// 8. inner mode keeps outer silhouette of O2 (inner ellipse moves)
var s3=scene(), d3=Doc(s3.sel); var outer0=JSON.stringify(s3.O2.pathItems[0].pathPoints.map(function(q){return q.anchor;}));
a=runScript([d3],'Corriger',function(c){ ctl(c,'Garder la silhouette extérieure (déplacer les parois intérieures)').value=true; ctl(c,'Déplacer les deux parois (symétrique)').value=false; });
check(JSON.stringify(s3.O2.pathItems[0].pathPoints.map(function(q){return q.anchor;}))===outer0,'outer O2 unchanged');
var inn=s3.O2.pathItems[1].pathPoints.map(function(q){return q.anchor;}); var ix=inn.map(function(q){return q[0];}); check(Math.abs(Math.max.apply(0,ix)-Math.min.apply(0,ix)-40)<1e-6,'inner O2 width 40 '+JSON.stringify(inn));
var hx3=s3.H.pathPoints.map(function(q){return q.anchor[0];}); check(hx3[5]===180.3 && Math.abs(hx3[4]-160.3)<1e-9,'H inner moved, outer kept '+hx3);
// 9. strokes, pictos mode, CMYK
var st1=Path([PP([0,0]),PP([50,0])],{closed:false,filled:false,stroked:true,sw:2}), st2=Path([PP([0,10]),PP([50,10])],{closed:false,filled:false,stroked:true,sw:1.97}), st3=Path([PP([0,20]),PP([50,20])],{closed:false,filled:false,stroked:true,sw:2});
var icon=rectPath(100,0,2,40);
var d4=Doc([st1,st2,st3,icon],'CMYK');
a=runScript([d4],'Corriger',function(c){ ctl(c,'Pictos (une seule famille, contours compris)').value=true; ctl(c,'Lettrage / logo (familles séparées : verticaux, horizontaux, droits, courbes)').value=false; });
check(st2.strokeWidth===2,'stroke equalised '+st2.strokeWidth);
console.log('--- pictos summary:\n'+a[0]);
var mk4=d4.layers.filter(function(l){return l.name==='Épaisseurs — repères';})[0]; check(mk4 && mk4.pageItems.length>0,'cmyk markers');
// 10. mm unit + imposed targets
var s5=scene(), d5=Doc(s5.sel);
a=runScript([d5],'Corriger',function(c){ fieldAfter(c,'Épaisseurs imposées (facultatif, ex. 12 ; 8,5) :').text='7,1'; c.filter(function(x){return x.type==='dropdownlist';})[0].selection=1; fieldAfter(c,'Ignorer les écarts inférieurs à :').text='0,002'; });
var hx5=s5.H.pathPoints.map(function(q){return q.anchor[0];}); check(Math.abs((hx5[1]-hx5[0])-7.1*72/25.4)<1e-6,'imposed 7.1 mm '+(hx5[1]-hx5[0]));
console.log('--- mm summary:\n'+a[0]);
// 11. bad number
a=runScript([Doc(scene().sel)],'Analyser',function(c){ fieldAfter(c,'Écart toléré dans une famille (%) :').text='abc'; c.filter(function(x){return x.text==='Annuler';})[0].onClick=function(){}; });
check(/Valeur numérique incorrecte/.test(a[0]),'bad number alert '+a[0]);
// 12. cancel
var s6=scene(), d6=Doc(s6.sel); a=runScript([d6],'Annuler'); check(a.length===0 && d6.layers.length===0,'cancel');
// 13. settings persisted
check(/side=inner|side=sym/.test(FILES['/tmp/ud/EpaisseursRegulieres.ini']||''),'cfg saved');
// 14. English locale
var SRC_EN=SRC; var s7=scene(), d7=Doc(s7.sel); var E7=makeEnv([d7],'Analyse'); E7.env.$={locale:'en_US'}; E7.env.app.locale='en_US'; var n7=Object.keys(E7.env); new Function(n7.concat(['module']).join(','),SRC).apply(null,n7.map(function(n){return E7.env[n];}).concat([undefined])); check(/to equalise/.test(E7.alerts[0]),'EN '+E7.alerts[0]);
console.log('checks',checks,'fails',fails);
