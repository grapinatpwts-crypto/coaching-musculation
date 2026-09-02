# Coaching Fitness — fiche de reprise

App de suivi de musculation pour **1 coach (Jérémy) et ~40 pratiquants**.
PWA statique servie par GitHub Pages, qui parle directement à Firestore
depuis le navigateur. **Pas de serveur applicatif, pas de Cloud Function** :
toute la sécurité tient dans `firestore.rules`. Plan Spark, coût nul par
utilisateur — c'est la contrainte qui a dicté l'architecture.

## Où lire quoi

| Question | Fichier |
|---|---|
| Comment l'app fonctionne (données, écrans, pièges) | `PROJET.md` |
| Pourquoi elle est ainsi, ce qui reste avant les 40 | `PRODUCTION.md` |
| Comment on l'installe de zéro | `README.md` |

`PROJET.md` § 8 (« Pièges rencontrés ») et § 10 (« Prochaines étapes ») sont
les deux sections à ouvrir en premier pour reprendre le travail.

## Comment on travaille ici

- **Tout s'écrit en français** : réponses, commits, documentation, commentaires.
- Un commentaire dit **pourquoi**, souvent en racontant ce qui n'a pas marché
  avant. Jamais une paraphrase du code.
- **Direct sur `main`**, sans branche. Chaque changement livré porte, dans le
  même commit : la doc mise à jour quand le comportement décrit change, et
  `CACHE` incrémenté dans `sw.js` — sinon la PWA garde l'ancienne coquille.
- `git push` **uniquement sur demande** : le dépôt est public et sert l'app,
  pousser met en ligne.
- `index.html` est un monolithe (HTML + CSS + JS inline, ~277 ko). Vérifier la
  syntaxe avant de committer : extraire chaque bloc `<script>` et `node --check`.

## Le piège qui coûte le plus cher

**Un `git push` ne déploie pas `firestore.rules`.** Les règles demandent

```bash
firebase deploy --only firestore:rules
```

(CLI installée et authentifiée en local sur `coaching-musculation-f0c1c`).
Un correctif de règles resté non déployé donne l'illusion que le bug est
corrigé alors que le refus serveur persiste — arrivé le 2 septembre 2026 sur
l'annulation d'une séance. Le signaler dès que le fichier change, ne jamais le
supposer fait.

## Autres pièges Firestore, en bref (détail en § 8)

- `modeles/{id}` est **coach-only** : copier ce dont le pratiquant a besoin sur
  l'attribution à sa création, jamais relire le modèle source depuis son compte.
- Toute lecture d'écran sans `try/catch` laisse « Chargement… » à l'infini si
  Firestore refuse — aucun bruit, contrairement à un appel HTTP.
- `serverTimestamps: 'estimate'` dès qu'on relit un document tout juste écrit,
  sinon le champ vaut `null` et le document semble ne pas exister.
- Une requête `collectionGroup` exige un index composite déclaré **et déployé**.
- Les transactions du SDK client ne lisent pas de requête : les invariants
  « une seule séance ouverte », « une seule attribution En cours » sont une
  lecture puis une écriture, bouton désactivé pendant l'appel. Risque accepté.

## Le principe qu'on ne rediscute pas sans décision explicite

**Rien ne part vers un pratiquant sans un geste du coach.** Aucun message,
aucune relance, aucune notification automatique. Jérémy est auto-entrepreneur :
l'app lui fait gagner du temps, elle ne parle jamais à sa place.

## Coordonnées

- Dépôt : `grapinatpwts-crypto/coaching-musculation` (public)
- En ligne : https://grapinatpwts-crypto.github.io/coaching-musculation/
- Firebase : `coaching-musculation-f0c1c`, Firestore `europe-west9`
- Écran de consentement Google : **mode Test** — seuls les comptes ajoutés se
  connectent. Passage en Production à faire avant d'ouvrir aux 40.
- Seul vrai secret du projet : `scripts/service-account.json` (ignoré par git).
  La config Firebase visible dans `index.html` est publique par nature.
