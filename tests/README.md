# Tests (hors Illustrator / outside Illustrator)

Node.js ≥ 18. Depuis la racine du dépôt / from the repo root:

```
node tests/synth.js      # scènes synthétiques à erreurs injectées
node tests/rot.js        # fûts tournés, chevauchements, pair-impair
node tests/extra.js      # cas limites des rayons, diagonales, pastilles
node tests/mockdom.js    # DOM Illustrator + ScriptUI simulés
python3 tests/fonts.py && node tests/fonttest.js   # vraies polices (fontTools ; chemins de polices locaux à adapter)
```
