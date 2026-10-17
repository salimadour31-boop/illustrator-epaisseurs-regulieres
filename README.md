# Épaisseurs régulières — EpaisseursRegulieres.jsx

Script Adobe Illustrator (ExtendScript) qui **mesure automatiquement toutes les épaisseurs** d'un lettrage, d'un logo ou d'un jeu de pictos **vectorisés** — fûts verticaux, traverses horizontales, diagonales, panses courbes aux extrêmes, et même les contours (traits) — puis **signale les épaisseurs presque égales** (12,13 pt au lieu de 12 pt) et peut **les rendre exactement égales** en déplaçant les parois.

C'est l'« Auto-meter » des éditeurs de polices (FontLab, Show Stems de Glyphs), mais pour des dessins Illustrator.

> ⚠️ **Non testé dans Illustrator.** La syntaxe et la logique ont été vérifiées hors d'Illustrator (voir « État des tests »). Travaillez sur une **copie** de votre fichier.

## Ce que fait le script

1. **Repère les parois** de chaque forme remplie (tracé fermé ou tracé transparent) : segments droits (verticaux, horizontaux, diagonaux) et points d'ancrage posés à un extrême d'une courbe (tangente verticale ou horizontale). Les extrêmes sans point d'ancrage sont mesurés aussi (mais pas corrigés).
2. **Mesure les épaisseurs** en lançant des rayons perpendiculaires à travers la matière (calcul exact sur les courbes de Bézier, règles de remplissage non nul / pair-impair respectées, contours qui se chevauchent gérés). Une mesure n'est gardée que si la paroi opposée est parallèle et vraiment en face :
   - la largeur totale d'un H à la hauteur de la barre, la longueur d'un bras de E ou d'une pastille ne sont **pas** prises pour des fûts ;
   - les parois communes doivent être en face sur au moins 60 % de leur longueur.
