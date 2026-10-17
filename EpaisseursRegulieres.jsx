//@target illustrator
/*
 * EpaisseursRegulieres.jsx — v1.0.0 (2026-10-17)
 * Auteur / Author : Amirouche Amwanes — Licence MIT (voir LICENSE)
 * https://github.com/salimadour31-boop/illustrator-epaisseurs-regulieres
 *
 * FR — Mesure automatiquement les épaisseurs (fûts verticaux, traverses horizontales,
 *      diagonales, panses courbes aux extrêmes) des lettrages, logos et pictos
 *      VECTORISÉS, regroupe les valeurs proches en familles, signale les épaisseurs
 *      PRESQUE égales (12,13 pt au lieu de 12 pt) et peut les égaliser exactement en
 *      déplaçant les parois (symétriquement ou en gardant la silhouette extérieure).
 *      Les contours (traits) peuvent être comparés aux formes vectorisées (pictos).
 *      Repères sur un calque non imprimable, rapport .txt, copie des originaux.
 * EN — Automatically measures the thickness of stems, bars, diagonals and round
 *      stems (at extremes) in OUTLINED lettering, logos and icons, clusters close
 *      values into families, flags NEARLY equal thicknesses and can make them exact
 *      by moving the walls (symmetrically or keeping the outer silhouette). Strokes
 *      can be compared with outlined shapes (icon sets). Non-printing markers layer,
 *      .txt report, backup copy of the originals.
 *
 * Code 100 % original. Aucun appel réseau, aucune collecte de données.
 * 100% original code. No network access, no data collection.
 * Travaillez sur une copie du fichier. / Work on a copy of your file.
 * Statut : non testé dans Illustrator (voir README). / Not tested in Illustrator.
 */
