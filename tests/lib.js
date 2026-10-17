var fs=require('fs');

function P(x,y){return {a:[x,y],l:[x,y],r:[x,y]};}
function poly(pts){return {pts:pts.map(function(p){return P(p[0],p[1]);})};}
function rect(x,y,w,h,rev){var p=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]; if(rev)p.reverse(); return poly(p);}
var K=0.5522847498;
function ellipse(cx,cy,rx,ry,rev){ // 4 anchors at extremes
  var pts=[ {a:[cx+rx,cy],l:[cx+rx,cy-K*ry],r:[cx+rx,cy+K*ry]},
            {a:[cx,cy+ry],l:[cx+K*rx,cy+ry],r:[cx-K*rx,cy+ry]},
            {a:[cx-rx,cy],l:[cx-rx,cy+K*ry],r:[cx-rx,cy-K*ry]},
            {a:[cx,cy-ry],l:[cx-K*rx,cy-ry],r:[cx+K*rx,cy-ry]} ];
  if(rev){ pts.reverse(); pts=pts.map(function(p){return {a:p.a,l:p.r,r:p.l};}); }
  return {pts:pts};
}
var sid=0;
function shape(contours,evenodd){ return {id:'S'+(sid++),contours:contours,evenodd:!!evenodd,editable:true}; }
function clone(sh){ return {id:sh.id,evenodd:sh.evenodd,editable:sh.editable,contours:sh.contours.map(function(c){return {pts:c.pts.map(function(p){return {a:p.a.slice(),l:p.l.slice(),r:p.r.slice()};})};})}; }
module.exports={P:P,poly:poly,rect:rect,ellipse:ellipse,shape:shape,clone:clone};