3. **Regroupe les valeurs en familles** :
   - **Lettrage / logo** : fûts verticaux droits, fûts verticaux courbes (panses), traverses horizontales droites, traverses courbes, diagonales et contours, chacun à part (un o est normalement un peu plus épais qu'un l) ;
   - **Pictos** : une seule famille, contours compris (les icônes vectorisées et celles en traits doivent avoir le même poids).
4. **Choisit la cible de chaque groupe** : la valeur la plus répétée ; à égalité, la plus « ronde » (12 pt, 4,5 mm) ; sinon la médiane, ce que le rapport indique. Vous pouvez aussi **imposer vos épaisseurs** (ex. « 12 ; 8,5 »).
5. **Analyser** : dessine un repère par mesure sur un calque **non imprimable** « Épaisseurs — repères » (vert = régulière, rouge = à égaliser avec « 12,13 pt → 12,000 pt », gris pointillé = isolée), sélectionne les objets concernés et peut enregistrer un **rapport .txt**.
6. **Corriger** : déplace les parois pour que chaque épaisseur irrégulière tombe exactement sur sa cible :
   - **symétrique** (les deux parois bougent de moitié, l'axe du fût reste en place),
   - ou **garder la silhouette extérieure** (seules les parois intérieures, côté contreforme, bougent ; un fût sans paroi intérieure est alors corrigé symétriquement) ;
   - toutes les mesures sont résolues **ensemble** (moindres carrés) : une paroi partagée par deux fûts (le jambage gauche d'un H) n'abîme pas le fût voisin déjà juste ;
   - un coin glisse le long du segment voisin (une diagonale garde son angle), les poignées suivent leur point, les extrêmes restent des extrêmes ;
   - un déplacement de plus de 25 % de l'épaisseur est refusé ; les originaux sont copiés sur un calque masqué et verrouillé « Épaisseurs — originaux » ; l'analyse est relancée et le nombre d'écarts restants est affiché ;
   - les contours (traits) irréguliers reçoivent l'épaisseur cible.

Toutes les modifications d'une exécution se font en une seule fois. Illustrator les annule normalement d'un seul *Édition > Annuler*, mais cela n'a pas été vérifié ici : gardez une copie du fichier.

## Pourquoi c'est nouveau

Recherches faites le 17/10/2026, avant d'écrire le code :

- **Éditeurs de polices seulement** : FontLab 8 (Auto-meter, « Irregular stem tolerance »), Glyphs (Show Stems Pro de Mark Frömberg, Show Stem Thickness, Callipers de Simon Cozens), glyphs-mcp (`compare_stems`), Runebender. Ils travaillent sur des **fichiers de polices**, pas sur un dessin Illustrator.
- **Dans Illustrator, la mesure est manuelle** : outil Mesure natif, Dynamic Measure d'Astute VectorScribe (« Measure Closest Distance Between Paths » entre deux tracés choisis à la main), CADtools. Aucun de ces outils ne trouve les fûts tout seul, ne compare les valeurs et ne corrige.
- Demande réelle sans réponse automatique : Adobe Community « Looking for a quick way to tell the thickness of a line, part of a outline or a ring » (2024 : ligne tracée à la main ou Astute), Graphic Design SE « Fixed line thickness for scanned, traced drawings » (2016) et « Stem typography width » (2018).
- Rien chez creold, Alexander Ladygin, Hiroyuki Sato (shspage), wckdtall, Josh Duncan, Pixeden (son « Is Unified Style » vérifie seulement qu'on ne mélange pas formes et traits). Recherches GitHub « illustrator stem thickness / stem width / stroke uniformity / irregular stems » sans résultat.

## Installation

- **Ponctuelle** : *Fichier > Scripts > Autre script…* puis choisissez `EpaisseursRegulieres.jsx`.
- **Permanente** : copiez le fichier dans le dossier des scripts d'Illustrator puis relancez Illustrator. Il apparaît dans *Fichier > Scripts*.
  - Windows : `C:\Program Files\Adobe\Adobe Illustrator <version>\Presets\<langue>\Scripts\`
  - macOS : `/Applications/Adobe Illustrator <version>/Presets.localized/<langue>/Scripts/`

## Utilisation

1. Vectorisez une **copie** du texte si besoin (*Texte > Vectoriser*) : le texte vivant n'est pas mesuré.
2. Sélectionnez le lettrage, le logo ou les pictos (groupes, tracés transparents et tracés simples acceptés ; objets verrouillés ou masqués ignorés).
3. Lancez le script et réglez :

| Réglage | Par défaut | Rôle |
|---|---|---|
| Type de dessin | Lettrage / logo | Familles séparées, ou une seule famille (Pictos) |
| Unité | pt | pt ou mm, pour l'affichage et les valeurs saisies |
| Écart toléré dans une famille | 3 % | Au-delà, deux épaisseurs sont jugées volontairement différentes |
| Ignorer les écarts inférieurs à | 0,005 | Précision en dessous de laquelle deux valeurs sont égales |
| Épaisseurs imposées | (vide) | Cibles saisies à la main, ex. « 12 ; 8,5 » |
| Mesurer les diagonales | oui | Fûts de A, V, N, barres obliques… |
| Comparer aussi les contours | oui | Les traits sont comparés aux formes |
| Tolérance de parallélisme | 3° | Parois jugées parallèles, et axes horizontal / vertical |
| Correction | symétrique | ou « garder la silhouette extérieure » |
| Copie des originaux | oui | Calque masqué « Épaisseurs — originaux » |
| Repères / étiquettes / rapport .txt | oui / écarts / non | Le rapport est enregistré à côté du document (ou sur le Bureau) |

4. Cliquez **Analyser** pour voir les écarts sans rien modifier, puis **Corriger** si le résultat vous convient. Les réglages sont mémorisés.

Message clair si aucun document n'est ouvert, si rien n'est sélectionné ou si la sélection ne contient rien de mesurable. Interface en français ou en anglais selon la langue d'Illustrator.

## Limites connues

- Les **polices professionnelles** contiennent des corrections optiques voulues (fûts du m plus fins que ceux du n, etc.) : le script les signale aussi. Sur de vrais mots vectorisés, c'est en moyenne 5,8 alertes par mot (2 à 90 pour 6 mots selon la police). Lancez **Analyser** et décidez vous-même.
- Les panses à **axe oblique** (lettres à contraste incliné) ne sont pas mesurées. Les extrêmes **sans point d'ancrage** sont mesurés mais pas corrigés : ajoutez le point, puis relancez le script.
- Les diagonales courbes ne sont pas mesurées. Une forme remplie avec un contour visible est mesurée sans ce contour.
- Ignorés : texte vivant, symboles, effets non décomposés, tracés ouverts remplis.
- Durée non mesurée dans Illustrator (sous Node.js, environ 4 ms par mot vectorisé ; ExtendScript est nettement plus lent).

## Version ciblée

Illustrator CC 2018 → 2026 (ExtendScript ES3, ScriptUI). Aucun appel réseau, aucune collecte de données.

## État des tests

**Non testé dans Illustrator.** Tests effectués sur la machine de développement (scripts dans `tests/`) :

- **Syntaxe** : analyse par acorn en ECMAScript 3 et 5, sans erreur.
- **Scènes synthétiques** (`tests/synth.js`) : 600 scènes (H, E, I, O, D ; remplissage non nul et pair-impair ; deux modes de correction), 5 198 vérifications, 1 182 erreurs injectées (de 0,3 à 0,9 fois la tolérance). Résultat : 1 180 détectées et ramenées exactement à leur valeur, 0 écart restant après correction, 0 fausse alerte sur les scènes intactes, 2ᵉ correction sans aucun déplacement, silhouette extérieure intacte dans 434 cas sur 434. Les 2 cas manqués : une famille de deux valeurs toutes deux faussées, donc sans valeur de référence.
- **Vraies polices** (`tests/fonts.py` + `tests/fonttest.js`) : 108 mots tirés de 18 polices (DejaVu Sans et polices Google, contours lus avec fontTools), 3 428 épaisseurs mesurées. Sur 324 erreurs injectées, 317 sont détectées (97,8 %) et 298 ramenées exactement à leur valeur d'origine. Les autres sont ramenées vers une cible voisine plus fréquente ou ne sont plus mesurées.
- **Cas géométriques** (`tests/rot.js`, `tests/extra.js`) : 35 vérifications. Fûts tournés de 17° à 62°, contours qui se chevauchent, pair-impair, rayon qui frôle un sommet ou longe un segment, angle des diagonales gardé, pastilles et ellipses.
- **DOM Illustrator et ScriptUI simulés** (`tests/mockdom.js`) : 26 vérifications sur 14 scénarios. Cas testés : pas de document, rien de sélectionné, texte en cours d'édition, Analyser, Corriger avec copie des originaux et rapport, 2ᵉ passage, silhouette, pictos avec traits en CMJN, mm et cibles imposées, saisie invalide, Annuler, réglages mémorisés, interface anglaise.
- **Tests par mutation** : 15 erreurs volontaires introduites dans le code, 15 détectées par ces tests.

Si vous l'essayez dans Illustrator, signalez le résultat dans une *issue*.

## Licence

MIT — © 2026 Amirouche Amwanes. Code 100 % original.