// ============================================================================
//  MOTEUR GÉOMÉTRIQUE (fonctions pures, sans DOM Illustrator)
//  GEOMETRY ENGINE (pure functions, no Illustrator DOM)
//  Unités internes : points (pt). Internal units: points.
// ============================================================================
var ER = (function () {
    var DEG = Math.PI / 180;
    var ZT = 1e-7;          // tolérance « sur le rayon » / "on the ray" tolerance (pt)

    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function mul(a, k) { return [a[0] * k, a[1] * k]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
    function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
    function vlen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
    function unit(a) { var l = vlen(a); return l > 0 ? [a[0] / l, a[1] / l] : [0, 0]; }
    function perp(a) { return [-a[1], a[0]]; }
    function copyPt(a) { return [a[0], a[1]]; }

    // --- Bézier cubique / cubic Bézier ------------------------------------
    function bezPt(s, t) {
        var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0],
                a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
    }
    function bezD(s, t) {
        var u = 1 - t, a = 3 * u * u, b = 6 * u * t, c = 3 * t * t;
        return [a * (s[1][0] - s[0][0]) + b * (s[2][0] - s[1][0]) + c * (s[3][0] - s[2][0]),
                a * (s[1][1] - s[0][1]) + b * (s[2][1] - s[1][1]) + c * (s[3][1] - s[2][1])];
    }
    function bezDD(s, t) {
        var u = 1 - t;
        return [6 * u * (s[2][0] - 2 * s[1][0] + s[0][0]) + 6 * t * (s[3][0] - 2 * s[2][0] + s[1][0]),
                6 * u * (s[2][1] - 2 * s[1][1] + s[0][1]) + 6 * t * (s[3][1] - 2 * s[2][1] + s[1][1])];
    }
    // Rayon de courbure si la courbe se referme vers la matière (convexe), sinon Infinity.
    // Curvature radius when the curve bends towards the fill (convex), else Infinity.
    function convexRadius(s, t, nIn) {
        var d1 = bezD(s, t), d2 = bezDD(s, t), L = vlen(d1);
        if (L < 1e-9) { return Infinity; }
        var k = cross(d1, d2) / (L * L * L);
        if (Math.abs(k) < 1e-12) { return Infinity; }
        var side = dot(perp(mul(d1, 1 / L)), nIn) * k;
        return side > 0 ? 1 / Math.abs(k) : Infinity;
    }
    function tangentAt(s, t) {
        var d = bezD(s, t);
        if (vlen(d) < 1e-9) {
            d = bezD(s, t < 0.5 ? t + 1e-4 : t - 1e-4);
            if (vlen(d) < 1e-9) { d = sub(s[3], s[0]); }
        }
        return unit(d);
    }
    // Racines réelles d'une quadratique a t² + b t + c dans (0,1)
    function quadRoots01(a, b, c) {
        var r = [], sc = Math.abs(a) + Math.abs(b) + Math.abs(c);
        if (sc === 0) { return r; }
        if (Math.abs(a) < 1e-12 * sc) {
            if (Math.abs(b) > 1e-12 * sc) { r.push(-c / b); }
        } else {
            var D = b * b - 4 * a * c;
            if (D >= 0) {
                var q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(D));
                r.push(q / a);
                if (q !== 0) { r.push(c / q); }
            }
        }
        var out = [], i;
        for (i = 0; i < r.length; i++) { if (r[i] > 0 && r[i] < 1) { out.push(r[i]); } }
        out.sort(function (x, y) { return x - y; });
        return out;
    }
    // Racines d'une cubique de Bernstein (valeurs y0..y3) dans (0,1), avec sens.
    // Roots of a Bernstein cubic in (0,1), with crossing direction (+1 rising).
    function bernRoots(y0, y1, y2, y3) {
        var A = -y0 + 3 * y1 - 3 * y2 + y3, B = 3 * y0 - 6 * y1 + 3 * y2, C = -3 * y0 + 3 * y1, D = y0;
        function f(t) { return ((A * t + B) * t + C) * t + D; }
        var cuts = [0], q = quadRoots01(3 * A, 2 * B, C), i, k, res = [];
        for (i = 0; i < q.length; i++) { cuts.push(q[i]); }
        cuts.push(1);
        for (i = 0; i < cuts.length - 1; i++) {
            var a = cuts[i], b = cuts[i + 1];
            var fa = (i === 0) ? y0 : f(a), fb = (i === cuts.length - 2) ? y3 : f(b);
            if (fa === 0 || fb === 0 || (fa > 0) === (fb > 0)) { continue; }
            var lo = a, hi = b, flo = fa;
            for (k = 0; k < 64; k++) {
                var m = 0.5 * (lo + hi), fm = f(m);
                if (fm === 0) { lo = hi = m; break; }
                if ((fm > 0) === (flo > 0)) { lo = m; flo = fm; } else { hi = m; }
            }
            res.push({ t: 0.5 * (lo + hi), sgn: fb > fa ? 1 : -1 });
        }
        return res;
    }

    // --- Formes / shapes -------------------------------------------------------
    // shape = { contours:[{pts:[{a,l,r}], ref}], evenodd:bool, ref }
    function segOf(ct, s) {
        var n = ct.pts.length, p = ct.pts[s], q = ct.pts[(s + 1) % n];
        return [p.a, p.r, q.l, q.a];
    }
    function prepShape(sh) {
        var c, s, minx = 1e99, miny = 1e99, maxx = -1e99, maxy = -1e99;
        for (c = 0; c < sh.contours.length; c++) {
            var ct = sh.contours[c];
            ct.segs = [];
            for (s = 0; s < ct.pts.length; s++) {
                var sg = segOf(ct, s);
                ct.segs.push(sg);
                for (var j = 0; j < 4; j++) {
                    if (sg[j][0] < minx) { minx = sg[j][0]; } if (sg[j][0] > maxx) { maxx = sg[j][0]; }
                    if (sg[j][1] < miny) { miny = sg[j][1]; } if (sg[j][1] > maxy) { maxy = sg[j][1]; }
                }
            }
        }
        sh.bbox = [minx, miny, maxx, maxy];
        sh.size = Math.max(maxx - minx, maxy - miny);
        sh.e = Math.max(1e-4, Math.min(1e-3, sh.size * 1e-5));
        return sh;
    }
    function isStraight(sg) {
        var ch = sub(sg[3], sg[0]), L = vlen(ch);
        if (L < 1e-9) { return false; }
        var d = mul(ch, 1 / L), tol = Math.max(1e-4, L * 1e-4), i;
        for (i = 1; i <= 2; i++) {
            var v = sub(sg[i], sg[0]);
            if (Math.abs(cross(d, v)) > tol) { return false; }
            var u = dot(d, v);
            if (u < -tol || u > L + tol) { return false; }
        }
        return true;
    }
    function filledW(w, evenodd) { return evenodd ? (Math.abs(w) % 2) === 1 : w !== 0; }

    // Croisements d'un rayon P + d·dir (d > 0) avec la forme, triés.
    // All crossings of the ray P + d·dir (d > 0) with the shape, sorted.
    function rayCrossings(sh, P, dir) {
        var out = [], c, s, k, dx = dir[0], dy = dir[1];
        function rx(p) { return dx * (p[0] - P[0]) + dy * (p[1] - P[1]); }
        function ry(p) { return -dy * (p[0] - P[0]) + dx * (p[1] - P[1]); }
        for (c = 0; c < sh.contours.length; c++) {
            var ct = sh.contours[c], n = ct.pts.length, on = [], ys = [], xs = [];
            for (k = 0; k < n; k++) {
                var yv = ry(ct.pts[k].a);
                xs.push(rx(ct.pts[k].a));
                if (Math.abs(yv) <= ZT) { yv = 0; on.push(true); } else { on.push(false); }
                ys.push(yv);
            }
            for (s = 0; s < n; s++) {
                var sg = ct.segs[s], s1 = (s + 1) % n;
                var y0 = ys[s], y1 = ry(sg[1]), y2 = ry(sg[2]), y3 = ys[s1];
                if (y0 > 0 && y1 > 0 && y2 > 0 && y3 > 0) { continue; }
                if (y0 < 0 && y1 < 0 && y2 < 0 && y3 < 0) { continue; }
                if (rx(sg[0]) <= 0 && rx(sg[1]) <= 0 && rx(sg[2]) <= 0 && rx(sg[3]) <= 0) { continue; }
                var rts = bernRoots(y0, y1, y2, y3);
                for (k = 0; k < rts.length; k++) {
                    var pt = bezPt(sg, rts[k].t), xd = rx(pt);
                    if (xd > 0) { out.push({ d: xd, c: c, s: s, t: rts[k].t, sgn: rts[k].sgn, joint: false }); }
                }
            }
            // Sommets posés sur le rayon / anchors lying on the ray
            var used = {};
            for (k = 0; k < n; k++) {
                if (!on[k] || used[k] || xs[k] <= 0) { continue; }
                var sb = sideBefore(ct, k, ry), aft = sideAfter(ct, k, ry, used);
                if (sb !== 0 && aft !== 0 && sb !== aft) {
                    out.push({ d: xs[k], c: c, k: k, sgn: aft > 0 ? 1 : -1, joint: true });
                }
            }
        }
        out.sort(function (a, b) { return a.d - b.d; });
        return out;
    }
    function sgnEval(ct, s, t, ry) {
        var v = ry(bezPt(ct.segs[s], t));
        return Math.abs(v) <= ZT ? 0 : (v > 0 ? 1 : -1);
    }
    function sideBefore(ct, k, ry) {
        var n = ct.pts.length, s = (k - 1 + n) % n, m, ts = [0.999, 0.99, 0.9, 0.5, 0.1], i, g;
        for (m = 0; m < n; m++) {
            for (i = 0; i < ts.length; i++) { g = sgnEval(ct, s, ts[i], ry); if (g !== 0) { return g; } }
            s = (s - 1 + n) % n;
        }
        return 0;
    }
    function sideAfter(ct, k, ry, used) {
        var n = ct.pts.length, s = k, m, ts = [0.001, 0.01, 0.1, 0.5, 0.9], i, g;
        for (m = 0; m < n; m++) {
            for (i = 0; i < ts.length; i++) { g = sgnEval(ct, s, ts[i], ry); if (g !== 0) { return g; } }
            used[(s + 1) % n] = true;   // segment entier sur le rayon / whole segment on the ray
            s = (s + 1) % n;
        }
        return 0;
    }
    function insideAt(sh, P) {
        var dirs = [[0.8191520443, 0.5735764364], [-0.2756373558, 0.9612616959], [0.5, -0.8660254038]], i, j;
        var votes = 0;
        for (i = 0; i < dirs.length; i++) {
            var cr = rayCrossings(sh, P, dirs[i]), w = 0;
            for (j = 0; j < cr.length; j++) { w += cr[j].sgn; }
            if (filledW(w, sh.evenodd)) { votes++; }
        }
        return votes >= 2;
    }
    // Sortie de la matière le long d'un rayon parti de l'intérieur.
    // First exit from the filled area along a ray that starts inside.
    function walkRay(sh, P, dir) {
        var cr = rayCrossings(sh, P, dir), w = 0, j;
        for (j = 0; j < cr.length; j++) { w += cr[j].sgn; }
        if (!filledW(w, sh.evenodd)) { return null; }
        for (j = 0; j < cr.length; j++) {
            w -= cr[j].sgn;
            if (!filledW(w, sh.evenodd)) {
                var h = cr[j], ct = sh.contours[h.c];
                h.pt = add(P, mul(dir, h.d));
                if (h.joint) {
                    var n = ct.pts.length, s0 = ct.segs[(h.k - 1 + n) % n], s1 = ct.segs[h.k];
                    h.tan = unit(add(tangentAt(s0, 1), tangentAt(s1, 0)));
                } else {
                    h.tan = isStraight(ct.segs[h.s]) ? unit(sub(ct.segs[h.s][3], ct.segs[h.s][0])) : tangentAt(ct.segs[h.s], h.t);
                }
                return h;
            }
        }
        return null;
    }
    function anyCrossingAhead(sh, P, dir) { return rayCrossings(sh, P, dir).length > 0; }

    // --- Repères de mesure / measurable features -----------------------------
    function axisOf(dir, tolDeg) {
        var a = Math.abs(Math.atan2(dir[1], dir[0])) / DEG; // 0..180
        if (a > 90) { a = 180 - a; }
        if (a <= tolDeg) { return 'H'; }
        if (a >= 90 - tolDeg) { return 'V'; }
        return 'D';
    }
    function inwardNormal(sh, P, n) {
        var e = sh.e * 3, inP = insideAt(sh, add(P, mul(n, e))), inM = insideAt(sh, sub(P, mul(n, e)));
        if (inP && !inM) { return n; }
        if (inM && !inP) { return mul(n, -1); }
        return null;
    }
    function buildFeatures(sh, o) {
        var feats = [], c, s, k, ct, n;
        sh.flatBySeg = {}; sh.extAt = {}; sh.extIn = {};
        for (c = 0; c < sh.contours.length; c++) {
            ct = sh.contours[c]; n = ct.pts.length;
            ct.straight = [];
            for (s = 0; s < n; s++) { ct.straight.push(isStraight(ct.segs[s])); }
            for (s = 0; s < n; s++) {
                if (!ct.straight[s]) { continue; }
                var sg = ct.segs[s], ch = sub(sg[3], sg[0]), L = vlen(ch);
                if (L < o.minFlat) { continue; }
                var dir = mul(ch, 1 / L), mid = add(sg[0], mul(ch, 0.5));
                var nIn = inwardNormal(sh, mid, perp(dir));
                if (!nIn) { continue; }
                var f = { id: sh.id + ':' + c + ':f' + s, kind: 'flat', shape: sh, c: c, s: s, a: sg[0], b: sg[3],
                          dir: dir, nIn: nIn, len: L, axis: axisOf(dir, o.axisTol), movable: !!sh.editable };
                feats.push(f); sh.flatBySeg[c + ':' + s] = f;
            }
            for (k = 0; k < n; k++) {
                var sp = (k - 1 + n) % n, cp = !ct.straight[sp], cn = !ct.straight[k];
                if (!cp && !cn) { continue; }
                var pt = ct.pts[k], tIn = tangentAt(ct.segs[sp], 1), tOut = tangentAt(ct.segs[k], 0);
                if (Math.abs(cross(tIn, tOut)) > Math.sin(o.parTol * DEG) || dot(tIn, tOut) < 0) { continue; }
                var d = unit(add(tIn, tOut)), ax = axisOf(d, o.axisTol);
                if (ax === 'D') { continue; }
                var fp = sh.flatBySeg[c + ':' + sp], fn = sh.flatBySeg[c + ':' + k];
                if (fp || fn) { continue; } // déjà couvert par le plat / covered by the flat
                var adir = ax === 'H' ? [d[0] > 0 ? 1 : -1, 0] : [0, d[1] > 0 ? 1 : -1];
                var nIn2 = inwardNormal(sh, pt.a, perp(adir));
                if (!nIn2) { continue; }
                var rad = Infinity;
                if (cp) { rad = Math.min(rad, convexRadius(ct.segs[sp], 1, nIn2)); }
                if (cn) { rad = Math.max(cp ? rad : 0, convexRadius(ct.segs[k], 0, nIn2)); }
                var fe = { id: sh.id + ':' + c + ':e' + k, kind: 'ext', shape: sh, c: c, k: k, p: pt.a, dir: adir,
                           nIn: nIn2, axis: ax, movable: !!sh.editable, rad: rad };
                feats.push(fe); sh.extAt[c + ':' + k] = fe;
            }
            for (s = 0; s < n; s++) {
                if (ct.straight[s]) { continue; }
                var g = ct.segs[s], comp, r, rr;
                for (comp = 0; comp < 2; comp++) {
                    var v0 = g[1][comp] - g[0][comp], v1 = g[2][comp] - g[1][comp], v2 = g[3][comp] - g[2][comp];
                    rr = quadRoots01(v0 - 2 * v1 + v2, 2 * (v1 - v0), v0);
                    for (r = 0; r < rr.length; r++) {
                        if (rr[r] < 0.02 || rr[r] > 0.98) { continue; }
                        var P2 = bezPt(g, rr[r]), tg = tangentAt(g, rr[r]);
                        var ax2 = comp === 0 ? 'V' : 'H';
                        var ad = ax2 === 'H' ? [tg[0] > 0 ? 1 : -1, 0] : [0, tg[1] > 0 ? 1 : -1];
                        var nI = inwardNormal(sh, P2, perp(ad));
                        if (!nI) { continue; }
                        var fi = { id: sh.id + ':' + c + ':i' + s + '_' + r + comp, kind: 'extIn', shape: sh, c: c, s: s, t: rr[r],
                                   p: P2, dir: ad, nIn: nI, axis: ax2, movable: false, rad: convexRadius(g, rr[r], nI) };
                        feats.push(fi);
                        if (!sh.extIn[c + ':' + s]) { sh.extIn[c + ':' + s] = []; }
                        sh.extIn[c + ':' + s].push(fi);
                    }
                }
            }
        }
        sh.feats = feats;
        return feats;
    }
    function parallel(a, b, o) { return Math.abs(cross(a, b)) <= Math.sin(o.parTol * DEG); }

    function identifyHit(sh, h, F, o) {
        var ct = sh.contours[h.c], n = ct.pts.length, best = null, bd = 1e99, i, cands = [];
        if (!h.joint) {
            var fl = sh.flatBySeg[h.c + ':' + h.s];
            if (fl) { return parallel(fl.dir, F.dir, o) ? fl : null; }
            if (!parallel(h.tan, F.dir, o)) { return null; }
            if (sh.extAt[h.c + ':' + h.s]) { cands.push(sh.extAt[h.c + ':' + h.s]); }
            if (sh.extAt[h.c + ':' + ((h.s + 1) % n)]) { cands.push(sh.extAt[h.c + ':' + ((h.s + 1) % n)]); }
            var li = sh.extIn[h.c + ':' + h.s];
            if (li) { for (i = 0; i < li.length; i++) { cands.push(li[i]); } }
        } else {
            var a1 = sh.flatBySeg[h.c + ':' + ((h.k - 1 + n) % n)], a2 = sh.flatBySeg[h.c + ':' + h.k];
            if (a1 && parallel(a1.dir, F.dir, o)) { return a1; }
            if (a2 && parallel(a2.dir, F.dir, o)) { return a2; }
            if (sh.extAt[h.c + ':' + h.k]) { cands.push(sh.extAt[h.c + ':' + h.k]); }
        }
        for (i = 0; i < cands.length; i++) {
            if (cands[i].axis !== F.axis) { continue; }
            var dd = vlen(sub(cands[i].p, h.pt));
            if (dd < bd) { bd = dd; best = cands[i]; }
        }
        return best;
    }
    function hitIs(sh, h, G) {
        if (!h) { return false; }
        var n = sh.contours[h.c].pts.length;
        if (h.c !== G.c) { return false; }
        if (G.kind === 'flat') {
            if (!h.joint) { return h.s === G.s; }
            return h.k === G.s || h.k === (G.s + 1) % n;
        }
        if (G.kind === 'ext') {
            if (h.joint) { return h.k === G.k; }
            return h.s === G.k || (h.s + 1) % n === G.k;
        }
        return !h.joint && h.s === G.s;
    }
    function measurePair(sh, F, G, o) {
        var e = sh.e * 2, i;
        if (dot(F.nIn, G.nIn) > -Math.cos(o.parTol * DEG)) { return null; }
        if (F.kind === 'flat' && G.kind === 'flat') {
            var u1 = dot(sub(G.a, F.a), F.dir), u2 = dot(sub(G.b, F.a), F.dir);
            var lo = Math.max(0, Math.min(u1, u2)), hi = Math.min(F.len, Math.max(u1, u2));
            if (hi - lo < o.minFlat) { return null; }
            var ok = 0, tot = 0, NS = 5;
            for (i = 0; i < NS; i++) {
                var uu = lo + (hi - lo) * (0.1 + 0.8 * (i + 0.37) / NS);
                var h = walkRay(sh, add(add(F.a, mul(F.dir, uu)), mul(F.nIn, e)), F.nIn);
                tot++; if (hitIs(sh, h, G)) { ok++; }
            }
            if (ok / tot < 0.6) { return null; }
            var um = 0.5 * (lo + hi), P = add(F.a, mul(F.dir, um));
            var den = cross(F.nIn, G.dir);
            if (Math.abs(den) < 1e-12) { return null; }
            var lam = cross(sub(G.a, P), G.dir) / den;
            if (lam <= 0) { return null; }
            // Paroi commune plus courte que l'épaisseur : longueur de bras, pas un fût.
            // Shared wall shorter than the thickness: an arm length, not a stem.
            if (hi - lo < o.minOverlapRatio * lam) { return null; }
            var taper = Math.asin(Math.min(1, Math.abs(cross(F.dir, G.dir)))) / DEG;
            return { F: F, G: G, t: lam, p: P, q: add(P, mul(F.nIn, lam)), taper: taper, overlap: hi - lo };
        }
        var fl = null, ex = null;
        if (F.kind === 'flat') { fl = F; ex = G; } else if (G.kind === 'flat') { fl = G; ex = F; }
        // Un extrême convexe ne peut border qu'un fût plus fin que son diamètre de courbure
        // (sinon c'est la longueur d'une pastille ou d'une ellipse, pas une épaisseur).
        // A convex extreme can only bound a stem thinner than its curvature diameter
        // (otherwise it is the length of a pill or an ellipse, not a thickness).
        var thPre = (fl ? Math.abs(dot(sub(ex.p, fl.a), fl.nIn)) : Math.abs(dot(sub(G.p, F.p), F.nIn)));
        if ((F.kind !== 'flat' && thPre > 2.05 * F.rad) || (G.kind !== 'flat' && thPre > 2.05 * G.rad)) { return null; }
        if (fl) {
            var dpt = dot(sub(ex.p, fl.a), fl.nIn), up = dot(sub(ex.p, fl.a), fl.dir), tl = Math.max(1e-6, fl.len * 1e-6);
            if (dpt <= 0 || up < -tl || up > fl.len + tl) { return null; }
            var hb = walkRay(sh, add(ex.p, mul(ex.nIn, e)), ex.nIn);
            if (!hitIs(sh, hb, fl)) { return null; }
            var foot = add(fl.a, mul(fl.dir, up));
            return { F: F, G: G, t: dpt, p: foot, q: ex.p, taper: 0, overlap: 0 };
        }
        var dv = sub(G.p, F.p), th = dot(dv, F.nIn), lat = Math.abs(dot(dv, F.dir));
        if (th <= 0 || lat > 0.5 * th + 1e-6) { return null; }
        return { F: F, G: G, t: th, p: F.p, q: add(F.p, mul(F.nIn, th)), taper: 0, overlap: 0, lateral: lat };
    }

    function analyzeShape(sh, o) {
        prepShape(sh);
        var feats = buildFeatures(sh, o), stems = [], seen = {}, i, j;
        for (i = 0; i < feats.length; i++) {
            var F = feats[i];
            if (F.axis === 'D' && !o.diagonals) { continue; }
            var samples = [];
            if (F.kind === 'flat') {
                var fr = [0.137, 0.317, 0.513, 0.683, 0.863];
                for (j = 0; j < fr.length; j++) { samples.push(add(F.a, mul(F.dir, F.len * fr[j]))); }
            } else { samples.push(F.p); }
            for (j = 0; j < samples.length; j++) {
                var h = walkRay(sh, add(samples[j], mul(F.nIn, sh.e * 2)), F.nIn);
                if (!h) { continue; }
                var G = identifyHit(sh, h, F, o);
                if (!G || G === F) { continue; }
                if (G.axis === 'D' && !o.diagonals) { continue; }
                var key = F.id < G.id ? F.id + '|' + G.id : G.id + '|' + F.id;
                if (seen[key]) { continue; }
                seen[key] = true;
                var m = measurePair(sh, F, G, o);
                if (m) {
                    m.shape = sh; m.axis = F.axis;
                    m.kind = (F.kind === 'flat' && G.kind === 'flat') ? 'droit' : 'courbe';
                    stems.push(m);
                }
            }
        }
        return stems;
    }

    // --- Familles et cibles / families and targets -----------------------------
    function famKey(st, o) {
        if (o.mode === 'pictos') { return 'tout'; }
        if (st.kind === 'trait') { return 'trait'; }
        return st.axis + '-' + st.kind;
    }
    function tolOf(v, o) { return Math.max(o.eps * 2, v * o.tolPct / 100); }
    // Valeur « ronde » (saisie par le graphiste) : 0 = entier en pt ou mm, 3 = quelconque.
    // "Round" value (typed by the designer): 0 = integer in pt or mm, 3 = arbitrary.
    function roundness(v) {
        var k, u, vals = [v, v * 25.4 / 72];
        for (k = 0; k <= 2; k++) {
            for (u = 0; u < 2; u++) {
                var m = vals[u] * Math.pow(10, k);
                if (Math.abs(m - Math.round(m)) < 1e-3 * Math.pow(10, k)) { return k; }
            }
        }
        return 3;
    }
    function autoTargets(vals, o) {
        var v = vals.slice(0).sort(function (a, b) { return a - b; }), groups = [], i, j, g = null;
        for (i = 0; i < v.length; i++) {
            if (g && v[i] - g.last <= o.eps) { g.sum += v[i]; g.count++; g.last = v[i]; }
            else { g = { sum: v[i], count: 1, last: v[i] }; groups.push(g); }
        }
        for (i = 0; i < groups.length; i++) {
            g = groups[i]; g.val = g.sum / g.count; g.support = 0; g.spread = 0;
            for (j = 0; j < v.length; j++) {
                var dd = Math.abs(v[j] - g.val);
                if (dd <= tolOf(g.val, o)) { g.support++; g.spread += dd; }
            }
        }
        for (i = 0; i < groups.length; i++) { groups[i].round = roundness(groups[i].val); }
        groups.sort(function (a, b) {
            if (b.count !== a.count) { return b.count - a.count; }
            if (b.support !== a.support) { return b.support - a.support; }
            if (a.round !== b.round) { return a.round - b.round; }
            return a.spread - b.spread;
        });
        var targets = [];
        for (i = 0; i < groups.length; i++) {
            var clash = false;
            for (j = 0; j < targets.length; j++) {
                if (Math.abs(groups[i].val - targets[j].val) <= Math.max(tolOf(targets[j].val, o), tolOf(groups[i].val, o))) { clash = true; break; }
            }
            if (!clash) { targets.push({ val: groups[i].val, count: groups[i].count, support: groups[i].support, user: false }); }
        }
        return targets;
    }
    function classify(stems, o) {
        var fams = {}, k, i, j, out = [];
        for (i = 0; i < stems.length; i++) {
            k = famKey(stems[i], o); stems[i].fam = k;
            if (!fams[k]) { fams[k] = { key: k, stems: [] }; out.push(fams[k]); }
            fams[k].stems.push(stems[i]);
        }
        for (i = 0; i < out.length; i++) {
            var f = out[i], vals = [];
            for (j = 0; j < f.stems.length; j++) { vals.push(f.stems[j].t); }
            if (o.targets && o.targets.length) {
                f.targets = [];
                for (j = 0; j < o.targets.length; j++) { f.targets.push({ val: o.targets[j], count: 0, support: 99, user: true }); }
            } else { f.targets = autoTargets(vals, o); }
            for (j = 0; j < f.stems.length; j++) {
                var st = f.stems[j], best = null, bd = 1e99, t;
                for (t = 0; t < f.targets.length; t++) {
                    var dd = Math.abs(st.t - f.targets[t].val);
                    if (dd <= tolOf(f.targets[t].val, o) && dd < bd) { bd = dd; best = f.targets[t]; }
                }
                st.target = best ? best.val : null;
                st.dev = best ? st.t - best.val : 0;
                if (!best) { st.status = 'isole'; }
                else if (Math.abs(st.dev) <= o.eps) { st.status = 'ok'; }
                else if (best.user || best.support >= 2) { st.status = 'irregulier'; }
                else { st.status = 'isole'; }
                if (best && !best.user && best.count < 2 && st.status === 'irregulier') { st.weakTarget = true; }
            }
        }
        return out;
    }

    // --- Correction / fixing ----------------------------------------------------
    function wallInner(F) {
        if (F.inner !== undefined) { return F.inner; }
        var sh = F.shape, P = F.kind === 'flat' ? add(F.a, mul(F.dir, F.len * 0.5)) : F.p;
        F.inner = anyCrossingAhead(sh, sub(P, mul(F.nIn, sh.e * 2)), mul(F.nIn, -1));
        return F.inner;
    }
    // Plan de déplacement des parois (moindres carrés régularisés, gradient conjugué).
    // Wall displacement plan (regularised least squares, conjugate gradient).
    function planFix(stems, o) {
        var vars = {}, vlist = [], eqs = [], i, j;
        function vid(F) {
            if (!F.movable) { return -1; }
            if (vars[F.id] === undefined) { vars[F.id] = vlist.length; vlist.push(F); }
            return vars[F.id];
        }
        for (i = 0; i < stems.length; i++) {
            var st = stems[i];
            if (st.kind === 'trait') { continue; }
            var delta = (st.status === 'irregulier') ? st.target - st.t : 0;
            var ids = [vid(st.F), vid(st.G)], vv = [];
            for (j = 0; j < 2; j++) { if (ids[j] >= 0) { vv.push(ids[j]); } }
            eqs.push({ v: vv, d: delta, st: st, w: 1 });
        }
        var N = vlist.length, lam = [], x = [], r = [], p = [], Ap = [];
        for (i = 0; i < N; i++) {
            lam.push((o.side === 'inner' && !wallInner(vlist[i])) ? 1 : 1e-9);
            x.push(0); r.push(0); p.push(0); Ap.push(0);
        }
        // (JᵀJ + Λ)·x  — produit matrice-vecteur / matrix-vector product
        function applyA(vec, res) {
            var a, b;
            for (a = 0; a < N; a++) { res[a] = lam[a] * vec[a]; }
            for (a = 0; a < eqs.length; a++) {
                var e = eqs[a], s = 0;
                for (b = 0; b < e.v.length; b++) { s += vec[e.v[b]]; }
                for (b = 0; b < e.v.length; b++) { res[e.v[b]] += e.w * s; }
            }
        }
        // Gradient conjugué / conjugate gradient
        function solveCG() {
            var a, b, it, rr = 0;
            for (a = 0; a < N; a++) { x[a] = 0; r[a] = 0; }
            for (a = 0; a < eqs.length; a++) { for (b = 0; b < eqs[a].v.length; b++) { r[eqs[a].v[b]] += eqs[a].w * eqs[a].d; } }
            for (a = 0; a < N; a++) { p[a] = r[a]; rr += r[a] * r[a]; }
            for (it = 0; it < Math.max(50, 4 * N) && rr > 1e-30; it++) {
                applyA(p, Ap);
                var pAp = 0;
                for (a = 0; a < N; a++) { pAp += p[a] * Ap[a]; }
                if (pAp <= 0) { break; }
                var al = rr / pAp, rr2 = 0;
                for (a = 0; a < N; a++) { x[a] += al * p[a]; r[a] -= al * Ap[a]; rr2 += r[a] * r[a]; }
                var be = rr2 / rr;
                rr = rr2;
                for (a = 0; a < N; a++) { p[a] = r[a] + be * p[a]; }
            }
        }
        function residual(e) { var s = -e.d, b; for (b = 0; b < e.v.length; b++) { s += x[e.v[b]]; } return s; }
        solveCG();
        // Mode « silhouette » : un fût sans paroi intérieure libre est corrigé symétriquement.
        // "Silhouette" mode: a stem with no free inner wall is fixed symmetrically.
        if (o.side === 'inner') {
            var again = false;
            for (i = 0; i < eqs.length; i++) {
                if (Math.abs(residual(eqs[i])) > o.eps * 0.25) {
                    for (j = 0; j < eqs[i].v.length; j++) { if (lam[eqs[i].v[j]] > 1e-9) { lam[eqs[i].v[j]] = 1e-9; again = true; } }
                }
            }
            if (again) { solveCG(); }
        }
        var u = {};
        for (i = 0; i < N; i++) { u[vlist[i].id] = Math.abs(x[i]) < 1e-7 ? 0 : x[i]; }
        // Contrôle des résidus et des grands déplacements / residuals and big moves
        var refusedShapes = {};
        for (i = 0; i < eqs.length; i++) {
            var eq = eqs[i];
            eq.st.residual = residual(eq);
            eq.st.planned = eq.st.residual + eq.d;
            if (eq.st.status === 'irregulier' && Math.abs(eq.st.residual) > o.eps) { eq.st.conflict = true; }
            for (j = 0; j < eq.v.length; j++) {
                if (Math.abs(x[eq.v[j]]) > o.maxMoveRatio * eq.st.t) { refusedShapes[eq.st.shape.id] = true; eq.st.refused = true; }
            }
        }
        return { u: u, walls: vlist, refused: refusedShapes };
    }
    // Déplacement des points d'ancrage d'une forme / move the anchors of one shape
    function applyToShape(sh, plan) {
        var c, k, moved = 0, conflicts = 0;
        for (c = 0; c < sh.contours.length; c++) {
            var ct = sh.contours[c], n = ct.pts.length, cons = [];
            for (k = 0; k < n; k++) { cons.push([]); }
            for (k = 0; k < n; k++) {
                var f = sh.flatBySeg[c + ':' + k];
                if (f) {
                    var uf = plan.u[f.id] !== undefined ? plan.u[f.id] : 0;
                    var item = { n: mul(f.nIn, -1), u: uf, wall: plan.u[f.id] !== undefined };
                    cons[k].push(item); cons[(k + 1) % n].push(item);
                }
                var fe = sh.extAt[c + ':' + k];
                if (fe && plan.u[fe.id] !== undefined) { cons[k].push({ n: mul(fe.nIn, -1), u: plan.u[fe.id], wall: true }); }
            }
            for (k = 0; k < n; k++) {
                var L = cons[k], i, j, m = null;
                for (i = 0; i < L.length; i++) { if (L[i].u !== 0 && (!m || Math.abs(L[i].u) > Math.abs(m.u))) { m = L[i]; } }
                if (!m) { continue; }
                var m2 = null, bc = 0.17;
                for (i = 0; i < L.length; i++) {
                    var cr = Math.abs(cross(m.n, L[i].n));
                    if (L[i] !== m && cr > bc) { bc = cr; m2 = L[i]; }
                }
                var v;
                if (m2) {
                    var det = cross(m.n, m2.n);
                    v = [(m.u * m2.n[1] - m2.u * m.n[1]) / det, (m.n[0] * m2.u - m2.n[0] * m.u) / det];
                } else { v = mul(m.n, m.u); }
                for (j = 0; j < L.length; j++) {
                    if (Math.abs(dot(v, L[j].n) - L[j].u) > 1e-4 && L[j].wall) { conflicts++; break; }
                }
                var pt = ct.pts[k];
                pt.a = add(pt.a, v); pt.l = add(pt.l, v); pt.r = add(pt.r, v);
                pt.moved = true; moved++;
            }
        }
        return { moved: moved, conflicts: conflicts };
    }

    function defaults() {
        return { parTol: 3, axisTol: 3, minFlat: 0.5, eps: 0.005, tolPct: 3, mode: 'lettrage',
                 diagonals: true, strokes: true, targets: [], side: 'sym', maxMoveRatio: 0.25, minOverlapRatio: 0.9 };
    }
    // Analyse complète d'une liste de formes et de traits.
    // Full analysis of a list of shapes and strokes.
    function analyzeAll(shapes, strokes, o) {
        var stems = [], i, j;
        for (i = 0; i < shapes.length; i++) {
            var s = analyzeShape(shapes[i], o);
            for (j = 0; j < s.length; j++) { stems.push(s[j]); }
        }
        if (o.strokes) {
            for (i = 0; i < strokes.length; i++) {
                stems.push({ kind: 'trait', axis: 'T', t: strokes[i].w, stroke: strokes[i], shape: { id: 'trait' + i } });
            }
        }
        var fams = classify(stems, o);
        return { stems: stems, fams: fams };
    }
    function countStatus(stems) {
        var r = { ok: 0, irregulier: 0, isole: 0, total: stems.length }, i;
        for (i = 0; i < stems.length; i++) { r[stems[i].status]++; }
        return r;
    }

    return {
        defaults: defaults, analyzeAll: analyzeAll, analyzeShape: analyzeShape, classify: classify,
        planFix: planFix, applyToShape: applyToShape, countStatus: countStatus, prepShape: prepShape,
        walkRay: walkRay, insideAt: insideAt, bernRoots: bernRoots, autoTargets: autoTargets,
        isStraight: isStraight, famKey: famKey, wallInner: wallInner, _hitIs: hitIs, _identifyHit: identifyHit, _convexRadius: convexRadius
    };
})();

