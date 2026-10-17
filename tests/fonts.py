import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
FONTS = """/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
/usr/share/fonts/truetype/sand-box/google/Archivo/Archivo-VariableFont_wdth,wght.ttf
/usr/share/fonts/truetype/sand-box/google/Barlow/Barlow-Regular.ttf
/usr/share/fonts/truetype/sand-box/google/Fira Sans/FiraSans-Regular.ttf
/usr/share/fonts/truetype/sand-box/google/IBM Plex Sans/IBMPlexSans-VariableFont_wdth,wght.ttf
/usr/share/fonts/truetype/sand-box/google/Inter/Inter-VariableFont_opsz,wght.ttf
/usr/share/fonts/truetype/sand-box/google/Lato/Lato-Regular.ttf
/usr/share/fonts/truetype/sand-box/google/Montserrat/Montserrat-VariableFont_wght.ttf
/usr/share/fonts/truetype/sand-box/google/Noto Sans/NotoSans-VariableFont_wdth,wght.ttf
/usr/share/fonts/truetype/sand-box/google/Open Sans/OpenSans-VariableFont_wdth,wght.ttf
/usr/share/fonts/truetype/sand-box/google/Oswald/Oswald-VariableFont_wght.ttf
/usr/share/fonts/truetype/sand-box/google/PT Sans/PTSans-Regular.ttf
/usr/share/fonts/truetype/sand-box/google/Poppins/Poppins-Regular.ttf
/usr/share/fonts/truetype/sand-box/google/Raleway/Raleway-VariableFont_wght.ttf
/usr/share/fonts/truetype/sand-box/google/Roboto/Roboto-VariableFont_wdth,wght.ttf
/usr/share/fonts/truetype/sand-box/google/Source Sans 3/SourceSans3-VariableFont_wght.ttf
/usr/share/fonts/truetype/sand-box/google/Ubuntu/Ubuntu-Regular.ttf
/usr/share/fonts/truetype/sand-box/google/Work Sans/WorkSans-VariableFont_wght.ttf""".split("\n")
WORDS = ["HELLO", "minimum", "Hamburgefonstiv", "BONJOUR", "LIBERTE", "typographie"]
class P(BasePen):
    def __init__(s, gs, sc, dx):
        BasePen.__init__(s, gs); s.sc=sc; s.dx=dx; s.contours=[]; s.cur=None
    def T(s,p): return [p[0]*s.sc+s.dx, p[1]*s.sc]
    def _moveTo(s,p):
        q=s.T(p); s.cur=[{'a':q,'l':q[:],'r':q[:]}]; s.contours.append(s.cur)
    def _lineTo(s,p):
        q=s.T(p); s.cur.append({'a':q,'l':q[:],'r':q[:]})
    def _curveToOne(s,c1,c2,p):
        s.cur[-1]['r']=s.T(c1); q=s.T(p); s.cur.append({'a':q,'l':s.T(c2),'r':q[:]})
    def _qCurveToOne(s,c,p):
        p0=s._getCurrentPoint()
        c1=(p0[0]+2/3*(c[0]-p0[0]), p0[1]+2/3*(c[1]-p0[1])); c2=(p[0]+2/3*(c[0]-p[0]), p[1]+2/3*(c[1]-p[1]))
        s._curveToOne(c1,c2,p)
    def _closePath(s):
        c=s.cur
        if len(c)>1 and abs(c[-1]['a'][0]-c[0]['a'][0])<1e-9 and abs(c[-1]['a'][1]-c[0]['a'][1])<1e-9:
            c[0]['l']=c[-1]['l']; c.pop()
    _endPath=_closePath
out=[]
for fp in FONTS:
    f=TTFont(fp); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm; sc=100.0/upm
    name=fp.split('/')[-1].split('-')[0].split('.')[0]
    for w in WORDS:
        x=0; glyphs=[]
        for ch in w:
            gn=cmap.get(ord(ch));
            if gn is None: continue
            g=gs[gn]; pen=P(gs,sc,x); g.draw(pen)
            glyphs.append({'ch':ch,'contours':[c for c in pen.contours if len(c)>=2]})
            x+=g.width*sc+30
        out.append({'font':name,'word':w,'glyphs':glyphs})
json.dump(out,open(__import__('os').path.join(__import__('os').path.dirname(__file__),'fontdata.json'),'w'))
print(len(out),'words')