// ============================================================================
//  INTERFACE ILLUSTRATOR / ILLUSTRATOR GLUE
// ============================================================================
var ERUI = (function () {
    var VERSION = '1.0.0';
    var LAYER_MARK = 'Épaisseurs — repères', LAYER_BACKUP = 'Épaisseurs — originaux';
    var PT_MM = 25.4 / 72;

    function isFr() {
        var l = '';
        try { l = String($.locale || ''); } catch (e) { l = ''; }
        if (!l) { try { l = String(app.locale || ''); } catch (e2) { l = ''; } }
        return l === '' || l.toLowerCase().indexOf('fr') === 0;
    }
    var FR = {
        title: 'Épaisseurs régulières', noDoc: 'Aucun document ouvert.\nOuvrez un document puis relancez le script.',
        noSel: 'Rien n\'est sélectionné.\nSélectionnez le lettrage, le logo ou les pictos vectorisés à contrôler.',
        textSel: 'Quittez l\'édition de texte et sélectionnez des objets (formes vectorisées).',
        nothing: 'Aucune forme remplie fermée ni contour mesurable dans la sélection.',
        pType: 'Type de dessin', mLetter: 'Lettrage / logo (familles séparées : verticaux, horizontaux, droits, courbes)',
        mIcons: 'Pictos (une seule famille, contours compris)',
        pMeasure: 'Mesure', unit: 'Unité :', tol: 'Écart toléré dans une famille (%) :', eps: 'Ignorer les écarts inférieurs à :',
        targets: 'Épaisseurs imposées (facultatif, ex. 12 ; 8,5) :', diag: 'Mesurer les diagonales', strokes: 'Comparer aussi les contours (traits)',
        par: 'Tolérance de parallélisme (°) :', pFix: 'Correction', sym: 'Déplacer les deux parois (symétrique)',
        inner: 'Garder la silhouette extérieure (déplacer les parois intérieures)', backup: 'Copie des originaux sur un calque masqué',
        pOut: 'Sortie', markers: 'Repères sur un calque non imprimable', labelsAll: 'Étiqueter toutes les mesures (sinon seulement les écarts)',
        report: 'Enregistrer un rapport .txt', advice: 'Conseil : travaillez sur une copie du fichier. Tout s\'annule par Édition > Annuler.',
        analyse: 'Analyser', fix: 'Corriger', cancel: 'Annuler', badNum: 'Valeur numérique incorrecte : ',
        fam: { 'V-droit': 'Fûts verticaux droits', 'V-courbe': 'Fûts verticaux courbes (panses)', 'H-droit': 'Traverses horizontales droites',
               'H-courbe': 'Traverses horizontales courbes', 'D-droit': 'Diagonales', 'trait': 'Contours (traits)', 'tout': 'Toutes épaisseurs' },
        sum: 'Résumé', measured: 'épaisseurs mesurées', ok: 'régulières', irr: 'à égaliser', iso: 'isolées (sans famille)',
        fixed: 'Corrigé : %1 forme(s), %2 point(s) déplacé(s), %3 contour(s).', remain: 'Écarts restants après correction : ',
        refused: 'Formes non corrigées (déplacement trop grand) : ', conflicts: 'Conflits (paroi partagée, correction partielle) : ',
        skipped: 'Ignorés : %1 texte(s) (vectorisez une copie), %2 tracé(s) ouvert(s) rempli(s), %3 verrouillé(s)/masqué(s), %4 autre(s).',
        target: 'cible', weak: 'cible = médiane (aucune valeur répétée)', reportSaved: 'Rapport enregistré : ', none: 'Aucun écart trouvé.',
        noFixNeeded: 'Rien à corriger.', strokeLbl: 'contour', missingExt: 'mesure sur un extrême sans point (ajoutez un point à l\'extrême pour pouvoir corriger)'
    };
    var EN = {
        title: 'Regular Thickness', noDoc: 'No document open.\nOpen a document and run the script again.',
        noSel: 'Nothing is selected.\nSelect the outlined lettering, logo or icons to check.',
        textSel: 'Leave text editing and select objects (outlined shapes).',
        nothing: 'No closed filled shape or measurable stroke in the selection.',
        pType: 'Artwork type', mLetter: 'Lettering / logo (separate families: vertical, horizontal, straight, round)',
        mIcons: 'Icons (one family, strokes included)',
        pMeasure: 'Measure', unit: 'Unit:', tol: 'Tolerance within a family (%):', eps: 'Ignore differences below:',
        targets: 'Imposed thicknesses (optional, e.g. 12; 8.5):', diag: 'Measure diagonals', strokes: 'Also compare strokes',
        par: 'Parallelism tolerance (°):', pFix: 'Fixing', sym: 'Move both walls (symmetric)',
        inner: 'Keep the outer silhouette (move inner walls)', backup: 'Copy originals to a hidden layer',
        pOut: 'Output', markers: 'Markers on a non-printing layer', labelsAll: 'Label every measure (otherwise only the differences)',
        report: 'Save a .txt report', advice: 'Tip: work on a copy of your file. Everything can be undone with Edit > Undo.',
        analyse: 'Analyse', fix: 'Fix', cancel: 'Cancel', badNum: 'Invalid number: ',
        fam: { 'V-droit': 'Straight vertical stems', 'V-courbe': 'Round vertical stems (bowls)', 'H-droit': 'Straight horizontal bars',
               'H-courbe': 'Round horizontal bars', 'D-droit': 'Diagonals', 'trait': 'Strokes', 'tout': 'All thicknesses' },
        sum: 'Summary', measured: 'thicknesses measured', ok: 'regular', irr: 'to equalise', iso: 'isolated (no family)',
        fixed: 'Fixed: %1 shape(s), %2 point(s) moved, %3 stroke(s).', remain: 'Differences left after fixing: ',
        refused: 'Shapes not fixed (move too large): ', conflicts: 'Conflicts (shared wall, partial fix): ',
        skipped: 'Skipped: %1 text frame(s) (outline a copy), %2 open filled path(s), %3 locked/hidden, %4 other(s).',
        target: 'target', weak: 'target = median (no repeated value)', reportSaved: 'Report saved: ', none: 'No difference found.',
        noFixNeeded: 'Nothing to fix.', strokeLbl: 'stroke', missingExt: 'measured on an extreme without a point (add a point at the extreme to allow fixing)'
    };
    var T = isFr() ? FR : EN;
    function fmtStr(s, a) { var i; for (i = 0; i < a.length; i++) { s = s.split('%' + (i + 1)).join(String(a[i])); } return s; }

    // --- Nombres et unités / numbers and units ---------------------------------
    function parseNum(s) {
        var v = parseFloat(String(s).replace(/^\s+|\s+$/g, '').replace(',', '.'));
        return isNaN(v) ? null : v;
    }
    function toPt(v, unit) { return unit === 'mm' ? v / PT_MM : v; }
    function fromPt(v, unit) { return unit === 'mm' ? v * PT_MM : v; }
    function fmt(v, unit, dec) {
        var s = fromPt(v, unit).toFixed(dec === undefined ? 3 : dec);
        if (T === FR) { s = s.replace('.', ','); }
        return s + ' ' + unit;
    }
    function parseTargets(s, unit) {
        var parts = String(s || '').replace(/,/g, '.').split(/[;\s\/]+/), out = [], i, v;
        for (i = 0; i < parts.length; i++) {
            if (parts[i] === '') { continue; }
            v = parseFloat(parts[i]);
            if (isNaN(v) || v <= 0) { return null; }
            out.push(toPt(v, unit));
        }
        return out;
    }

    // --- Réglages mémorisés / saved settings -------------------------------------
    function cfgFile() { return new File(Folder.userData + '/EpaisseursRegulieres.ini'); }
    function defaultCfg() {
        return { mode: 'lettrage', unit: 'pt', tolPct: '3', eps: '0.005', targets: '', diagonals: 'true', strokes: 'true',
                 parTol: '3', side: 'sym', backup: 'true', markers: 'true', labelsAll: 'false', report: 'false' };
    }
    function loadCfg() {
        var c = defaultCfg(), f = cfgFile();
        try {
            if (f.exists && f.open('r')) {
                f.encoding = 'UTF-8';
                while (!f.eof) {
                    var line = f.readln(), p = line.indexOf('=');
                    if (p > 0) { var k = line.substring(0, p); if (c.hasOwnProperty(k)) { c[k] = line.substring(p + 1); } }
                }
                f.close();
            }
        } catch (e) { }
        return c;
    }
    function saveCfg(c) {
        var f = cfgFile(), k;
        try {
            f.encoding = 'UTF-8';
            if (f.open('w')) { for (k in c) { if (c.hasOwnProperty(k)) { f.writeln(k + '=' + c[k]); } } f.close(); }
        } catch (e) { }
    }

    // --- Dialogue / dialog -----------------------------------------------------------
    function showDialog(c) {
        var w = new Window('dialog', T.title + ' v' + VERSION), result = null;
        w.orientation = 'column'; w.alignChildren = ['fill', 'top'];
        var p1 = w.add('panel', undefined, T.pType); p1.alignChildren = ['left', 'top'];
        var rL = p1.add('radiobutton', undefined, T.mLetter), rI = p1.add('radiobutton', undefined, T.mIcons);
        rL.value = c.mode !== 'pictos'; rI.value = c.mode === 'pictos';

        var p2 = w.add('panel', undefined, T.pMeasure); p2.alignChildren = ['left', 'top'];
        var g1 = p2.add('group'); g1.add('statictext', undefined, T.unit);
        var dU = g1.add('dropdownlist', undefined, ['pt', 'mm']); dU.selection = c.unit === 'mm' ? 1 : 0;
        var g2 = p2.add('group'); g2.add('statictext', undefined, T.tol); var eT = g2.add('edittext', undefined, c.tolPct); eT.characters = 6;
        var g3 = p2.add('group'); g3.add('statictext', undefined, T.eps); var eE = g3.add('edittext', undefined, c.eps); eE.characters = 7;
        var g4 = p2.add('group'); g4.orientation = 'column'; g4.alignChildren = ['left', 'top'];
        g4.add('statictext', undefined, T.targets); var eG = g4.add('edittext', undefined, c.targets); eG.characters = 30;
        var cD = p2.add('checkbox', undefined, T.diag); cD.value = c.diagonals === 'true';
        var cS = p2.add('checkbox', undefined, T.strokes); cS.value = c.strokes === 'true';
        var g5 = p2.add('group'); g5.add('statictext', undefined, T.par); var eP = g5.add('edittext', undefined, c.parTol); eP.characters = 5;

        var p3 = w.add('panel', undefined, T.pFix); p3.alignChildren = ['left', 'top'];
        var rS = p3.add('radiobutton', undefined, T.sym), rN = p3.add('radiobutton', undefined, T.inner);
        rS.value = c.side !== 'inner'; rN.value = c.side === 'inner';
        var cB = p3.add('checkbox', undefined, T.backup); cB.value = c.backup === 'true';

        var p4 = w.add('panel', undefined, T.pOut); p4.alignChildren = ['left', 'top'];
        var cM = p4.add('checkbox', undefined, T.markers); cM.value = c.markers === 'true';
        var cA = p4.add('checkbox', undefined, T.labelsAll); cA.value = c.labelsAll === 'true';
        var cR = p4.add('checkbox', undefined, T.report); cR.value = c.report === 'true';
        w.add('statictext', undefined, T.advice);

        var gb = w.add('group'); gb.alignment = 'right';
        var bA = gb.add('button', undefined, T.analyse), bF = gb.add('button', undefined, T.fix), bC = gb.add('button', undefined, T.cancel, { name: 'cancel' });
        function collectCfg(action) {
            var unit = dU.selection ? dU.selection.text : 'pt';
            var tp = parseNum(eT.text), ep = parseNum(eE.text), pp = parseNum(eP.text);
            if (tp === null || tp <= 0 || tp > 50) { alert(T.badNum + eT.text); return null; }
            if (ep === null || ep < 0) { alert(T.badNum + eE.text); return null; }
            if (pp === null || pp <= 0 || pp > 20) { alert(T.badNum + eP.text); return null; }
            if (parseTargets(eG.text, unit) === null) { alert(T.badNum + eG.text); return null; }
            return { action: action, cfg: { mode: rI.value ? 'pictos' : 'lettrage', unit: unit, tolPct: eT.text, eps: eE.text,
                targets: eG.text, diagonals: String(cD.value), strokes: String(cS.value), parTol: eP.text, side: rN.value ? 'inner' : 'sym',
                backup: String(cB.value), markers: String(cM.value), labelsAll: String(cA.value), report: String(cR.value) } };
        }
        bA.onClick = function () { var r = collectCfg('analyse'); if (r) { result = r; w.close(1); } };
        bF.onClick = function () { var r = collectCfg('fix'); if (r) { result = r; w.close(1); } };
        bC.onClick = function () { result = null; w.close(0); };
        w.show();
        return result;
    }
    function buildOpts(c) {
        var o = ER.defaults();
        o.mode = c.mode; o.unit = c.unit;
        o.tolPct = parseNum(c.tolPct); o.eps = toPt(parseNum(c.eps), c.unit);
        o.targets = parseTargets(c.targets, c.unit) || [];
        o.diagonals = c.diagonals === 'true'; o.strokes = c.strokes === 'true';
        o.parTol = parseNum(c.parTol); o.side = c.side;
        return o;
    }

    // --- Lecture de la sélection / reading the selection --------------------------
    function readContour(p) {
        var pts = [], pp = p.pathPoints, i, q;
        for (i = 0; i < pp.length; i++) {
            q = pp[i];
            pts.push({ a: [q.anchor[0], q.anchor[1]], l: [q.leftDirection[0], q.leftDirection[1]], r: [q.rightDirection[0], q.rightDirection[1]] });
        }
        return { pts: pts, ref: p };
    }
    function itemLabel(it, n) {
        var s = '';
        try { s = it.name; } catch (e) { s = ''; }
        return s ? s : (it.typename + ' #' + n);
    }
    function isLockedOrHidden(it) {
        var p;
        try {
            if (it.locked || it.hidden) { return true; }
            p = it.layer;
            while (p && p.typename === 'Layer') { if (p.locked || !p.visible) { return true; } p = p.parent; }
        } catch (e) { }
        return false;
    }
    function itemKey(it) {
        try { if (it.uuid) { return 'u' + it.uuid; } } catch (e) { }
        try { return 'b' + it.typename + it.geometricBounds.join(','); } catch (e2) { return 'x' + Math.random(); }
    }
    function collect(sel, o) {
        var acc = { shapes: [], strokes: [], skipped: { text: 0, open: 0, locked: 0, other: 0 }, seen: {}, n: 0 };
        function addStroke(src, it) {
            try {
                if (o.strokes && src.stroked && src.strokeWidth > 0) {
                    acc.strokes.push({ w: src.strokeWidth, ref: src, label: itemLabel(it, acc.n), bounds: it.geometricBounds });
                }
            } catch (e) { }
        }
        function visit(it) {
            var i, key = itemKey(it);
            if (acc.seen[key]) { return; }
            acc.seen[key] = true;
            if (isLockedOrHidden(it)) { acc.skipped.locked++; return; }
            var tn = it.typename;
            if (tn === 'GroupItem') {
                for (i = 0; i < it.pageItems.length; i++) {
                    var ch = it.pageItems[i];
                    if (ch.typename === 'PathItem' && ch.clipping) { continue; }
                    visit(ch);
                }
            } else if (tn === 'PathItem') {
                if (it.guides || it.clipping) { return; }
                if (it.parent && it.parent.typename === 'CompoundPathItem') { visit(it.parent); return; }
                acc.n++;
                if (it.filled) {
                    if (it.closed && it.pathPoints.length >= 2) {
                        acc.shapes.push({ id: 'S' + acc.n, contours: [readContour(it)], evenodd: !!it.evenodd, editable: true, ref: it, label: itemLabel(it, acc.n) });
                    } else if (!it.closed) { acc.skipped.open++; }
                } else { addStroke(it, it); }
            } else if (tn === 'CompoundPathItem') {
                acc.n++;
                var cs = [], first = it.pathItems.length ? it.pathItems[0] : null;
                if (!first) { return; }
                if (first.filled) {
                    for (i = 0; i < it.pathItems.length; i++) {
                        var pi = it.pathItems[i];
                        if (pi.closed && pi.pathPoints.length >= 2) { cs.push(readContour(pi)); } else { acc.skipped.open++; }
                    }
                    if (cs.length) { acc.shapes.push({ id: 'S' + acc.n, contours: cs, evenodd: !!first.evenodd, editable: true, ref: it, label: itemLabel(it, acc.n) }); }
                } else { addStroke(first, it); }
            } else if (tn === 'TextFrame') { acc.skipped.text++; }
            else { acc.skipped.other++; }
        }
        var i;
        for (i = 0; i < sel.length; i++) { visit(sel[i]); }
        return acc;
    }

    // --- Calques, couleurs, repères / layers, colours, markers ---------------------
    function getLayer(doc, name, create) {
        var i;
        for (i = 0; i < doc.layers.length; i++) { if (doc.layers[i].name === name) { return doc.layers[i]; } }
        if (!create) { return null; }
        var l = doc.layers.add(); l.name = name; return l;
    }
    function mkColor(doc, r, g, b) {
        var c;
        if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
            c = new CMYKColor();
            var k = 1 - Math.max(r, g, b) / 255;
            if (k >= 1) { c.cyan = 0; c.magenta = 0; c.yellow = 0; c.black = 100; return c; }
            c.cyan = 100 * (1 - r / 255 - k) / (1 - k); c.magenta = 100 * (1 - g / 255 - k) / (1 - k);
            c.yellow = 100 * (1 - b / 255 - k) / (1 - k); c.black = 100 * k;
            return c;
        }
        c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c;
    }
    function median(a) { var b = a.slice(0).sort(function (x, y) { return x - y; }); return b.length ? b[Math.floor(b.length / 2)] : 0; }
    function drawMarkers(doc, res, o, labelsAll) {
        var lay = getLayer(doc, LAYER_MARK, true), i;
        lay.locked = false; lay.visible = true;
        while (lay.pageItems.length) { lay.pageItems[0].remove(); }
        lay.printable = false;
        try { lay.zOrder(ZOrderMethod.BRINGTOFRONT); } catch (e) { }
        var col = { ok: mkColor(doc, 0, 150, 70), irregulier: mkColor(doc, 230, 0, 40), isole: mkColor(doc, 150, 150, 150), warn: mkColor(doc, 255, 140, 0) };
        var th = [];
        for (i = 0; i < res.stems.length; i++) { if (res.stems[i].kind !== 'trait') { th.push(res.stems[i].t); } }
        var lw = Math.max(0.1, Math.min(0.75, median(th) * 0.04)), fs = Math.max(3, Math.min(12, median(th) * 0.35));
        for (i = 0; i < res.stems.length; i++) {
            var st = res.stems[i], c = (st.refused || st.conflict) ? col.warn : col[st.status];
            var lbl = labelsAll || st.status === 'irregulier';
            var txt = fmt(st.t, o.unit) + (st.status === 'irregulier' ? ' → ' + fmt(st.target, o.unit) : '');
            var at;
            if (st.kind === 'trait') {
                if (st.status !== 'irregulier' && !labelsAll) { continue; }
                at = [st.stroke.bounds[0], st.stroke.bounds[1] + fs * 1.2];
                txt = T.strokeLbl + ' ' + txt;
            } else {
                var pth = lay.pathItems.add();
                pth.setEntirePath([st.p, st.q]);
                pth.filled = false; pth.stroked = true; pth.strokeColor = c; pth.strokeWidth = lw;
                if (st.status === 'isole') { pth.strokeDashes = [lw * 2, lw * 2]; }
                at = [(st.p[0] + st.q[0]) / 2 + lw * 2, (st.p[1] + st.q[1]) / 2 + lw * 2];
            }
            if (lbl) {
                var tf = lay.textFrames.pointText(at);
                tf.contents = txt;
                try { tf.textRange.characterAttributes.size = fs; tf.textRange.characterAttributes.fillColor = c; } catch (e2) { }
            }
        }
        return lay;
    }
    function backupItem(doc, it, state) {
        if (!state.layer) {
            state.layer = getLayer(doc, LAYER_BACKUP, true);
            state.layer.locked = false; state.layer.visible = true;
        }
        try { it.duplicate(state.layer, ElementPlacement.PLACEATEND); state.count++; } catch (e) { }
    }
    function writeBack(sh) {
        var c, k;
        for (c = 0; c < sh.contours.length; c++) {
            var ct = sh.contours[c], pp = ct.ref.pathPoints;
            for (k = 0; k < ct.pts.length; k++) {
                var p = ct.pts[k];
                if (!p.moved) { continue; }
                pp[k].anchor = [p.a[0], p.a[1]];
                pp[k].leftDirection = [p.l[0], p.l[1]];
                pp[k].rightDirection = [p.r[0], p.r[1]];
            }
        }
    }

    // --- Rapport / report ----------------------------------------------------------
    function buildReport(doc, res, o, extra) {
        var L = [], i, j, f, cnt = ER.countStatus(res.stems);
        L.push(T.title + ' v' + VERSION + ' — ' + (doc ? doc.name : '') + ' — ' + new Date().toString());
        L.push(cnt.total + ' ' + T.measured + ' : ' + cnt.ok + ' ' + T.ok + ', ' + cnt.irregulier + ' ' + T.irr + ', ' + cnt.isole + ' ' + T.iso);
        for (i = 0; i < extra.length; i++) { L.push(extra[i]); }
        for (i = 0; i < res.fams.length; i++) {
            f = res.fams[i];
            var tg = [];
            for (j = 0; j < f.targets.length; j++) { if (f.targets[j].user || f.targets[j].support >= 2) { tg.push(fmt(f.targets[j].val, o.unit) + ' (×' + f.targets[j].count + ')'); } }
            L.push('');
            L.push('== ' + (T.fam[f.key] || f.key) + ' : ' + f.stems.length + ' — ' + T.target + ' : ' + (tg.length ? tg.join(', ') : '—'));
            for (j = 0; j < f.stems.length; j++) {
                var st = f.stems[j];
                if (st.status !== 'irregulier') { continue; }
                var where = st.kind === 'trait' ? st.stroke.label : (st.shape.label || st.shape.id) + ' @ ' + fmt(st.p[0], o.unit, 2) + ' ; ' + fmt(st.p[1], o.unit, 2);
                var note = '';
                if (st.weakTarget) { note += ' [' + T.weak + ']'; }
                if (st.F && (st.F.kind === 'extIn' || (st.G && st.G.kind === 'extIn'))) { note += ' [' + T.missingExt + ']'; }
                L.push('  ' + fmt(st.t, o.unit) + ' → ' + fmt(st.target, o.unit) + ' (' + (st.dev > 0 ? '+' : '') + fmt(st.dev, o.unit) + ')  ' + where + note);
            }
        }
        return L.join('\n');
    }
    function saveReport(doc, txt) {
        var folder = null, base = 'document';
        try { if (doc.saved || doc.fullName) { folder = doc.path; base = doc.name.replace(/\.[^\.]+$/, ''); } } catch (e) { folder = null; }
        if (!folder || !folder.exists) { folder = Folder.desktop; }
        var f = new File(folder + '/' + base + '_epaisseurs.txt');
        f.encoding = 'UTF-8';
        if (f.open('w')) { f.write(txt); f.close(); return f.fsName; }
        return null;
    }

    // --- Programme principal / main ------------------------------------------------
    function run() {
        if (app.documents.length === 0) { alert(T.noDoc); return; }
        var doc = app.activeDocument, sel = doc.selection;
        if (!sel || (sel.typename && sel.typename === 'TextRange')) { alert(sel ? T.textSel : T.noSel); return; }
        if (!sel.length) { alert(T.noSel); return; }
        var items = [], i;
        for (i = 0; i < sel.length; i++) { items.push(sel[i]); }
        var dlg = showDialog(loadCfg());
        if (!dlg) { return; }
        saveCfg(dlg.cfg);
        var o = buildOpts(dlg.cfg);
        var acc = collect(items, o);
        var sk = fmtStr(T.skipped, [acc.skipped.text, acc.skipped.open, acc.skipped.locked, acc.skipped.other]);
        if (!acc.shapes.length && !acc.strokes.length) { alert(T.nothing + '\n' + sk); return; }
        var res = ER.analyzeAll(acc.shapes, acc.strokes, o), before = ER.countStatus(res.stems), extra = [], msg = [];
        msg.push(before.total + ' ' + T.measured + ' : ' + before.ok + ' ' + T.ok + ', ' + before.irregulier + ' ' + T.irr + ', ' + before.isole + ' ' + T.iso);
        var irrItems = [];
        if (dlg.action === 'fix') {
            if (before.irregulier === 0) { msg.push(T.noFixNeeded); }
            else {
                var plan = ER.planFix(res.stems, o), bk = { layer: null, count: 0 }, nSh = 0, nPts = 0, nStr = 0, refused = [], conf = 0;
                for (i = 0; i < acc.shapes.length; i++) {
                    var sh = acc.shapes[i];
                    if (plan.refused[sh.id]) { refused.push(sh.label); continue; }
                    var ap = ER.applyToShape(sh, plan);
                    if (ap.moved > 0) {
                        if (dlg.cfg.backup === 'true') { backupItem(doc, sh.ref, bk); }
                        writeBack(sh); nSh++; nPts += ap.moved; conf += ap.conflicts;
                    }
                }
                for (i = 0; i < res.stems.length; i++) {
                    var st = res.stems[i];
                    if (st.kind === 'trait' && st.status === 'irregulier') {
                        if (dlg.cfg.backup === 'true') { backupItem(doc, st.stroke.ref, bk); }
                        st.stroke.ref.strokeWidth = st.target; nStr++;
                    }
                    if (st.conflict) { conf++; }
                }
                if (bk.layer) { bk.layer.visible = false; bk.layer.locked = true; }
                msg.push(fmtStr(T.fixed, [nSh, nPts, nStr]));
                if (refused.length) { msg.push(T.refused + refused.join(', ')); }
                if (conf) { msg.push(T.conflicts + conf); }
                var acc2 = collect(items, o);
                res = ER.analyzeAll(acc2.shapes, acc2.strokes, o);
                msg.push(T.remain + ER.countStatus(res.stems).irregulier);
                extra = msg.slice(1);
            }
        }
        for (i = 0; i < res.stems.length; i++) {
            if (res.stems[i].status === 'irregulier') {
                var ref = res.stems[i].kind === 'trait' ? res.stems[i].stroke.ref : res.stems[i].shape.ref;
                if (ref) { irrItems.push(ref); }
            }
        }
        if (dlg.cfg.markers === 'true') { drawMarkers(doc, res, o, dlg.cfg.labelsAll === 'true'); }
        if (dlg.cfg.report === 'true') {
            var path = saveReport(doc, buildReport(doc, res, o, extra.concat([sk])));
            if (path) { msg.push(T.reportSaved + path); }
        }
        if (dlg.action === 'analyse' && irrItems.length) { try { doc.selection = null; doc.selection = irrItems; } catch (e) { } }
        msg.push(sk);
        if (before.irregulier === 0 && dlg.action === 'analyse') { msg.push(T.none); }
        app.redraw();
        alert(T.title + ' — ' + T.sum + '\n\n' + msg.join('\n'));
    }

    return { run: run, collect: collect, buildOpts: buildOpts, defaultCfg: defaultCfg, buildReport: buildReport,
             drawMarkers: drawMarkers, writeBack: writeBack, parseTargets: parseTargets, fmt: fmt, T: T };
})();

// --- Lancement / start --------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ER: ER, ERUI: ERUI };
} else if (typeof app !== 'undefined') {
    try { ERUI.run(); } catch (err) { alert('EpaisseursRegulieres : ' + err + (err.line ? ' (ligne ' + err.line + ')' : '')); }
}
