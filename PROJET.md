# Coaching Fitness — état du projet

Document de reprise : **comment l'app fonctionne**. Il donne tout le contexte
nécessaire pour continuer le travail sans repartir de zéro.

Pour **pourquoi elle est ainsi et où elle va** — les principes, ce qui reste avant
d'ouvrir aux 40 pratiquants, et les idées gardées dont le local-first — voir
[PRODUCTION.md](PRODUCTION.md).

---

## 1. Objectif

Application de suivi d'entraînement pour **1 coach et ~40 pratiquants** de musculation.

Contraintes qui ont dicté l'architecture :
- Pas de coût par utilisateur (AppSheet écarté : ~205 $/mois à 41 utilisateurs)
- Pas de serveur à administrer (rejeté pour raisons de sécurité et de maintenance)
- Données d'entraînement considérées comme sensibles → jamais exposées publiquement
- Utilisable sur iPhone et Android ; le coach travaille aussi sur PC
- **Rien ne part vers un pratiquant sans un geste du coach.** Il est
  auto-entrepreneur : l'app lui fait gagner du temps, elle ne parle jamais à sa
  place. Aucun message, aucune relance, aucune notification automatique vers un
  pratiquant. Décidé explicitement, à ne pas revenir dessus sans nouvelle décision.

## 2. Architecture retenue

```
 iPhone / Android          GitHub Pages              Firebase
 ┌──────────────┐          ┌────────────┐            ┌──────────────────────────┐
 │ PWA installée│ ────────▶│ index.html │ ──SDK─────▶│ Auth (Google)             │
 │ (icône)      │          │ (statique) │            │ Firestore (europe-west9) │
 └──────────────┘          └────────────┘            │  ↳ Security Rules        │
                                                       └──────────────────────────┘
```

Le front-end statique ne contient **aucune donnée**. L'authentification se fait par
Firebase Auth (provider Google) côté navigateur ; le SDK Firestore lit et écrit
directement depuis le client — **il n'y a plus de routeur serveur du tout**. La
sécurité tient entièrement aux Security Rules (`firestore.rules`), qui lisent le
rôle du compte par `get()` sur son propre document plutôt que par un jeton
personnalisé, pour rester sur le plan gratuit (pas de Cloud Function).

Jusqu'à l'été 2026, le backend était Google Apps Script + Google Sheets (§ 12 et
`apps-script/`, conservés en lecture, plus jamais appelés). Le détail du chantier de
bascule, vague par vague, est dans `git log` de la branche `firestore` — chaque
commit explique un « pourquoi ».

## 3. Coordonnées du projet

| Élément | Valeur |
|---|---|
| Dépôt GitHub | `grapinatpwts-crypto/coaching-musculation` (public) |
| App en ligne | https://grapinatpwts-crypto.github.io/coaching-musculation/ |
| Projet Firebase | `coaching-musculation-f0c1c` (plan **Spark**, gratuit) |
| Firestore | région `europe-west9`, règles dans `firestore.rules`, index dans `firestore.indexes.json` |
| Coach | Jérémy — `grapinat.pwts@gmail.com` |
| Salle du coach | Wellness Sport Club — Lyon Confluence |
| Second compte test | `guillaume.rapinat@gmail.com` |

La configuration Firebase (`apiKey`, `authDomain`...) visible dans `index.html` est
publique par nature — ce ne sont pas des secrets, la sécurité tient aux Security
Rules, pas à leur confidentialité. La clé de compte de service
(`scripts/service-account.json`, utilisée uniquement par `scripts/seed.mjs` en
local) est le seul vrai secret du projet : ignorée par git, jamais envoyée au client.

**État de l'écran de consentement Google (Firebase Auth) : mode Test.** Conséquence :
seuls les comptes explicitement ajoutés peuvent se connecter. Le passage en
Production sera nécessaire avant d'ouvrir aux 40 pratiquants — décision
volontairement reportée, voir `PRODUCTION.md` § 5.

## 4. Fichiers

| Fichier | Emplacement | Rôle |
|---|---|---|
| `index.html` | dépôt GitHub | PWA complète (HTML + CSS + JS inline), lit/écrit Firestore directement |
| `firestore.rules` | dépôt GitHub | toute la sécurité — lecture/écriture par collection, cloisonnement par email. **Déployé à part**, voir ci-dessous |
| `firestore.indexes.json` | dépôt GitHub | index composites nécessaires aux requêtes (attributions, séances, séries, commentaires) |
| `scripts/seed.mjs` | dépôt GitHub | seed initial (catalogue, modèles-types, compte coach) — exécuté une fois en local avec `firebase-admin`, jamais depuis le client |
| `manifest.json` | dépôt GitHub | manifeste d'installation |
| `sw.js` | dépôt GitHub | service worker, cache de la coquille — `CACHE` à incrémenter à chaque déploiement |
| `modele-import.xlsx` | dépôt GitHub | gabarit d'import de programme, lu par SheetJS dans le navigateur |
| `apps-script/` | dépôt GitHub | **archive** de l'ancien backend Apps Script — jamais appelé, conservé pour référence (§ 12) |
| `README.md` | non déposé | guide d'installation en 8 étapes |
| `favicon.ico` | racine | monogramme officiel Wellness, source des icônes |
| `assets/` | racine | logo Wellness pour fond sombre |

**Icônes :** produites depuis `favicon.ico`, le monogramme officiel Wellness
(W cerclé, `#C22026`, transparent, 135×134) fourni par le coach. Fond `#151515`,
marque à 72 % pour les icônes classiques, 76 % pour la maskable (12 % de marge par
côté, zone sûre respectée). Régénérables : voir § 9.

**`firestore.rules` ne part pas avec le dépôt.** Un `git push` met le front-end
en ligne (GitHub Pages) mais ne touche pas aux règles : elles demandent

```
firebase deploy --only firestore:rules
```

depuis un poste où la CLI Firebase est authentifiée. Un correctif de règles
resté non déployé donne l'illusion que le bug est corrigé alors que le refus
serveur persiste — c'est exactement ce qui est arrivé à l'annulation d'une
séance, refusée pour « droits insuffisants » alors que le code était bon. À
signaler explicitement dès que ce fichier change, et à ne jamais supposer fait.

## 5. Modèle de données Firestore

Nesté ce qui n'a jamais de sens hors de son parent (lignes de modèle, lignes de
programme, séries d'une séance) ; gardé à plat ce qui doit être requêté par égalité
sur l'email à travers tous les parents (`attributions`, `seances`).

```
pratiquants/{email}                         # doc ID = email en minuscules
  nom, role, admin, statut, telephone, date_inscription, objectif, notes
  message_coach                              # mot d'accueil, écrit par le coach seul (§ 8 undecies)
  resume: { nbSeances, derniereSeanceLe }    # dénormalisé, écrit par le pratiquant en fin de séance
  pratiquants/{email}/prive/photo            # doc unique, coach-only
  pratiquants/{email}/maxis/{exerciceId}     # doc ID = exercice_id, coach-only en écriture
  pratiquants/{email}/activites/{activiteId} # auto-id, self-service
  pratiquants/{email}/recurrences/{id}       # planning personnel, self-service

exercices/{exerciceId}                       # doc ID = "EX001"...
modeles/{modeleId}                           # auto-id, coach-only
  modeles/{modeleId}/lignes/{ligneId}        # auto-id

attributions/{attributionId}                 # auto-id, TOP-LEVEL (requêtes par email+statut)
  email, modele_id, nom, date_debut, date_fin, statut, paye, notes, duree_semaines, cree_le
  fin_prevue                                 # 'AAAA-MM-JJ' — le plan ; date_fin est la clôture réelle
  attributions/{id}/planning/{AAAA-MM-JJ}    # exceptions : séance déplacée, annulée, supprimée
  nb_jours, nb_exercices                     # dénormalisés, lus par les listes
  duree_max_min                              # la séance la plus longue, en minutes — filtre « temps max »
  attributions/{id}/programme/{ligneId}      # copie des lignes du modèle au moment de l'attribution
  attributions/{id}/ajustements/{exerciceId} # doc ID = exercice_id, écrit par le pratiquant lui-même

seances/{seanceId}                           # auto-id, TOP-LEVEL (requêtes par email+date)
  email, date, jour, duree_min, duree_prevue, ressenti, notes, exercices_finis: string[]
                                             # ↳ des ligne_id (voir « Une ligne, un compteur »)
  seances/{seanceId}/series/{serieId}        # auto-id
                                             # exercice_id (historique) + ligne_id (compteur)

commentaires/{commentaireId}                 # TOP-LEVEL
compteurs/exercices                          # doc unique { dernier }, transaction pour "EXnnn"
```

Les champs eux-mêmes ont presque tous survécu tels quels au portage (`cadence`,
`pct_rm`, `duree_s`, `pause_s`...) — c'est la couche données qui a changé
(`api()` → SDK Firestore direct), pas la forme des objets que les écrans
consomment. Les sous-sections qui suivent restent donc valables mot pour mot.

`jour` est un texte libre (ex. « Lundi — Haut ») : il devient l'onglet affiché dans
l'app. Les jours sont triés par jour de semaine (`triJours`), pas alphabétiquement —
sinon « Jeudi » passait avant « Lundi ».

**Le jour de la semaine vit dans cet intitulé, et ce n'est pas qu'un tri.** C'est
lui qui place la séance dans la semaine du pratiquant, dans son bandeau d'accueil
et dans son calendrier (`rangJour`, cherché n'importe où dans la chaîne, sans
casse). Un programme importé sous « Séance 1, 2, 3 » — le nommage des dix
programmes types — n'apparaissait donc **nulle part** dans sa semaine, et rien ne
le disait : la convention n'était écrite que dans une phrase de la modale de
création.

Le coach le choisit maintenant sur des **pastilles Lun…Dim**, à la création
comme au renommage, et voit l'intitulé qui en sortira avant de valider
(`jourSemaineDe` / `libelleSansJour` / `composerJour` font l'aller-retour entre
les deux formes). Le modèle de données ne change pas : c'est toujours une chaîne.
« Aucun » reste possible — un modèle se compose parfois avant de savoir quels
jours le pratiquant pourra tenir — mais l'éditeur affiche alors franchement ce
que ça coûte.

### Les blocs

`bloc` regroupe les lignes qui s'enchaînent. **Plusieurs lignes partageant le même
`bloc` forment un superset ou un circuit** : on enchaîne les exercices, et le repos
n'intervient qu'à la fin du tour. `ordre` classe les exercices à l'intérieur du bloc.

`series` et `repos_s` sont lus sur la **première ligne du bloc** et valent pour tout
le bloc ; `reps_cible` et `charge_cible` restent propres à chaque ligne.

Une ligne seule dans son bloc = une série classique, comportement d'avant.

C'est le niveau « Travail » du modèle AppSheet (§ 13), repris dans sa forme légère :
un champ, pas une collection à part. La version complète — programmes réutilisables,
versionnés, affectés à plusieurs pratiquants — n'est pas faite.

### Les deux minuteurs

Un bloc en fait intervenir **deux**, et c'est la distinction qui structure la saisie :

| Colonne | Portée | Quand il se déclenche |
|---|---|---|
| `pause_s` | la ligne | après cet exercice, **à l'intérieur** du tour, avant le suivant du bloc |
| `repos_s` | le bloc | une fois le tour **complet** terminé, avant de repartir au premier |

L'app enchaîne toute seule : série validée → pause → exercice suivant du bloc →
… → dernier du bloc → repos → retour au premier. Une `pause_s` à 0 enchaîne sans
temps mort. Un bloc à un seul exercice ne connaît que `repos_s`, comportement d'avant.

**Le bandeau dit ce qui vient** (`aVenir`) : le nom du prochain exercice, la
série qui commence et ce qu'elle demande. C'est dans un superset que ça compte —
le repos est le moment où l'on va chercher la barre du mouvement suivant, et
l'apprendre à la fin du minuteur, c'est trente secondes passées à ne pas se
préparer. Deux lignes, pas une : sur un téléphone, « Développé incliné aux
haltères prise neutre » remplit la largeur à lui seul, et tout mettre à la suite
coupait justement la série et la charge. Le nom peut être tronqué, jamais ce
qu'il faut charger. Les kilos y sont seuls, sans le « 80 % de 82 kg estimés » de
`chargeTexte` : pendant le repos on charge la barre, on ne recalcule pas son
pourcentage.

**Ces deux enchaînements ne partent que depuis le panneau de saisie.** Valider
une série depuis la pastille est un raccourci : il écrit la série et rien
d'autre, sans armer de minuteur. D'où la **rangée de chronos** en haut de
l'écran séance, sous les onglets de jours (`peindreChronos`) : un bouton par
temps mort du jour, qui lance `lancerMinuteur` à la main. Les durées ne sont
pas inventées — ce sont les `repos_s` des blocs et les `pause_s` des exercices
du jour affiché. Un jour sans aucun temps mort déclaré n'affiche pas de rangée
du tout ; le programme du coach fait foi.

**Les boutons ne portent que la durée** — « 45 s », « 1 min 30 ». Pause et
repos ne se distinguent que dans l'enchaînement automatique, où le mot dit
d'où vient le temps mort ; lancé à la main, un chrono de 30 s est un chrono de
30 s. La déduplication porte donc sur la seule durée : un repos et une pause
de même longueur ne font qu'un bouton.

**Le minuteur actif est une île, pas un bandeau.** `#repos` flotte au-dessus
de la nav plutôt que de manger toute la largeur du bas de l'écran : carte
courte avec un anneau de progression SVG (`lancerMinuteur`, `REPOS_C` pour la
circonférence, dashoffset recalculé chaque seconde), le chiffre, et un bouton
Passer en icône plutôt qu'un lien souligné — plus grande cible, moins de
lecture. Choisi après un canvas de six pistes visuelles début septembre 2026 ;
les autres (anneau plein écran, jauge horizontale, plein écran final, bandeau
enrichi) restent en archive si le style d'aujourd'hui ne convient plus.

**Trois bips, réglables par appareil comme le thème (`Réglages ▸ Sons du
chrono`, icône cloche de l'en-tête).** Un bip d'alerte à N secondes de la fin
(`bipPremierSecondes`, 5 à 30 s, défaut 10, désactivable) et un décompte
sonore des trois dernières secondes (`bipDecompteActif`, désactivable) ; le
bip de fin (`t <= 0`) reste inconditionnel, ce n'est pas un réglage mais le
signal que le temps mort est fini. `bip()` prend une fréquence et une durée,
et les trois sons se distinguent à l'oreille sans qu'on ait à les compter :

| Moment | Son |
|---|---|
| alerte à N secondes | 660 Hz, 0,4 s — grave, un simple « prépare-toi » |
| décompte 3-2-1 | 880 Hz, 0,4 s — le défaut historique |
| fin du temps mort | 1175 Hz, 0,8 s — plus aigu et deux fois plus long : il ne dit pas « encore une seconde » mais « c'est parti » |

**Le volume se règle** (`volumeBip`, curseur de 0 à 100 %, défaut 25). Le gain
était figé à 0,25 : de la musique dans les écouteurs passait par-dessus le bip,
et il n'y avait aucun moyen de monter. Le curseur va jusqu'au gain maximal de
l'oscillateur, soit quatre fois l'ancien niveau, et un bouton **Écouter** joue le
bip au niveau choisi — un volume se règle à l'oreille, musique allumée, pas en
lisant un pourcentage.

**À zéro, la vibration reste.** C'est un réglage à part entière — salle bruyante,
appartement à minuit — et pas une panne : `bip()` sort avant l'oscillateur, mais
après `navigator.vibrate`.

Le piège de ce réglage, attrapé au banc d'essai : `Number(localStorage.getItem())`
sur une clé absente vaut **0**, un zéro parfaitement valide pour la borne
`0 ≤ v ≤ 100`. Tout appareil n'ayant jamais ouvert le réglage serait donc devenu
muet. L'absence se teste **avant** la conversion.

La vibration suit la durée du son (`d * 500` ms), le départ se sent donc aussi
dans la poche. Réglage `localStorage`, comme l'apparence : le même compte peut
vouloir du silence sur son téléphone et du son sur la tablette de la salle.

### Une séance planifiée n'est pas un document

Le programme dit « lundi, mercredi, vendredi, du 1er au 28 » : c'est une
**règle**, que le calendrier déroule (`previsionsDuJour`). Aucune occurrence
n'est écrite — un programme de quatre semaines sans imprévu ne coûte pas un
seul document.

Un imprévu est donc une **exception** à la règle, dans
`attributions/{id}/planning/{AAAA-MM-JJ}`. Le doc ID est la date d'origine :
l'écriture est idempotente et deux exceptions ne peuvent pas se contredire sur
la même date. Un seul jour de programme peut tomber un jour donné — les jours
sont des jours de la semaine, distincts par construction.

| `etat` | Effet | Qui |
|---|---|---|
| `deplacee` | quitte sa date, reparaît à `date_cible` | athlète et coach |
| `annulee` | reste visible, barrée et estompée | athlète et coach |
| `supprimee` | disparaît des deux côtés | coach seul |

**Annuler et supprimer ne disent pas la même chose.** L'athlète annule : il ne
fera pas celle-là, et le coach doit pouvoir le voir — c'est un fait, pas un
reproche, donc l'étiquette reste. Le coach supprime : il retire la séance du
programme, elle n'a plus lieu d'être affichée. Les règles le tiennent, pas
seulement l'écran : `create, update` n'accepte de l'athlète que `'deplacee'` et
`'annulee'`.

**Un déplacement ne bouge que son occurrence.** Décaler tout le reste
réécrirait le programme pour un imprévu d'un jour ; le rythme est justement ce
qui ne doit pas bouger.

### Fin prévue, fin réelle

Deux champs, deux natures. `fin_prevue` (chaîne `AAAA-MM-JJ`, comme le planning
personnel, pour qu'aucun fuseau ne décale un jour) est **le plan** : elle borne
la projection au calendrier et se pilote depuis Programme ▸ Nom et dates.
`date_fin` reste **le fait** : la clôture, posée le jour où le coach clôt.

La même modale porte le **nom du programme attribué**, qui venait du modèle et ne
bougeait plus : un programme adapté en cours de route (« Force 5×5 — reprise
d'épaule ») peut maintenant le dire, sans toucher au modèle d'origine. Un nom
vide est refusé — il ne resterait rien à lire dans le sélecteur ni dans le
message au pratiquant. Pas d'appui long ici, contrairement aux modèles et aux
jours : le nom s'affiche dans un `select`, et un appui prolongé dessus ouvre le
sélecteur natif du système — le geste ne nous appartient pas.

Durée et fin prévue disent la même chose de deux façons : `finPrevueDe()` et
`semainesEntre()` se répondent, et la modale recalcule l'une quand on saisit
l'autre — le coach n'a pas à compter les semaines. La dernière journée est
incluse : quatre semaines à partir du mardi 1er finissent le lundi 28.

Les attributions créées avant `fin_prevue` n'en ont pas ; la lecture retombe
sur `duree_semaines`, déjà copiée du modèle. Un programme de quatre semaines
donné hier est donc borné sans rien ressaisir.

### Le calendrier et le bandeau nomment ce qu'ils montrent

Les deux grilles — le bandeau « Cette semaine » de l'accueil et le calendrier
mensuel — partagent le même vocabulaire visuel, produit par `etiquettes()` :

| Étiquette | Ce que c'est |
|---|---|
| rouge, aplat | une séance du coach qui a eu lieu |
| rouge, contour | une séance du coach encore à faire |
| encre du texte, aplat | une activité que le pratiquant a consignée |
| encre du texte, contour | une planification — son intention, pas un fait |

Deux couleurs, deux états : **le rouge dit qui l'a décidé** (le coach),
**l'aplat dit que ça a eu lieu**. « Encre du texte » est `--chalk` : blanche
sur le thème sombre, noire sur le clair, sans règle en double.

Chaque étiquette porte un **nom court** plutôt qu'un point : `nomCourt()`
coupe au tiret — « Mercredi — Séance 2 » devient « Séance 2 » — parce que la
colonne donne déjà le jour et que la place restante vaut mieux qu'une
redite. Un libellé sans tiret est rendu tel quel : c'est le coach qui nomme
ses jours.

Une journée peut en porter plusieurs. L'ordre est celui de `agendaDuJour()` :
**la séance du coach d'abord** — c'est elle qui structure la journée — puis le
reste à l'heure de début, et ce qui n'a pas d'heure en dernier plutôt que placé
au hasard à minuit. Au-delà de trois, un « +N » compte le reste ; le
`aria-label` de la case, lui, énonce tout, la troncature ne doit rien cacher au
lecteur d'écran.

Le calendrier lit deux sources sans jamais les confondre : l'historique
(`dataCalendrier`, des faits) et le planning (`dataRecurrences`, des
intentions), réunis seulement à l'affichage par `itemsDuJour()`.

**Un récurrent est hebdomadaire, point.** « Chaque mois » a été retiré du
formulaire : son seul champ de jour était un jour de la *semaine*, il ne disait
pas laquelle du mois — aucune grille ne pouvait donc le placer, et une option
qui n'aboutit nulle part vaut moins que pas d'option. Le refaire un jour
demande de lui donner un rang (« 1er mardi », « 3e jeudi »), pas de rouvrir le
menu. Le champ `frequence` reste écrit à `'semaine'` et les deux lectures
gardent leur filtre : une entrée créée avant garde sa valeur, reste invisible
aux grilles, et sa ligne de gestion le dit en toutes lettres.

Ce qui n'y est **pas** : les séances du programme encore à venir sur des jours
passés. Le calendrier dirait alors « tu devais, tu n'as pas » sur chaque case
vide — un jugement que l'app ne porte nulle part ailleurs (§ 8, « aucune notion
d'échec »).

### Cadence

`cadence` est un tempo en quatre temps, dans l'ordre
**montée · position haute · descente · position basse**.
« 1-0-3-1 » = montée en 1 s, pas d'arrêt en haut, descente en 3 s, 1 s en bas.

**Les tirets se tapent tout seuls.** Quatre chiffres collés suffisent : « 1031 »
devient « 1-0-3-1 ». Les tirets sont évidents et pénibles à saisir sur un clavier de
téléphone. Un temps à deux chiffres — un maintien de 10 secondes — demande encore les
tirets : « 1-10-1-0 ». Le champ n'est réécrit qu'une fois les quatre chiffres posés,
et seulement si le curseur est au bout, pour ne pas le déplacer en pleine frappe.

Affichée en pastille sur la carte et en toutes lettres dans la saisie, accompagnée
d'une **courbe** : le temps en abscisse, la position de la charge en ordonnée, une
ligne rouge entre les deux guides. La pente donne la vitesse, le plat donne l'arrêt.
Fonction `courbeCadence()` dans `index.html`, SVG inline, aucune dépendance.

Purement indicatif : rien n'est chronométré dessus.

### Une ligne, un compteur

Un même exercice peut revenir **plusieurs fois dans un bloc** — Zercher squat en
4 × 6 à 50 kg, puis 4 × 12 à 30 kg. Ce sont deux lignes de programme distinctes,
et chacune compte ses propres séries : deux pastilles indépendantes, que le
pratiquant valide séparément. Rien ne les associe.

C'est pour ça que la série écrite porte **deux** identifiants :

| Champ | Sert à |
|---|---|
| `exercice_id` | l'historique de l'exercice, tous programmes confondus — « dernière fois », record, maxi estimé |
| `ligne_id` | le compteur de la séance en cours — l'id du doc `attributions/{id}/programme/{ligneId}` |

`exercices_finis` porte lui aussi des `ligne_id` : clore une ligne ne clôt pas
l'autre. Les séances écrites avant l'ajout de `ligne_id` n'en ont pas ; `dataSeance`
répartit alors leurs séries sur les lignes de leur exercice, dans l'ordre, chacune
jusqu'à son nombre prévu. Sans ce repli, la première ligne héritait de tout.

**Le compteur ne dépasse jamais la consigne.** Une fois les séries prévues
validées, la pastille est pleine et inerte, et le bouton du panneau passe à
« Les N séries sont faites ». Un verrou par ligne (`enEcriture`) empêche deux
appuis rapprochés d'écrire chacun leur série avant que l'autre n'ait été comptée —
la pastille répond plus vite que Firestore.

### Exercices au temps

`duree_s` renseigné bascule l'exercice en mode chrono et `reps_cible` est ignoré.
Une valeur numérique donne un décompte (le gainage à 45 s), la valeur `max` un
chrono qui monte jusqu'à l'échec. La série enregistrée porte alors `duree_s` au lieu
de `reps` — c'est pour ça que `logSerie_` accepte l'un **ou** l'autre.

**Cinq secondes de préparation** (`PREPA_S`) avant que le décompte ne parte :
« Démarrer » lance d'abord une mise en place — le grand chiffre décompte 5, 4, 3,
2, 1, l'étiquette dit *Préparation*, le bouton devient *Annuler* — puis le bip de
départ et l'exercice commence. Sans elles, les premières secondes de la planche se
passaient à poser le téléphone et à s'installer : le temps tenu ne valait pas ce
qu'il annonçait. Le décompte sonore des trois dernières secondes vaut aussi pour
cette mise en place, il suit le même réglage.

**Le temps écoulé enregistre la série et lance le repos**, sans passer par le
bouton. C'était le geste manquant, et pour cause : chercher « Valider » les mains
au sol, en planche, n'est pas faisable. Les deux chemins — le bouton et la fin du
temps — passent par la même fonction (`validerSerie`) pour qu'ils ne divergent
pas. Séance pas encore démarrée, rien à écrire : le chrono s'arrête comme avant.

## 6. Accès aux données — fonctions `index.html`

Plus d'API : chaque écran appelle le SDK Firestore directement. La table ci-dessous
mappe l'ancienne action serveur à la fonction qui l'a remplacée, pour retrouver un
comportement documenté dans un vieux commit ou un commentaire Apps Script.

| Ancienne action | Fonction actuelle | Notes |
|---|---|---|
| `bootstrap` | `chargerProfil` | lecture directe de `pratiquants/{email}` |
| `seance` | `dataSeance` / `chargerSeance` | assemble aussi maxi, ajustement, historique borné (5 dernières séries/exercice) |
| `demarrer` | `demarrerSeance` | invariant global (§ voir plus bas), pas par jour |
| `serie` | `enregistrerSerie` | écrit `exercice_id` **et** `ligne_id` (voir « Une ligne, un compteur ») |
| `terminer` | `terminerSeance` | met aussi à jour `resume.nbSeances` du profil, même lot |
| `finirExercice` / `reprendreExercice` | `finirExercice` / `reprendreExercice` | `arrayUnion`/`arrayRemove` sur `exercices_finis`, par `ligne_id` |
| `annuler` | `supprimerSeance` | |
| `historique` | `dataHistorique` | |
| `calendrier` | `dataCalendrier` | |
| `catalogue` | `dataCatalogue` | |
| `coachAthletes` | `dataCoachAthletes` | assiduité approximée depuis `resume.nbSeances`, pas un vrai recalcul — évite de lire l'historique de tous les athlètes à chaque ouverture |
| `coachDetail` | `dataCoachDetail` | |
| `exerciceSave` / `exerciceSuppr` | `sauverExercice` / `supprimerExercice` | l'id `EXnnn` vient d'une transaction sur `compteurs/exercices`, plus un scan du plus grand id |
| `programme` | `dataProgramme` | |
| `programmeSave` / `programmeJour` | `sauverLignesJour` / `supprimerLignesJour` | partagées avec les modèles, même structure |
| `modeles` / `modele` | `dataModeles` / `dataModele` | |
| `modeleSave` / `modeleSuppr` | `sauverModele` / `supprimerModele` | |
| `modeleJourSave` / `modeleJour` | `sauverLignesJour` / `supprimerLignesJour` | |
| `attributions` | `dataAttributions` | |
| `attribuer` | `creerAttribution` | pas de vraie transaction, voir § 8 |
| `attributionMaj` / `attributionSuppr` | `majAttribution` / `supprimerAttribution` | |
| `ajuster` | `ajusterCharge` | écrit par le pratiquant sur sa propre attribution |
| `pratiquantCreer` / `pratiquantSave` | `creerPratiquant` / `sauverPratiquant` | |
| `photoSave` / `photoSuppr` | `sauverPhoto` / `supprimerPhoto` | coach uniquement, règle |
| `maxis` / `maxiSave` / `maxiSuppr` | `dataMaxis` / `sauverMaxi` / `supprimerMaxi` | l'estimation Epley n'est plus persistée, voir § 8 |
| `commenter` / `commentairesLus` | `commenter` / `marquerCommentairesLus` | |
| `activiteSave` / `activiteSuppr` | `sauverActivite` / `supprimerActivite` | |
| `messageType` | `dataMessageType` | composé côté client, plus de serveur à appeler |
| `notifierMail` | *(pas d'équivalent)* | nécessite le second projet Apps Script du § 7 de PRODUCTION.md, pas construit ; `mailto:` en attendant |
| `lot`, `maintenance.*` | *(retirés)* | `lot` n'amortissait qu'une latence Apps Script disparue ; `maintenance.*` est le travail de `scripts/seed.mjs` |

## 7. Sécurité en place

Portée entièrement par `firestore.rules`, plus aucun routeur serveur derrière le
SDK — une règle mal écrite est une faille immédiate, pas un bug discret :

- `estMoi(email)` : le champ `email.lower()` du jeton Firebase Auth doit égaler la
  cible de la lecture/écriture — jamais un paramètre du client
- `estCoach()` / `estAdmin()` : lus par `get()` sur `pratiquants/{email}`, pas par
  un custom claim — évite toute Cloud Function, reste sur le plan Spark
- `statutOk()` : un pratiquant *Inactif*/*Archivé* ne peut plus écrire (mais lit
  toujours), même règle qu'avant sous Apps Script
- Modèles et catalogue d'exercices en écriture : coach uniquement ; le pratiquant ne
  voit jamais un modèle, seulement sa copie dans `attributions/{id}/programme`
- Photos, Maxis (écriture) : réservées au coach — un pratiquant ne gère ni ses
  photos de suivi ni son propre 1RM mesuré
- Activités libres, ajustements de charge, planning personnel : self-service,
  écrits par le pratiquant sur ses propres documents
- `admin:true` peut réécrire un historique déjà clos (séance, série) et attribuer
  les rôles ; le journal d'audit prévu au plan (`audit/`) n'est pas construit

### Attribution des rôles (Réglages ▸ Rôles)

Un écran réservé à l'admin — `S.moi.admin` décide de son affichage, mais c'est
`firestore.rules` qui refuse vraiment : la règle qui laisse un coach modifier
une fiche énumère ses champs et n'y met ni `role` ni `admin`, seule
`estAdmin()` ouvre le document en entier. Cacher un bouton n'a jamais protégé
une base.

`dataComptes()` liste **tout le monde**, coachs compris — contrairement à
`dataCoachAthletes()` qui les écarte, un coach ne se suivant pas lui-même. Ici
c'est le rôle qu'on regarde. Deux bascules par ligne : `role` bascule entre
`'coach'` et `'pratiquant'`, `admin` entre `true` et `false`.

**On ne touche pas à ses propres rôles**, les deux boutons de sa ligne sont
désactivés. Deux façons de se verrouiller dehors sinon : se retirer `admin`, et
plus personne ne peut le rendre sans passer par la console Firebase ; se retirer
`coach`, et l'écran Réglages — donc cette liste — disparaît. Une seule règle
ferme les deux.

Le rôle est lu au chargement du profil : il prend effet à la prochaine
connexion du compte concerné, ce que la modale annonce. Et le **premier** admin
ne vient pas d'ici mais de `scripts/seed.mjs` — il n'y a pas d'amorçage depuis
l'app, par construction.

## 8. Pièges rencontrés — à ne pas réapprendre

### Firestore (backend actuel)

**Un pratiquant qui lit `modeles/{id}` directement se fait refuser.** La règle est
coach-only : la durée d'un programme, par exemple, doit être copiée sur l'attribution
à sa création (`duree_semaines`) plutôt que relue depuis le modèle source — sinon
l'écran d'accueil du pratiquant plante en silence à « Missing or insufficient
permissions » dès qu'il a un programme actif.

**Une requête sur un champ à `null` est refusée, pas vide.** Les règles valident
la *requête*, pas son résultat : `where('email','==', null)` ne peut satisfaire
`estMoi(resource.data.email)` pour aucun document, donc Firestore refuse tout le
lot. Vu sur le fil de commentaires : `commenter` et `marquerCommentairesLus`
résolvaient « pas d'email visé » en « le mien », mais pas la lecture, qui prenait
son paramètre tel quel. Le pratiquant ouvrait le fil pendant sa séance et lisait
« Missing or insufficient permissions » — alors que son envoi, lui, passait.
`filDe()` porte cette résolution pour les trois, une fois pour toutes. La leçon
générale : là où une valeur peut manquer, la résoudre **avant** la requête, jamais
dans la requête.

**Les transactions du SDK client ne lisent pas de requête, seulement des documents
un par un.** L'invariant « pas deux séances ouvertes à la fois » ou « une seule
attribution En cours » ne peut donc pas être une vraie transaction côté navigateur :
c'est une lecture puis une écriture, avec le bouton désactivé pendant l'appel comme
seule garde contre un double-tap. Risque accepté, pas contourné.

**`serverTimestamps: 'estimate'` est nécessaire dès qu'on relit un document tout
juste écrit.** Sans cette option, un champ `serverTimestamp()` pas encore confirmé
par le serveur vaut `null` — une séance qu'on vient de créer semble alors ne pas
exister, et un contrôle d'invariant qui la cherche la rate.

**Composite index et `collectionGroup`** : une requête qui traverse plusieurs
parents (ex. l'historique d'un exercice, tous jours confondus, via
`collectionGroup('series')`) exige un index composite déclaré dans
`firestore.indexes.json` et déployé — sinon Firestore refuse la requête avec un
lien de création dans le message d'erreur, pas un résultat vide.

**Toute écriture qui n'a pas de filet (`try/catch`) autour de son chargement laisse
l'écran bloqué sur « Chargement… » pour toujours** si Firestore refuse pour une
raison quelconque, sans le moindre message — pas d'erreur réseau bruyante comme
avec un appel HTTP classique. Chaque écran (`vueX`) doit encadrer sa lecture
principale.

**L'estimation du 1RM par formule d'Epley n'est plus recalculée sur tout
l'historique.** Les règles réservent l'écriture de `maxis` au coach ; le client ne
peut donc plus persister une estimation. `dataSeance` l'approxime en mémoire depuis
les cinq dernières séries connues de l'exercice (déjà lues pour « dernier »/
« record »), pas depuis toute la carrière du pratiquant — une estimation moins
précise mais bornée.

### Dates et fuseau

**Une date seule n'est pas un instant.** Une activité, une récurrence ponctuelle
ou une `fin_prevue` portent `'AAAA-MM-JJ'` ; `new Date('2026-09-02')` en fait
minuit **UTC**, soit 2 h du matin à Paris. Deux conséquences vues en vrai le
2026-09-03 :

- un écart calculé en millisecondes (`Date.now() - date`) donnait « il y a
  0 jour » — donc « aujourd'hui » — pour l'activité de la veille consultée à
  00 h 28. Un écart de jours se compte entre deux **minuits locaux** :
  `dateDeCle(cleJour(a)) - dateDeCle(cleJour(b))`, le motif déjà employé par
  `semainesEntre` ;
- une fenêtre bornée à l'instant présent (`fin = new Date()`) faisait
  disparaître l'activité du jour entre minuit et 2 h. Les bornes de
  `dataActivites` couvrent maintenant des journées entières.

La règle : dès qu'on compare des dates seules, passer par `cleJour` /
`dateDeCle`, jamais par une soustraction d'instants.

### Apps Script (backend historique, `apps-script/`)

Conservé pour mémoire : rien de tout ça n'est plus appelé, mais utile si le second
projet autonome pour l'e-mail (PRODUCTION.md § 7) doit être construit.

**Apps Script ne peut pas héberger la PWA.** Ses pages sont servies dans une iframe
sandboxée : ni service worker, ni Google Sign-In fiable. D'où la séparation
GitHub Pages (front) / Apps Script (API).

**Le déploiement doit être en « Accès : tout le monde ».** Avec « toute personne
disposant d'un compte Google », les requêtes cross-origin du navigateur arrivent
sans cookie de session et reçoivent une page de connexion HTML au lieu du JSON.
L'accès public est sans risque ici puisque l'auth est faite par le code.

**POST en `text/plain`, pas en `application/json`.** Apps Script ne répond pas aux
requêtes préflight OPTIONS ; le type `text/plain` en fait une requête simple.

**`SpreadsheetApp.getUi()` échoue** si l'éditeur a été ouvert depuis script.google.com
plutôt que depuis le Sheet. Encapsulé dans un `try/catch` dans `setup()`.

**Modifier un déploiement, ne pas en créer un nouveau**, sinon l'URL change et il
faut la reporter dans `index.html`.

**Une 404 sur l'URL `/exec` testée depuis un outil externe n'est pas fiable :**
la redirection vers `script.googleusercontent.com` n'est pas toujours suivie.
Tester dans un navigateur.

**En mode Test, la liste des utilisateurs tests ne doit pas être vide**, sinon
personne ne peut se connecter, pas même le propriétaire du projet.

## 8 bis. Le poste de travail du coach

Trois écrans, sous l'onglet **Coach**.

**Bibliothèque.** Le catalogue d'exercices, groupé par groupe musculaire, avec
recherche. Chaque fiche porte nom, groupe, équipement, consigne d'exécution et lien
vidéo. Création et modification depuis l'app ; les identifiants `EXnnn` sont attribués
automatiquement à la suite du plus grand existant. **La suppression est refusée si
l'exercice figure encore dans un programme** — le message dit combien de lignes
l'emploient, plutôt que de casser un programme en silence.

Le bouton ▶ de chaque ligne ouvre la vidéo en **modale**, dans le même lecteur
YouTube/Vimeo que celui des modèles (`lecteur()`, § 8 terdecies) — pas de nouvel
onglet, le coach garde sa place dans la liste en la refermant. Sans vidéo mais avec
une photo, le bouton ↗ ouvre l'image dans un nouvel onglet comme avant : une image
statique n'a rien à gagner à un lecteur.

Côté pratiquant, le panneau de saisie d'un exercice (`ouvrirLogger`) affiche ce
même lecteur intégré à la place de la photo dès qu'une vidéo est renseignée — la
photo reste le repli sans vidéo. Voir le geste pendant l'exécution sans quitter la
séance en cours était le point : ouvrir un nouvel onglet en salle, réseau
capricieux, aurait pu faire perdre la page.

**Modèles.** Un seul écran, la même barre que les deux autres listes (§ 8 undecies) :
création, recherche, filtres, regroupement. Les catégories étaient un premier niveau
à part — un écran de gros boutons, puis la page d'une catégorie ; elles sont devenues
un **regroupement parmi deux** (Type, Difficulté), pour que le tri de la liste se
change d'un tap au lieu d'un aller-retour de navigation.

Catégorie et difficulté restent des **listes ouvertes** : le coach tape ce qu'il veut,
les valeurs déjà utilisées lui sont proposées. Rien n'est figé dans le code, sinon
l'ordre d'affichage des quatre difficultés usuelles — les autres viennent ensuite,
« Sans difficulté » en dernier.

Sur une carte de la liste : appui court pour ouvrir le modèle, **appui long pour sa
fiche** — nom compris. La fiche était déjà là (bouton « Modifier la fiche » dans le
modèle ouvert), mais corriger un mot demandait d'ouvrir le modèle d'abord. Même
geste que le renommage d'un jour, un cran plus haut dans la hiérarchie.

**Programme.** Un pratiquant, un jour, des blocs. Le nombre de tours et le repos se
saisissent sur l'en-tête du bloc ; chaque exercice ouvre une fiche où l'on règle
répétitions *ou* durée, charge, cadence et pause. La cadence s'y prévisualise en
courbe, en direct. L'ordre des exercices se change avec la flèche.

L'enregistrement **réécrit un jour entier** : les lignes existantes de ce couple
(email, jour) sont supprimées puis remplacées, les autres jours et les autres
pratiquants ne bougent pas. Les numéros de bloc et d'ordre sont renumérotés à
l'écriture — l'éditeur n'a pas à les tenir à jour.

**Déplacer ou renommer une séance** — modèle ou programme attribué — se fait par
un **appui long sur son onglet** (550 ms, le même geste que la pastille de
séries ; le `title` de l'onglet le dit). C'est le même geste pour les deux,
puisque le jour vit dans l'intitulé : changer la pastille de jour déplace la
séance dans la semaine, le toast le dit (« Séance déplacée au vendredi »). C'est la seule écriture de l'éditeur qui ne passe *pas* par la
réécriture ci-dessus : elle met à jour le champ `jour` des lignes **en place**,
document par document. `ligne_id` est l'identifiant de ces documents et chaque
série enregistrée le porte (§ « Une ligne, un compteur ») : les recréer sous un
autre nom couperait l'historique de tout ce qui a été fait ce jour-là. Les
compteurs du parent ne bougent pas non plus — mêmes lignes, même durée.

Deux garde-fous : un intitulé déjà porté par un autre jour est refusé, sinon les
deux fusionneraient en silence ; et **les séances déjà faites gardent l'ancien
intitulé**, elles racontent ce qui s'est passé. Renommer pendant qu'un pratiquant
a la séance ouverte lui viderait l'écran jusqu'à ce qu'il la reprenne : risque
accepté, le coach retouche entre les séances.

**Calendrier.** Le même composant sert au pratiquant pour lui-même et au coach par
pratiquant : grille mensuelle, bilan du mois, détail au clic sur un jour. Chargé une
fois sur douze mois, la navigation entre mois ne recharge rien.

Deux natures d'événement s'y côtoient, et se distinguent d'un regard :

| | Dans la grille | Au clic |
|---|---|---|
| Séance du programme | case en **aplat rouge**, point plein | séries, volume, durée, ressenti |
| Activité libre | case **en contour**, point clair | sport, durée, distance, effort |

Un jour qui porte les deux montre les deux points. Le bilan du mois compte les
séances et les activités **séparément** : mélanger ce que le coach a prescrit et ce
que le pratiquant a ajouté de lui-même fausserait la lecture de l'assiduité.

**Une séance passée s'ouvre en lecture seule** : « Voir le détail » sur sa carte
liste ses exercices et leurs séries — « 12 × 65 kg · 10 × 65 kg », « 45 s · 40 s ».
Le calendrier n'en montrait que les totaux, sans jamais dire lesquelles. Les noms
viennent du **catalogue**, pas du programme : une séance de l'an dernier peut
appartenir à une attribution supprimée depuis, l'exercice, lui, existe toujours.
Rien ne s'y modifie — corriger une série se fait pendant que la séance est
ouverte, pas six mois plus tard.

**Une routine cochée bascule de « prévu » à « eu lieu ».** L'aplat et le contour
valent aussi pour elle : tant qu'elle est seulement au planning, son étiquette est
en contour et sa carte dit *Au planning* ; cochée, elle passe en aplat et dit
*Faite*. Sans ça, une routine faite le matin s'affichait encore comme à faire le
soir. Le calendrier lit les exécutions (`dataFaitsRoutines`, une lecture par
routine conseillée) en même temps que le reste, et **cocher vide son cache**
(`S.cal = null`) — sinon l'écran serait resté sur l'état d'avant. Une routine
faite un jour où elle n'était pas prévue apparaît quand même : on la fait quand
on peut, elle a eu lieu.

### Ce qui n'est pas fait

Le programme reste attaché à un email. Composer le même programme pour douze
personnes, c'est encore douze saisies. Le modèle `Programme` réutilisable et affecté
du § 13 reste le prochain chantier — c'est lui qui ferait passer l'outil à l'échelle
des 40 pratiquants.

## 8 ter. Modèles génériques et attributions

Le programme d'un pratiquant naît en deux temps, et cette séparation est le cœur
du modèle de données.

```
Modele  « Force 5×5 » · Force · Intermédiaire · 8 semaines · Actif
  └─ ModeleLignes            générique, aucun pratiquant
        │
        │  attribuer_() COPIE les lignes
        ▼
Attribution  Guillaume · « Force 5×5 » · depuis le 21/07 · En cours
  └─ Programmes              personnalisable sans toucher au modèle
```

**La copie est délibérée.** Personnaliser le programme d'un pratiquant — alléger une
charge, retirer un exercice qui réveille une épaule — ne doit pas modifier le modèle
ni les programmes des autres. Et le même modèle peut être redonné au même pratiquant
des mois plus tard, sur des bases différentes, sans conflit.

**Une seule attribution « En cours » par pratiquant.** `attribuer_()` clôt
automatiquement la précédente en la passant à « Terminé » avec sa date de fin.
L'historique reste : la liste des attributions est la chronologie des programmes
suivis, et le coach peut rouvrir n'importe lequel pour le consulter ou le corriger.

Une attribution peut naître **sans modèle** : page blanche, pour du sur-mesure.
`modele_id` reste alors vide.

`dataSeance` et `chargerProfil` lisent les lignes de l'attribution en cours via
`attributionActive` (`attributions/{id}/programme`). Sans attribution active, le
pratiquant voit l'écran « Aucun programme pour l'instant » — plus de repli sur des
lignes non rattachées, chaque ligne de programme appartient désormais à une
attribution précise.

### L'éditeur est le même des deux côtés

`peindreEditeur()` sert aux modèles comme aux programmes attribués : la structure
jour → bloc → exercice est identique, seule la clé de rattachement change.
`S.ed.cible` vaut `'modele'` ou `'programme'` et aiguille l'enregistrement.

## 8 quater. Session et reprise

**La session survit au rechargement.** Le jeton Google et le profil sont conservés
dans `localStorage`, et restaurés au chargement si le jeton n'est pas expiré — il
vaut environ une heure. Le profil est rafraîchi en arrière-plan.

Un échec de ce rafraîchissement ne déconnecte pas : en salle, le réseau saute, et
perdre sa séance parce qu'un mur est en béton serait absurde. Seul un compte devenu
inconnu, ou un jeton refusé par le serveur, ramène à l'écran de connexion.

Le jeton en `localStorage` est une clé de session au porteur. Il expire seul en une
heure et le bouton **Quitter** l'efface, en coupant aussi la reconnexion
automatique de Google.

### Rien n'oblige à aller au bout

Une séance réelle s'interrompt : matériel occupé, douleur, temps qui manque. Trois
sorties sont prévues, à tous les niveaux.

**Terminer un exercice** sans faire toutes ses séries — bouton dans l'écran de
saisie. Les séries déjà enregistrées sont conservées, l'exercice passe en « clos » et
la carte affiche « arrêté à 2 ». Dans un superset, l'enchaînement saute les exercices
clos et continue avec les autres.

**Terminer la séance** à tout moment — bouton en bas de la liste, actif dès qu'une
séance est ouverte. La durée est pré-remplie depuis l'heure de début ; ressenti et
notes sont libres. Les exercices jamais commencés restent simplement non commencés :
aucune notion d'échec.

**Une séance ouverte prime sur la prochaine à faire.** L'accueil montrait
toujours la séance *programmée* : celui qui avait démarré un autre jour — matériel
occupé, envie d'autre chose — voyait son accueil pointer ailleurs et devait
passer par le calendrier pour retrouver la sienne. `dataAccueil` lit désormais la
séance ouverte (`seanceOuverteQuelconque`, tous jours confondus) et, s'il y en a
une, la carte du haut devient **Séance en cours** — depuis quand, et l'intitulé
prévu en second rang quand ce n'est pas le même jour. « Voir le détail » du
programme y mène aussi. Cohérent avec la règle qui existait déjà : tant qu'une
séance est ouverte, aucune autre ne peut démarrer.

**Corriger une série déjà validée.** Les pastilles de séries de l'écran de saisie
(« 2 · 10 × 65 kg ») sont cliquables tant que la séance est ouverte, et bordées de
pointillés pour le dire ; la modale corrige les répétitions ou la durée et la
charge, ou supprime la série — un double appui en avait enregistré deux. Sans ça,
13 répétitions tapées pour 3 restaient dans l'historique, et faussaient au passage
le 1RM estimé qui s'en nourrit.

Les règles ouvrent l'`update` d'une série dans la **même fenêtre que sa
suppression** — la séance encore ouverte — et sur **les trois seuls champs de
performance** (`reps`, `duree_s`, `charge`) : ni l'exercice visé, ni la ligne de
programme, ni l'horodatage ne se réécrivent. Une séance close reste un historique
que seul un admin retouche. `serie_num` n'est pas renuméroté après une
suppression : il ordonne, il ne compte pas — c'est l'écran qui numérote ce qu'il
affiche.

**Ne rien terminer du tout.** La séance reste ouverte et se reprend le jour même.
Le lendemain, `seanceOuverte_` ne la voit plus — elle filtre sur la date — et une
nouvelle séance démarre. L'ancienne garde sa `duree_min` vide, ce qui la distingue
des séances closes.

La colonne `exercices_finis` de `Seances` porte la liste des exercices clos, séparés
par des virgules. C'est ce qui permet de retrouver l'état exact après un rechargement.

**La séance en cours se reprend.** `getSeance_` renvoie la séance du jour si elle est
ouverte, avec les séries déjà saisies ; `demarrerSeance_` la réutilise au lieu d'en
créer une seconde. Auparavant les données étaient bien écrites dans le Sheet, mais
les compteurs de l'écran repartaient de zéro après un rechargement.

## 8 quinquies. Aucune migration obligatoire (historique, Apps Script)

Cette section décrivait l'auto-création des onglets/colonnes manquants sous
Sheets — sans objet avec Firestore, qui n'a pas de schéma à faire évoluer : un champ
absent sur un document se lit simplement comme absent, sans étape préalable. Conservé
pour mémoire, comme le reste des sections marquées « historique » de ce chapitre.

## 8 sexies. Charges en pourcentage du max

`pct_rm` sur une ligne de programme remplace la charge fixe : la charge est
recalculée à chaque lecture depuis le 1RM du pratiquant, et suit donc sa
progression sans que le coach ait à retoucher le programme.

```
Squat · 5 tours
  ├─ 3 reps à 90 %   ─┐ même exercice, même bloc
  └─ 12 reps à 60 %  ─┘ top set puis back-off
```

**D'où vient le 1RM.** Une valeur saisie par le coach dans `pratiquants/{email}/maxis`
fait foi — écriture réservée au coach par les règles, un pratiquant ne peut pas la
poser lui-même. À défaut, `dataSeance` l'estime depuis les **cinq dernières** séries
connues de l'exercice (déjà lues pour « dernier »/« record », pas de lecture
supplémentaire) par la formule d'Epley, `1RM ≈ charge × (1 + reps / 30)`, en retenant
la meilleure des cinq. Avant la migration Firestore, le serveur retenait la meilleure
de **toute la carrière** du pratiquant — un calcul qu'un navigateur ne peut plus se
permettre en lecture à chaque ouverture de séance ; l'estimation est donc un peu
moins précise qu'avant, mais bornée. Les séries de plus de 15 répétitions sont
ignorées, Epley y devient trop optimiste.

La charge obtenue est arrondie au multiple de 2,5 kg, le plus petit saut réel sur une
barre. L'app affiche la charge **et** son origine — « 107,5 kg · 90 % de 120 kg » —
et précise « estimés » quand le max n'a pas été mesuré : le pratiquant doit savoir
si le chiffre repose sur une mesure ou sur un calcul.

Sans 1RM connu, la ligne affiche « % — max inconnu » plutôt qu'une charge fausse.

L'écran **Coach ▸ un athlète ▸ Maxis** liste les exercices, ceux du programme
d'abord, avec leur 1RM et sa source. Une valeur saisie peut être effacée pour
revenir à l'estimation.

## 8 sexies. Hors ligne

Une salle en sous-sol coupe le réseau, et c'est précisément là que la saisie a lieu.

**Avant la migration Firestore**, deux mécanismes maison géraient ça : un cache de
lecture dans `localStorage` (`lire()`), et une file d'écriture rejouée au retour du
réseau (`ecrire()`), limitée à cinq actions qui décrivent un fait daté plutôt qu'un
état global. Une séance démarrée hors ligne recevait un identifiant provisoire
(`LOC-…`), substitué partout une fois la séance vraiment créée au rejeu.

**Depuis la migration**, tout ce mécanisme a disparu — `persistentLocalCache` du SDK
Firestore fait ce travail nativement : les lectures sont servies depuis le cache
local, les écritures sont appliquées optimistiquement (l'ID du document est généré
côté client dès l'appel, avant même la confirmation réseau) et rejouées dans l'ordre
au retour du réseau. Plus de file à gérer à la main, plus d'identifiant provisoire :
chaque écriture a son ID définitif dès le départ. Le bandeau « Hors ligne » restant
dans `index.html` est un indicateur générique lié à `navigator.onLine`, plus lié à
un mécanisme de file.

## 8 septies. Courbes de progression

L'écran Progrès trace, par exercice, la charge la plus lourde de chaque séance, du
plus ancien au plus récent. `courbeProgression()` dans `index.html`, SVG inline.

L'échelle part de **90 % du minimum**, pas de zéro : sur des charges qui passent de
50 à 60 kg, une échelle absolue écraserait la pente et ne dirait rien. L'écart depuis
la première séance est affiché à côté du record.

## 8 octies. La charge appartient au pratiquant

Le coach fixe une charge, ou un pourcentage du max. Mais c'est le pratiquant qui est
sous la barre : il peut décider autrement, et son choix tient d'une séance à l'autre.

Trois sources, dans cet ordre de priorité :

| Source | Quand | Affiché |
|---|---|---|
| `charge_cible` | le coach a fixé un poids | « Charge prévue par le coach » |
| `pct_rm` × 1RM | le coach a fixé un pourcentage et le max est connu | « 90 % de votre max (100 kg) » |
| `Ajustements` | le pratiquant a enregistré sa propre charge | « Votre charge · le programme dit 60 kg » |

**Un pourcentage sans max connu ne donne aucune charge.** L'app le dit —
« votre max n'est pas connu, à vous de juger » — plutôt que d'inventer un chiffre.

L'ajustement se pose depuis l'écran de saisie : le pratiquant change la charge, un
bouton propose de la garder. Un second appui revient à la charge du programme.
L'ajustement est rattaché à l'attribution en cours : un nouveau programme repart
des valeurs du coach.

**Zéro est une charge, pas une absence de charge.** L'effacement se signalait par
un `0`, ce qui rendait impossible de se fixer **le poids du corps** sur un
mouvement que le coach a lesté : « Garder 0 kg » rendait la main au programme au
lieu d'enregistrer le choix. C'est maintenant `null` qui efface, et la
**présence du document** qui fait foi à la lecture (`perso !== undefined`, non
`perso > 0`). Le bouton dit « Garder le poids du corps comme ma charge », et la
carte affiche « poids du corps · votre charge » plutôt que de se taire.

## 8 nonies. Bibliothèque de départ

`apps-script/Catalogue.js` contient **167 exercices en français**, versés
dans l'onglet `Exercices` par `Coach ▸ Réglages ▸ Importer le catalogue de départ`.

Répartition : Jambes 16, Dos 15, Pectoraux 12, Abdominaux 10, Épaules 9, Triceps 9,
Biceps 8, Fessiers 7, Mollets 3, Trapèzes 3, Avant-bras 3, Lombaires 2.
Par matériel : barre 29, haltère 24, poids de corps 18, poulie 13, machine 9,
barre EZ 3, kettlebell 1.

**Provenance et droits.** Données et images viennent de
[free-exercise-db](https://github.com/yuhonas/free-exercise-db), publié sous
*Unlicense* — versé au domaine public, réutilisation libre y compris commerciale,
sans attribution obligatoire. Les noms, groupes, équipements et consignes ont été
rédigés en français pour ce projet ; seules les illustrations sont reprises telles
quelles, servies depuis leur dépôt.

**Ce qui a été écarté.** Les fiches de docteur-fitness.com ont servi de référence
de *structure* — leur découpage groupe / matériel / consigne est propre. Leurs
illustrations, en revanche, portent un crédit d'illustrateur tiers
(`© Aliaksandr Makatserchyk`) : les reprendre dans une app distribuée à
40 pratiquants serait une contrefaçon. Si le coach y tient, la voie est de leur
demander une licence, ou de photographier ses propres mouvements en salle.

L'import est **relançable** : un exercice dont le nom existe déjà est ignoré, les
fiches saisies par le coach ne sont jamais touchées, et les identifiants continuent
la numérotation existante.

### Difficulté d'exécution

Chaque exercice porte une **difficulté** — Débutant, Intermédiaire, Expert — que la
bibliothèque filtre et regroupe. Trois niveaux, pas les quatre d'un modèle : la
difficulté d'un modèle est un ressenti de coach, celle d'un exercice dit ce qu'il
faut savoir faire pour l'exécuter proprement.

Elle n'existait pas au départ : `Catalogue.js` n'avait pas repris le champ `level`
de free-exercise-db. `scripts/generer-difficultes.mjs` la reconstitue dans
`scripts/difficultes-exercices.json`, et **le fichier dit d'où vient chaque valeur** :

- `free-exercise-db` (**109 exercices**) — le `level` de la base d'origine. La
  correspondance est exacte et non approximative : l'URL de photo déjà stockée
  contient l'identifiant source, on lit le niveau dessus. Aucun rapprochement de noms.
- `projet` (**62 exercices**) — les mouvements au poids du corps rédigés ici, absents
  de la base d'origine (ni photo ni nom anglais). Classés à la main, selon une règle
  simple : une variante vaut un cran de plus que le mouvement de base — négatives et
  élastiques en dessous du mouvement complet, lesté et explosif au-dessus. C'est un
  jugement, pas une donnée sourcée ; le `source: 'projet'` sert précisément à savoir
  lesquels relire.

Sur une base déjà peuplée, c'est `scripts/appliquer-difficultes.mjs` qui la pose —
un `update` d'un seul champ, et seulement là où rien n'est renseigné. Surtout pas le
seed, qui écrit les exercices avec `set()` sans merge et écraserait les vidéos et
les retouches faites depuis l'app.

### Vidéos de démonstration

34 exercices portent une vidéo Vimeo, posée par `scripts/appliquer-videos.mjs`
depuis `scripts/videos-exercices.json` — même prudence que la difficulté : un
`update` du seul champ `video`, seulement là où il est vide.

**Provenance différente du reste du catalogue.** Ce ne sont pas des ressources
sous licence libre comme free-exercise-db : ce sont des vidéos de la chaîne Vimeo
de Rehab-U (plateforme de formation pour thérapeutes/coachs), que le coach
partage déjà à ses pratiquants en tant que client de leurs formations. D'où un
fichier à part plutôt qu'un ajout dans `Catalogue.js`, qui lui documente une
provenance publiquement réutilisable.

**Comment elles ont été choisies.** Recherche par mot-clé sur les 771 vidéos de
la chaîne (`vimeo.com/user90609755/videos/search:<terme>/sort:date`, cherchable
sans compte), en confrontant mouvement *et* équipement — Rehab-U distingue les
variantes haltère/barre/poulie par des titres comme `DB Bench Press` — pour
écarter les faux amis. La chaîne est à 80 % de la rééducation/prévention
(protocoles post-blessure, tests cliniques), pas des démonstrations de
musculation classique : sur 171 exercices cherchés, 130 n'ont rien donné de
pertinent, 24 étaient une correspondance sûre (mouvement et équipement
cohérents), et 17 avaient un candidat ambigu — Guillaume a tranché à l'écoute :
10 retenus (dont « Soulevé de terre », posé sur la variante « Deadlift 1 »
plutôt que l'autre candidat trouvé), 7 écartés (variante ou équipement qui ne
correspondait pas).

## 8 decies. Statuts des pratiquants

| Statut | Ce que ça veut dire | Accès à l'app |
|---|---|---|
| **Nouveau** | inscrit, aucun programme démarré | complet |
| **Actif** | en cours de suivi | complet |
| **Inactif** | pause, arrêt temporaire | **lecture seule** — il consulte, il ne saisit plus |
| **Archivé** | terminé | **aucun** — les données restent conservées |

Le contrôle est fait dans `doPost`, avant tout routage : un compte archivé reçoit
`COMPTE_ARCHIVE`, un compte inactif reçoit `COMPTE_INACTIF` sur les six actions qui
écrivent (`ECRITURES_PRATIQUANT`). La lecture reste ouverte à un inactif — couper
l'accès à son propre historique n'aurait servi personne.

Rien n'est jamais supprimé : archiver, c'est fermer la porte, pas effacer.

## 8 undecies. Le poste de travail du coach

Le coach ne suit pas de programme dans l'app. Sa barre de navigation est donc
différente de celle d'un pratiquant : **Athlètes · Modèles · Bibliothèque ·
Réglages**, construite selon le rôle par `construireNav()`. Il n'a plus d'écran
Séance ni Progrès pour lui-même.

**L'accueil liste ses athlètes**, triés par statut puis par ancienneté de la dernière
séance — les nouveaux d'abord, les silencieux ensuite. Chaque carte porte le statut,
le programme en cours, une barre d'avancement et un rappel « à encaisser » si le
programme n'est pas payé.

**Filtrer et Regrouper : deux gestes, deux contrôles qui ne se ressemblent
jamais.** Pensés pour la liste une fois passée la quarantaine de pratiquants
annoncée, où faire défiler ne suffit plus — mais la première version mêlait
tri et filtres dans la même rangée de pastilles, confusion signalée à l'usage.
**Filtrer** réduit la liste : un bouton à côté de la recherche ouvre la modale,
badge rouge au nombre de filtres actifs ; une fois la modale fermée, chaque
filtre posé reste visible sous forme de puce retirable d'un tap, sans rouvrir
la modale. **Regrouper** réorganise l'affichage sans rien exclure : une ligne à
part, toujours visible, en onglets soulignés plutôt qu'en pastilles pleines —
pour qu'on ne la confonde jamais avec un filtre. Un regroupement autre que
« Aucun » ouvre des **sections repliables** (même disclosure `.pli` que « Mes
programmes »), dépliées par défaut ; « Aucun » garde la liste plate d'origine.

**Les trois listes du coach partagent cette barre** — athlètes, modèles,
bibliothèque — dans cet ordre : bouton de création, recherche, bouton Filtrer,
puces, regroupement, contenu. `monterListe(vue)` la monte ; ce qui change d'une
liste à l'autre tient dans trois déclarations que chaque écran fournit : ses
**filtres** (`{champ, label, options, test}` — la valeur vide vaut toujours
« tous »), ses **regroupements** (`{cle, libelle, cle_de, ordre}`) et sa
**carte**. Ajouter un filtre, c'est ajouter une ligne à un tableau, pas écrire
un écran ; et les trois listes ne peuvent pas diverger d'aspect puisqu'elles ne
partagent pas seulement le CSS mais le code qui les monte.

| Liste | Filtres | Regroupements |
|---|---|---|
| Athlètes | statut, programme, paiement | ville, ancienneté |
| Modèles | type, difficulté, séances/semaine, temps max d'une séance, page source | type, difficulté |
| Bibliothèque | groupe musculaire, équipement, illustration, vidéo | groupe, équipement, difficulté |

`dataCoachAthletes()` charge tout en un appel (comme avant) ; `S.athletes`
reste en mémoire et `peindreListe()` refiltre/regroupe côté client à
chaque frappe ou pastille — jamais de retour réseau, jamais de re-rendu de la
barre de recherche elle-même (elle perdrait le focus en pleine frappe, même
piège que `choisirExercice()` § 8 vicies). Le regroupement par ville lit
`profil.ville`, renseigné en entretien (§ 8 unvicies) : un pratiquant sans
profil rempli tombe dans une section « Sans ville », toujours en dernier.
Celui par ancienneté lit `ancienneteJours`, calculé à la volée depuis
`date_inscription` (quatre tranches : moins d'un an, 1 à 2 ans, 2 à 5 ans,
5 ans et plus) — la même donnée alimente le « inscrit depuis X » désormais
affiché sur chaque carte.

**« Avec/sans programme » ne regarde pas `statut === 'En cours'`, mais
`a.planifie`.** Une attribution reste `'En cours'` côté Firestore tant que le
coach n'a pas cliqué Clore, même des semaines après sa fin réelle (§ 8 ter) —
la première version du filtre comptait donc comme « avec programme » un
pratiquant dont le plan est terminé depuis longtemps, juste pas formellement
clos. `dataCoachAthletes()` calcule `planifie` en comparant `fin_prevue`
(chaîne `AAAA-MM-JJ`, jamais une soustraction d'instants) à la clé du jour :
planifié si `fin_prevue` est encore à venir, ou absente (programme sans durée
fixe, toujours considéré planifié). La carte, elle, continue d'afficher
l'attribution `'En cours'` telle quelle même dépassée — c'est justement
l'information qui pousse le coach à la clore.

**Deux mesures d'avancement**, qui ne disent pas la même chose. Le temps écoulé donne
« semaine 4 sur 8 ». L'assiduité donne « 6 séances sur 16 attendues », et c'est elle
qui alimente la barre : un programme peut être à sa moitié dans le calendrier sans
que personne ne soit venu. Sans durée déclarée au modèle, la référence devient ce qui
aurait dû être fait depuis le début.

**La photo du pratiquant** s'affiche en pastille dès la liste des athlètes, et en
grand sur sa fiche. À défaut, ses initiales.

Le fichier est **réduit dans le navigateur** avant l'envoi : carré de 256 px recadré
au centre, en JPEG, la qualité baissant par paliers jusqu'à tenir sous 44 000
caractères. Une cellule de Sheet en accepte 50 000, et une liste de 40 athlètes ne
doit pas peser des mégaoctets.

Les images vivent dans un onglet `Photos` séparé, joint à la demande : sans ça,
chaque lecture d'une fiche traînerait quelques kilo-octets d'image pour rien.
Aucun service externe, aucune portée Drive supplémentaire.

**La fiche du pratiquant** ouvre sur l'identité et trois boutons de
**coordonnées** — WhatsApp, appel, e-mail — construits depuis le téléphone
normalisé au format international. L'ancien champ « Objectif » à texte libre a
disparu (retiré aussi de l'inscription, de `sauverPratiquant` et des règles) :
depuis que le profil d'accueil (§ 8 unvicies) existe, il faisait doublon en
moins précis. À sa place, un paragraphe **Profil** — `resumeProfil()` —
condense objectif(s) principal(aux), âge, rythme de séances souhaité, résumé
des disponibilités et niveau de motivation en une ou deux phrases de français
courant ; absent tant que le profil n'a rien de rempli. Puis un encadré
**Message du coach**, le statut modifiable d'un appui, et l'historique des
programmes donnés avec pour chacun une case **payé / non payé**.

**Le message du coach** est un mot libre, affiché en haut de l'accueil du
pratiquant tant qu'il n'est pas changé — pas une consigne d'exercice (§ 8
septendecies), pas une note de suivi (`notes`), juste ce qu'il a besoin de lire
en ouvrant l'app : un rappel de motivation, une félicitation, une consigne du
moment. Touchez l'encadré pour l'écrire ou le modifier ; un message vide
n'affiche rien côté pratiquant. Écriture réservée au coach par les règles
(`message_coach` dans la liste des champs qu'il peut modifier) — le pratiquant
le lit, il ne l'écrit jamais.

C'est le début du volet administratif : le suivi de paiement est volontairement
minimal — une case, pas une facturation.

## 8 duodecies. Prévenir un pratiquant

Un programme attribué doit être annoncé. Le bouton **Prévenir** — sur la fiche à
côté de chaque programme, dans l'onglet Programme, et proposé automatiquement juste
après une attribution — ouvre un message pré-écrit, modifiable, et laisse le coach
choisir son canal.

| Canal | Comment | Coût |
|---|---|---|
| WhatsApp | `https://wa.me/<numéro>?text=…` | aucun |
| SMS | `sms:<numéro>?&body=…` | le forfait du coach |
| Client mail | `mailto:?subject=&body=` | aucun |
| E-mail direct | `MailApp` depuis le compte du coach | aucun, quota Google |

Les trois premiers ouvrent l'application du téléphone avec le texte pré-rempli :
rien ne transite par un service tiers, le coach relit et envoie lui-même. La forme
`sms:numéro?&body=` est celle qui convient à la fois à Android, qui attend `?body=`,
et à iOS, qui attend `&body=`.

Le quatrième part directement du compte Google du coach, avec son nom en expéditeur
et son adresse en réponse. Utile depuis un PC, où les liens `sms:` ne mènent nulle
part. Le quota Google restant est rappelé après l'envoi.

Le texte est composé **côté serveur** (`messageType_`) : il reste identique quel que
soit le canal, et se modifie en un seul endroit. Il reprend le nom du programme, le
nombre de séances par semaine, la durée et la date de début.

### Pas d'envoi automatique — décision tranchée

Deux raisons, la seconde suffisant à elle seule.

Techniquement, Apps Script ne sait pas envoyer de SMS : il faudrait une passerelle
payante, ce qui contredirait le « pas de coût par utilisateur » du § 1.

Mais surtout, **le coach veut garder la main.** Il relit et envoie lui-même, y
compris par e-mail. Le bouton « Envoyer depuis mon compte » n'est pas une
automatisation : c'est un raccourci qui lui évite de recopier le texte, et il ne
part que sur son clic.

Deux envois existent dans tout le projet, et deux seulement :

| Fonction | Destinataire | Déclencheur |
|---|---|---|
| `notifierMail_` | le pratiquant | le clic du coach, après relecture |
| `rapportHebdo` | **le coach lui-même** | manuel, ou déclencheur hebdomadaire |

`rapportHebdo` peut donc être automatisé sans réserve : il ne s'adresse qu'au coach.
Aucune fonction n'écrit à un pratiquant sans action humaine.

## 8 terdecies. Programmes types

`Coaching Fitness ▸ Réglages ▸ Importer dix programmes types` verse dix méthodes
largement documentées comme modèles réutilisables : 5×5 débutant, Force 3 jours,
Push Pull Legs, Haut/Bas 4 jours, Full body débutant, Cycle 5/3/1, Texas Method,
Madcow 5×5, Split 5 jours, Sans matériel. **135 lignes d'exercices au total**,
toutes rattachées au catalogue de départ.

**Sur les droits.** Un schéma séries × répétitions est une méthode, pas une œuvre :
il se reprend librement. Les descriptions sont rédigées pour ce projet, aucune n'est
recopiée, et l'origine est citée quand la méthode porte le nom de son auteur —
Rippetoe pour Starting Strength, Wendler pour 5/3/1. C'est de l'honnêteté autant que
du service : le coach voudra remonter à la source.

Ce sont des **points de départ à adapter**. Les pourcentages supposent un max connu ;
les charges fixes sont laissées à zéro quand elles dépendent trop de la personne.

L'import est relançable : un modèle portant déjà le même nom est laissé intact, le
coach ayant pu l'adapter.

### Source et vidéo

Un modèle porte deux liens facultatifs : `source`, la page qui documente la méthode,
et `video`. La fiche affiche un bouton **Source ↗** et, si une vidéo est renseignée,
un **lecteur intégré** — YouTube et Vimeo sont reconnus et joués sur place, toute
autre adresse devient un simple lien. Intégrer une URL quelconque dans une iframe
exposerait l'app à ce que sert la page ; le cadrage aux deux plateformes est délibéré.

Sept des dix programmes portent une source, **vérifiée en HTTP avant publication** :

| Programme | Source |
|---|---|
| 5×5 débutant, Madcow 5×5 | `stronglifts.com` |
| Force 3 jours | `startingstrength.com` |
| Push Pull Legs, Full body débutant, Cycle 5/3/1 | `thefitness.wiki` |
| Sans matériel | wiki r/bodyweightfitness |

Haut/Bas, Texas Method et Split 5 jours n'en portent pas : ce sont des découpages
génériques sans page canonique.

**Aucune vidéo n'est renseignée.** Une adresse YouTube ne se devine pas, et je n'en
ai pas trouvé qui fasse autorité pour ces méthodes ; inventer un identifiant aurait
donné un lecteur affichant n'importe quoi. Le champ existe et le lecteur fonctionne :
il suffit de coller une adresse.

## 8 quaterdecies. Contenus achetés : la règle

Le dépôt GitHub est **public**. Le Google Sheet est **privé**. Cette différence
décide de tout.

| Contenu | Où il va |
|---|---|
| Catalogue d'exercices, méthodes publiquement documentées | dépôt, comme aujourd'hui |
| Contenus achetés, programmes écrits par le coach | **Sheet uniquement** |

Un nom d'exercice n'appartient à personne : « traction d'omoplates », « dips
négatifs », « squat archer » sont le vocabulaire de la discipline. Le catalogue les
reprend librement. Un **agencement de séries, répétitions et progressions**, lui, est
le produit vendu : il n'a rien à faire dans un dépôt public, et sa diffusion à
40 pratiquants est une question de licence que le coach doit poser à l'auteur.

L'usage personnel — remettre dans son propre suivi un programme qu'on a acheté —
ne pose pas ce problème.

### Le gabarit d'import

Pour verser un programme sans passer par le dépôt : `modele-import.xlsx`, à la
racine, sert de gabarit — une notice, la fiche du modèle (onglet **Fiche**), la
grille à remplir (onglet **Programme**, exercices désignés par leur nom), et la
liste des exercices disponibles en référence. Rempli, `Réglages ▸ Importer un
programme` le lit dans le navigateur (SheetJS) et écrit un modèle dans Firestore —
plus d'aller-retour par un onglet du classeur Google, l'ancien sas a disparu avec
Sheets.

Rien n'est créé si un seul nom d'exercice de l'onglet Programme est introuvable au
catalogue — `importerModele` renvoie la liste des noms en défaut plutôt que de
produire un programme troué.

**Il ne contient aucun contenu acheté**, seulement la structure.

### L'export, le même chemin à l'envers

`Réglages ▸ Exporter un programme` liste les modèles ; un tap sur l'un d'eux
redescend un `.xlsx` au **même format que le gabarit** — mêmes onglets, mêmes
en-têtes (`EN_TETES_PROGRAMME` fige l'ordre des colonnes des deux côtés),
exercices en clair. Un export retouché dans Excel se réimporte donc tel quel :
c'est fait pour retoucher trente lignes au clavier plutôt qu'au doigt dans
l'éditeur, et pour garder une copie hors Firestore d'un programme qu'on a mis
du temps à composer.

Deux choix qui se voient dans `classeurDuModele` : les lignes sortent triées
jour/bloc/ordre (`triJours`, comme à l'affichage) plutôt que dans l'ordre
arbitraire des documents Firestore ; et un exercice disparu du catalogue repart
avec son **identifiant**, pas une case vide — l'identifiant fait échouer
bruyamment la réimportation (`EXERCICES_INCONNUS`) là où le vide aurait fait
sauter la ligne en silence, `programmeEnLignes` ignorant les lignes sans nom.
Un modèle encore sans ligne sort quand même avec sa ligne d'en-têtes, d'où
`aoa_to_sheet` plutôt que `json_to_sheet`.

## 8 quindecies. L'accueil du pratiquant

Écran d'arrivée, calqué sur ce que HexFit fait bien et débarrassé de ce qu'il fait
en trop.

**Ce qu'on affiche.** En premier, si le coach en a laissé un, le **message du
coach** (§ 8 undecies) — le seul endroit de l'app où sa voix s'adresse
directement au pratiquant. Puis une salutation selon l'heure, la **prochaine
séance programmée** avec son échéance — aujourd'hui, demain, dans trois jours —
et le **programme en cours** : nom, semaine sur durée, barre d'assiduité. Puis
deux liens, « Voir le détail » et « Tous mes programmes ».

**Sans le détail des exercices.** L'accueil dit quoi et quand, pas comment. Le
contenu de la séance est à un appui.

`accueil_()` calcule la prochaine séance en comparant les jours du programme au jour
courant, modulo sept. Une séance du jour **déjà close** renvoie à la semaine
suivante : sinon l'app proposerait éternellement de refaire ce qui vient d'être fait.
Vérifié sur les sept jours de la semaine.

**La navigation du pratiquant** devient Accueil · Calendrier · Progrès. L'écran de
séance n'est plus un onglet mais une destination, atteinte depuis l'accueil.

## 8 sexdecies. Activités libres

Tout ne se passe pas dans le programme : une sortie course, un match, une séance
improvisée. `Coach ▸ … ▸ ＋ Consigner une activité` enregistre sport, date, durée,
distance, **perception de l'effort de 0 à 10** et notes.

Le sport se choisit dans une liste groupée par famille — salle, course, vélo, eau,
collectif, raquette, combat, souplesse, glisse. Volontairement courte : de quoi
couvrir ce que font vraiment des pratiquants de musculation, pas un catalogue de
fédération. « Séance libre » couvre la séance à nu, hors programme.

Les activités remontent à trois endroits : l'accueil du pratiquant, son calendrier,
et la **fiche que consulte le coach** — section « Activités hors programme ». Voir
qu'un pratiquant a couru trois fois dans la semaine change la lecture de son
assiduité, et c'est une information qu'aucune séance prescrite ne donne.

### Ce qu'on a repris de HexFit, et ce qu'on a écarté

| | |
|---|---|
| Repris | accueil qui dit la prochaine séance et le programme en cours |
| Repris | saisie d'activité libre avec liste de sports et effort perçu 0-10 |
| Repris | bande de jours marquant ceux qui portent quelque chose (déjà dans le calendrier) |
| **Écarté** | nutrition — hors sujet pour ce coach |
| **Écarté** | messagerie intégrée — SMS, e-mail et WhatsApp existent déjà et le coach les maîtrise |

La messagerie mérite un mot : c'est un canal de plus à surveiller, un historique de
plus à conserver, et une conversation qui n'existe nulle part ailleurs. Le bouton
**Prévenir** (§ 8 duodecies) fait le travail avec les outils que tout le monde a déjà.

## 8 septendecies. La note du coach et le fil de l'exercice

Deux choses distinctes, souvent confondues.

**La note** est une consigne. Le coach l'écrit sur une ligne de programme, elle fait
partie de la prescription et se lit avec l'exercice — en liseré rouge sur la carte,
en grand dans l'écran de saisie, signée de son prénom. Colonne `note` de
`Programmes` et `ModeleLignes`, donc elle survit à la copie modèle → attribution.

Elle se distingue de la `consigne` du catalogue : celle-ci décrit le mouvement pour
tout le monde, la note s'adresse à **une personne sur cet exercice**. « Ne descends
pas plus bas que la parallèle tant que ton genou tire » n'a de sens que pour un seul
pratiquant.

**Le fil** est une conversation. Coach et pratiquant écrivent tour à tour, attachés à
l'exercice. Bulles rouges pour l'un, grises pour l'autre. Un compteur signale ce qui
attend une réponse : sur la carte de l'exercice côté pratiquant, sur la ligne de
l'athlète côté coach. Ouvrir le fil vaut lecture.

### Pourquoi ce n'est pas la messagerie qu'on a refusée

Une messagerie est un canal parallèle : un endroit de plus à surveiller, une
conversation qui flotte hors de tout contexte. Ici le propos reste **collé au
mouvement dont il parle**. On rouvre le développé couché six mois plus tard et on
retrouve la remarque sur l'épaule qui coinçait, à côté des charges de l'époque.

C'est aussi pour ça qu'il n'y a pas de notification : le mot attend sur l'exercice,
et se voit au moment où on en a besoin — quand on est devant la barre.

## 8 octodecies. Vitesse (historique, Apps Script)

Cette section détaillait l'optimisation d'un modèle devenu obsolète : chaque action
passait par Apps Script, qui mettait 0,5 à 2 s rien qu'à répondre, sur un « classeur
entier en mémoire » relu à chaque fois — mémoire de requête, cache des onglets
stables, photos différées, affichage immédiat depuis une copie locale (`lireVite()`).
C'est précisément cette latence incompressible qui a motivé le passage à Firestore
(PRODUCTION.md § 1) : les lectures vont directement du navigateur à la base, sans
serveur entre les deux, et `persistentLocalCache` sert le hors-ligne nativement.

**Ce qui reste comme discipline, sous une autre forme :**

- **Dénormaliser plutôt que recalculer à volée** — `resume.nbSeances` sur le profil
  évite de lire l'historique de tous les athlètes à l'ouverture de la liste
  (`dataCoachAthletes`) ; `nb_jours`/`nb_exercices`/`duree_max_min` sur les
  attributions et modèles évitent de lire leurs sous-collections juste pour les
  compter — ou, pour la durée, pour rejouer `estimerDuree` sur chaque modèle à
  l'ouverture de la liste. Les trois sont réécrits ensemble à chaque
  enregistrement ou suppression de jour ; un modèle qui n'a pas encore de durée
  (composé avant, ou versé par le seed) la reçoit au premier affichage de la
  liste, `rattraperDureesModeles` ne lisant les lignes que de ceux-là.
- **Photos différées** : toujours vrai, `dataPhotos` part après la liste des
  athlètes, pas avec.
- **Historique borné** : la formule d'Epley et « dernier/record » ne lisent plus
  que les cinq dernières séries d'un exercice, pas toute la carrière (§ 8, Pièges
  Firestore).

**Le plafond des photos reste le même dans l'esprit**, juste porté ailleurs :
encodées en base64 dans un document Firestore (`prive/photo`) plutôt qu'une cellule
de classeur, chaque photo tient large sous la limite de 1 Mo par document. Au-delà
de cent pratiquants, les déplacer vers un stockage dédié reste l'idée de secours
(PRODUCTION.md § 6).

## 8 novodecies. On clique la ligne, pas l'icône

Partout où une ligne représente un enregistrement — un exercice du programme, une
fiche du catalogue, un maximum, un programme attribué — **la ligne entière ouvre
l'édition**. Les crayons ont disparu : ils étaient de petites cibles, et un pouce
en salle ne vise pas au pixel.

`lignesCliquables()` pose le comportement en une ligne de code par écran. Les
boutons imbriqués gardent leur rôle : supprimer, monter, prévenir, ouvrir un lien.
Un clic sur eux ne déclenche pas l'édition, un clic ailleurs sur la ligne si.

Les zones tactiles des boutons restants passent de 4 à 8 pixels de marge, pour la
même raison.

## 8 vicies. Glisser-déposer

Blocs et exercices se réordonnent au doigt dans l'éditeur. Un exercice peut passer
d'un bloc à l'autre, ce qui est le geste courant : on transforme deux séries isolées
en superset en tirant l'une dans l'autre.

**Pas de glisser-déposer HTML5.** Il n'existe pas au tactile, et le coach travaille
au téléphone. `triable()` passe par les événements pointeur, qui couvrent souris et
doigt sans dépendance ni bibliothèque à charger — l'app doit rester utilisable hors
ligne.

**Écouter le document, pas capturer le pointeur.** La première version appelait
`setPointerCapture` sur la poignée ; son échec interrompait le gestionnaire avant
même d'installer les écouteurs, et la poignée ne répondait à rien. `pointermove` et
`pointerup` sont désormais écoutés sur le document, qui voit tout — le doigt quitte
la poignée dès le premier centimètre de toute façon.

**Une poignée nommée par ce qu'elle déplace.** `[data-poignee="bloc"]` ou
`"exercice"`. Un sélecteur descendant attrapait les poignées d'exercices depuis le
bloc parent, et le second appel écrasait les liaisons du premier.

**Une poignée dédiée**, pas la ligne entière : attraper la ligne entrerait en conflit
avec le défilement. La poignée porte `touch-action: none`, ce qui dit au navigateur
de ne pas interpréter le geste comme un scroll.

**Des identités, pas des positions.** Chaque bloc et chaque exercice reçoit un `_uid`
au chargement. Après un déplacement, `relireOrdre()` relit le DOM et reconstruit
`S.ed` à partir de ces identités : une clé fondée sur la position se serait invalidée
au premier mouvement. Les réglages du bloc — tours, repos — suivent le bloc.

Vérifié sous Node avec un DOM simulé : bloc descendu en dernier, exercice déplacé
d'un bloc à l'autre, bloc entièrement vidé. Le bouton « monter » disparaît, devenu
inutile.

## 8 vicies bis. Le temps

### Estimer la durée d'une séance

`estimerDuree_()` additionne, en secondes :

- chaque série, soit les répétitions × la cadence — une fourchette « 8-10 » compte
  pour 9, « max » pour 10, une cadence absente vaut **2 s par répétition**, soit le
  tempo naturel : une seconde de montée, une de descente. Rien n'est inscrit dans le
  champ pour autant, l'absence de cadence reste l'absence de cadence ;
- les exercices au temps, à leur durée, « max » comptant pour 45 s ;
- les pauses à l'intérieur du bloc, entre deux exercices seulement ;
- les repos entre les tours, **un de moins que de tours** : le dernier repos est
  absorbé par le passage au bloc suivant ;
- **4 minutes par changement de bloc** — trouver le poste, charger la barre ;
- **10 minutes d'échauffement**, une seule fois.

Les trois constantes sont dans `CONFIG`. C'est une estimation de planification, pas
une promesse : elle ignore le temps passé à discuter ou à attendre un banc.

Elle s'affiche **arrondie à cinq minutes** et formulée, jamais annoncée comme un
calcul : 61 minutes devient « 1 heure », 95 devient « 1 h 35 ». Le mot « environ »
est inutile — personne ne prend une durée de séance pour une promesse à la minute,
et l'arrondi le dit déjà.

La durée s'affiche sur l'accueil, sur l'écran de séance, dans l'éditeur et sur les
programmes. **Chaque bloc affiche aussi la sienne**, sans l'échauffement ni le
changement de poste qui n'appartiennent à aucun bloc en particulier : c'est ce qui
permet de voir d'un coup d'œil quel bloc pèse dans la séance.

Côté pratiquant, un bloc à un seul exercice n'a pas d'en-tête — il ne se distingue
pas d'une série classique, et c'est voulu. Sa durée et son repos passent alors **sur
la carte de l'exercice**, faute de quoi ils ne s'afficheraient nulle part.

Les repos sont écrits en minutes dès qu'ils dépassent la minute : « 2 min 30 » plutôt
que « 150 s », qu'on ne lit pas. `dureeJour()` la recalcule côté client pour le jour en cours d'édition,
que le serveur ne connaît pas encore.

### Démarrer et suivre

Un bouton **Démarrer la séance** ouvre la séance explicitement, au lieu de la créer
en douce à la première série. Le bandeau devient alors un pendule : *23 min sur
43 prévues · 2/5 exercices*. Il bat à la minute — la seconde n'apprendrait rien et
réveillerait l'écran pour rien.

`demarrerSeance_` fige `duree_prevue` au démarrage : le programme peut changer
ensuite, la comparaison n'aurait plus de sens.

**C'est le seul point d'entrée.** Avant lui, rien de ce qui écrit ne répond :
pastilles inertes et grisées, « Valider la série » remplacé par « Démarrez la
séance pour enregistrer », « Terminer cet exercice » désactivé. La séance
démarrait autrefois toute seule au premier geste qui compte — c'était une
séance ouverte, et un chronomètre lancé, pour un pouce qui ripe sur un écran de
cartes serrées. `assurerSeanceActive()` ne démarre donc plus rien : elle refuse
et le dit. Elle reste appelée avant chaque écriture, en garde-fou — une
écriture ne doit jamais dépendre du seul état du DOM.

**Et l'annulation est un geste ordinaire.** On démarre par mégarde, on se
ravise : « Annuler la séance » efface la séance et ses séries tant qu'elle est
ouverte. Les règles l'autorisaient sur le document mais pas sur ses séries, que
`supprimerSeance` efface en premier — toute annulation butait sur un « droits
insuffisants » qui ressemblait à un interdit alors que ce n'en était pas un.
`maSeanceOuverte()` (`firestore.rules`) ouvre la suppression des séries au
propriétaire d'une séance encore ouverte. Une séance close reste un historique
que seul un admin réécrit.

### Assiduité et régularité

Deux mesures distinctes, et le coach a besoin des deux.

**L'assiduité** répond « en fait-il assez ? » : nombre de séances, moyenne par
semaine, histogramme sur douze semaines où les activités libres se distinguent des
séances du programme.

**La régularité** répond « à quel rythme ? ». On mesure l'écart entre séances
consécutives, et on rapporte sa dispersion à sa moyenne : plus les écarts se
ressemblent, plus la note est haute. Elle n'est pas calculée sous trois écarts.

La distinction n'est pas théorique. Vérifié : douze séances régulières donnent 80,
les **mêmes douze séances** tassées au début puis plus rien donnent 0. L'assiduité
est identique, la progression ne le sera pas.

**Le temps réel contre le prévu** complète le tableau. Un dépassement systématique
dit que les repos sont trop courts sur le papier ou qu'on traîne entre les exercices ;
une séance plus rapide que prévu dit des repos écourtés ou des séries sautées.

## 8 unvicies. Profil d'accueil

Avant cette section, le coach n'avait que deux champs libres (`objectif`, `notes`)
pour composer un programme. Un onglet **Profil**, à côté de *Fiche* dans la fiche
d'un pratiquant, porte désormais l'ancien questionnaire d'accueil AppSheet (§ 13) —
adapté, pas recopié.

**C'est le coach qui remplit, en entretien avec le pratiquant** — décidé
explicitement plutôt que de reprendre le principe self-service de l'ancien Google
Forms : le champ `profil` n'est écrit que par le coach (`firestore.rules`), et n'est
affiché dans aucun écran pratiquant, comme `notes` aujourd'hui. `vueProfil()` est
directement le formulaire, pré-rempli avec les réponses déjà données — pas d'écran
de lecture séparé, sur le modèle de l'éditeur de programme (`peindreEditeur`)
plutôt que du couple lecture/modale de la fiche.

Sept sections : informations générales, objectifs (curseurs 1-5 par type
d'objectif), expérience, santé & sécurité, habitudes de vie, nutrition,
organisation, motivation (curseur 1-10). Nom et prénom ont été retirés du
questionnaire d'origine : `nom` est déjà saisi à l'inscription, les redemander
aurait dupliqué une donnée qui dérive.

**Deux composants sur mesure, adaptés au tactile plutôt que copiés du formulaire
papier.**

La disponibilité ne se coche plus dans une grille de 126 cases (7 jours ×
18 heures) à la Google Forms : `grilleDispo()` dessine un agenda compact, jours en
colonnes et heures en lignes, où l'on peut aussi bien taper une case que glisser le
doigt pour en peindre plusieurs d'affilée. Le geste écoute le document le temps du
glissement plutôt que de capturer le pointeur sur la cellule — la même leçon que le
glisser-déposer de l'éditeur (§ 8 vicies), retenue une seconde fois.

Les blessures ne se cochent plus sur une liste de 16 zones × 6 types. `carteCorps()`
dessine une silhouette SVG schématique — deux vues, avant et arrière, aucune
dépendance externe, même esprit que `disques()` pour les plaques — où l'on tape une
zone du corps pour ne révéler que ses 6 types de blessure possibles. Une zone déjà
renseignée reste visible en rouge même vue fermée.

**Chaque membre pair est distingué gauche/droite** (23 zones à l'avant, 11 à
l'arrière — épaules, coudes, avant-bras, poignets, mains, genoux, chevilles,
pieds, mollets, plus le duo face/dos des bras et cuisses ci-dessous) ; seules
les zones dessinées comme une forme unique (Pectoraux, Ventre, Hanches, Nuque,
Dos, Trapèzes, Lombaires, Fessier) restent globales. Première version sans la
distinction gauche/droite, corrigée après un essai réel : marquer un genou
allumait les deux, inutilisable pour un vrai suivi. Les côtés suivent la
convention anatomique, pas l'écran — sur la vue de face le pratiquant nous fait
face, son côté droit est donc dessiné à *gauche* de l'écran ; sur la vue de dos
le miroir s'inverse. `silhouette()` porte le détail en commentaire, piège
facile à retourner. Les épaules, elles, ont aussi dû devenir une zone à part :
sans elles, taper l'épaule marquait le bras (le haut du bras, dessiné juste en
dessous), pas l'épaule elle-même.

Le bras et la cuisse n'ont pas de zone générique unique : Biceps/Quadriceps
(face) et Triceps/Ischio-jambier (dos) se marquent séparément, plutôt qu'un
« Bras » ou une « Jambe » qui aurait forcé à indiquer où précisément la douleur
se loge. Sur la vue de dos, trois anciennes zones purement décoratives (le
bandeau d'épaules, le bloc de bassin, les manchons de cuisse) sont devenues
cliquables sous ces nouveaux noms — Trapèzes, Fessier, Ischio-jambier — sans
bouger d'un pixel ; seul le rectangle Dos, avant d'un seul bloc du haut du dos
aux lombaires, a été coupé en deux pour isoler ces dernières.

## 8 duovicies. Routines : ce qui se conseille hors séance

Ce qui manquait se voit dans le déroulé d'un rendez-vous : le pratiquant parle
d'une douleur — celle-là même que le profil sait déjà situer sur la silhouette
(§ 8 unvicies) — et le coach répond par de la mobilité, des étirements ou du
renforcement à faire **en dehors des séances**. Rien dans l'app ne portait ce
conseil : ni le programme, qui est un rythme de séances, ni le catalogue, qui ne
connaît que des briques.

**Une routine est un mini-programme d'une seule séance**, parfois d'un seul
exercice. Elle se conseille avec un **rythme** (tous les jours, un jour sur deux,
une ou deux fois par semaine) et un nombre de **semaines**, jamais avec des
dates : c'est le pratiquant qui la posera dans son planning, ou pas.

### Ce que ça change dans le catalogue

Chaque exercice porte désormais un **type** — Musculation, Mobilité, Étirement,
Renforcement — filtrable et regroupable dans la Bibliothèque. Les 171 exercices
de départ ne portent pas le champ : **un type absent vaut « Musculation »**
(`typeExo`), ce qui évite un script de reprise sur toute la base pour y écrire
partout la seule valeur qu'ils pouvaient avoir. Le type ne s'affiche sur une
carte que s'il sort de l'ordinaire — « Musculation » sur 171 lignes sur 171
n'apprendrait rien.

### Le document, pas la sous-collection

`routines/{id}` porte ses exercices **dans le document**, là où un modèle les
range dans une sous-collection `lignes`. Une routine ne se dissocie pas — c'est
le sens du mot ici, et une seule vidéo la montre souvent en entier ; l'embarquer
épargne une sous-collection, ses compteurs dénormalisés et une lecture par
routine. Chaque exercice y porte son mini-programme à lui : séries, répétitions
*ou* durée, repos.

En lecture, la collection est **ouverte à tout compte connecté**, comme le
catalogue d'exercices et contrairement aux modèles. C'est délibéré : les modèles
sont coach-only, ce qui oblige à recopier leur contenu chez le pratiquant à
l'attribution (§ 8, « Pièges ») ; une routine est une fiche générique, l'ouvrir
en lecture évite ce piège d'entrée de jeu.

### Le catalogue des routines

Un onglet **Routines** s'ajoute à la navigation du coach, à côté de Modèles :
liste avec recherche, filtres (type, rythme, vidéo) et regroupement comme les
deux autres listes, appui long sur une carte pour sa fiche comme les modèles, et
un éditeur — fiche, vidéo d'ensemble, exercices réglables et réordonnables au
doigt. Une routine peut n'en porter qu'un seul, l'écran ne s'en offusque pas.

### Les rythmes portent leurs jours

`FREQUENCES` associe à chaque rythme les jours qu'il vise. « Un jour sur deux »
ne se calcule pas sur une semaine de sept : partir du lundi ou du mardi donne
deux rythmes différents, et un vrai J+2 glisserait de semaine en semaine — d'où
deux variantes fixes (lun/mer/ven/dim et mar/jeu/sam) plutôt qu'un calcul qui
dérive. Pour « une » et « deux fois par semaine », les jours ne sont qu'un point
de départ : le pratiquant posera les siens.

### Conseiller, pas attribuer

Une routine se **conseille** depuis l'onglet *Routines* de la fiche d'un
athlète : on choisit dans le catalogue, on dit **pourquoi** (« suite à ta douleur
d'épaule, avant la séance, jamais après ») et on coche *Facturée* le cas échéant.
Les routines en **Brouillon ne sont pas proposées** — une fiche en chantier n'a
rien à faire chez un pratiquant. Le coach peut ensuite changer la note, passer la
routine en *Terminée* ou *Arrêtée*, ou la retirer.

`pratiquants/{email}/routines/{id}` ne copie que de quoi afficher une liste — nom,
type, rythme, semaines — plus la note, le statut et la facturation. **Le contenu
n'est pas recopié** : il se relit dans `routines/{id}`, ouverte en lecture. Une
routine retouchée profite donc à tous ceux à qui elle a été conseillée, ce qui est
le comportement voulu — un conseil s'affine, il ne se fige pas comme un programme
daté. Règles : lecture par le concerné ou le coach, écriture coach, exactement
comme les 1RM.

### Côté pratiquant

Une carte **Ma routine** s'intercale à l'accueil entre *Mon programme* et le
bouton de consignation : la dernière routine encore en cours, sa raison d'être,
puis *Voir le détail* et *Toutes mes routines*. Une routine terminée ou arrêtée
quitte l'accueil mais reste consultable dans la liste, rangée sous « Passées » —
on y revient pour retrouver un mouvement.

Le détail montre la note du coach, la description, la **vidéo d'ensemble** et les
exercices avec leurs séries, répétitions ou durée et repos. Si la routine a
disparu du catalogue, l'écran le dit (« Parlez-en à votre coach ») au lieu de
rester vide — la leçon du § 8 sur les lectures sans `try/catch`.

### La poser dans sa semaine

**＋ Planifier dans ma semaine** est sur la carte d'accueil autant que sur le
détail : le geste ne vaut rien s'il est à deux écrans de l'endroit où la routine
se lit. La carte dit d'ailleurs où on en est — « Lun, Mer, Ven à 07:30 · 2 fois
cette semaine » — et le bouton devient *Modifier ma planification*.

Les jours conseillés sont **pré-cochés**, le pratiquant ajuste, choisit son
heure. Ce qu'il valide devient des entrées de son **planning récurrent** — celui
qui existait déjà pour ses cours hors programme. Elles s'affichent donc dans son
calendrier et son bandeau de semaine sans une ligne de code de plus, et le coach
les voit comme le reste de son planning. Un champ `routine_id` les marque : c'est
ce qui permet de les remplacer ou de les retirer sans toucher au reste.

**Une entrée née d'une routine ne s'édite pas dans « Mon planning ».** Elle y
porte une étiquette *Routine*, et la taper renvoie sur la routine — là où elle a
été posée. Sans ça, l'éditeur d'activité ordinaire la refusait (son nom n'est pas
dans la liste des sports, donc « Choisissez une activité » sur sa propre entrée)
et lui aurait coupé son `routine_id` à la première retouche, la laissant
orpheline dans le planning, impossible à retirer avec la routine.

`date_debut` est le jour de la planification, `date_fin` en découle si la routine
conseille un nombre de semaines — la fenêtre s'éteint d'elle-même. Modifier la
planification **réécrit** : on retire les entrées nées de cette routine et on
repose celles qui sont cochées. Trois écritures pour un jour changé, mais aucun
cas tordu à tenir, et un planning se retouche rarement.

### « Faite », et rien de plus

Un bouton sur l'accueil et sur le détail : *Marquer faite aujourd'hui*, qui
devient *✓ Faite aujourd'hui*. Une rangée de sept pastilles montre la semaine.

`pratiquants/{email}/routines/{id}/faits/{AAAA-MM-JJ}` : **l'identifiant du
document est la clé du jour**, donc cocher deux fois le même jour réécrit le même
document au lieu d'en empiler deux, et la liste se lit sans tri ni
dédoublonnage. Les règles n'y autorisent que `create` et `delete` par le
concerné — une exécution est faite ou ne l'est pas, elle ne se modifie pas.

Pas de séries, pas de charges : consigner une routine de mobilité comme une
séance aurait demandé plus de gestes que le mouvement lui-même. Le coach retrouve
le décompte en ouvrant la routine conseillée dans la fiche de l'athlète — une
lecture faite à ce moment-là seulement, pas pour peindre la liste entière.

## 8 tervicies. Un fait ne se reconnaît pas à son nom, mais à sa date

Le pratiquant choisit librement **quelle** séance du programme il fait, pas
forcément celle assignée à ce jour-là par son intitulé — « Lundi — Séance 1 »
un vendredi, par exemple. Signalé le 5 septembre 2026 : le bandeau « Cette
semaine » de l'accueil montrait ces séances comme jamais faites, pour toujours,
parce qu'il comparait le jour **projeté** (celui que le programme attend ce
jour de la semaine) au jour **réellement enregistré**, et n'affichait « fait »
qu'en cas d'égalité des deux.

`itemsDuJour`, au calendrier, ne se trompait pas : il regarde d'abord ce qui a
été enregistré à une date, peu importe l'intitulé, et ne retombe sur la
projection que si rien n'a été fait ce jour-là — un fait prime toujours sur une
intention. `semaineCourante` (bandeau d'accueil) applique maintenant la même
règle plutôt que sa propre comparaison par intitulé.

Vérifié avec `firebase-admin` sur le vrai compte de Guillaume : quatre séances
réellement faites sur des jours ne correspondant à aucune des leurs, toutes
ressorties « fait » après correction, la semaine sans rien de fait restant
correctement à blanc.

**Même défaut, une deuxième fois le même après-midi, sur les routines.** Une
récurrence née d'une routine planifiée (§ 8 duovicies) se coche dans son propre
`faits/{AAAA-MM-JJ}` (§ 8 duovicies, « Faite, et rien de plus ») — le bandeau ne
relisait jamais cette sous-collection et affichait `fait: false` en dur pour
toute récurrence, cochée ou non. `itemsDuJour` au calendrier, lui, croise déjà
`routine_id` avec les faits du jour : `semaineCourante` reçoit maintenant les
mêmes faits (`dataFaitsRoutines`, un par routine, en une passe) et fait la même
vérification. Vérifié pareillement : la routine du compte de Guillaume, cochée
la veille et le jour même, ressort « fait » ces deux jours-là, et le dimanche
suivant — pas encore coché — reste à blanc.

## 8 quatervicies. Rouvrir une séance passée ne montrait pas son fil de commentaires

`modalDetailSeance` (le détail d'une séance close, au calendrier) ne chargeait
que les séries — poids, répétitions, durée — sans jamais interroger
`commentaires`. Un commentaire porte sur un **exercice** (`email` +
`exercice_id`), pas sur une séance : c'est le même fil qu'en séance en direct.
Signalé le 5 septembre 2026, une première fois corrigé avec un bouton
*Commentaires* par exercice — mais un bouton qui ouvre un fil **éditable**
(textarea, bouton Envoyer) n'a pas sa place dans un historique : une séance
close ne se répond pas, elle se relit. Renvoyé le jour même : le fil s'affiche
maintenant **directement** sous le résumé de l'exercice, en bulles lecture
seule (même style que `modalCommentaires`, sans le formulaire), sans bouton
pour y entrer.

**L'ordre des exercices ne suivait pas non plus celui de la séance.**
`dataDetailSeance` triait les séries par `serie_num` — un compteur qui repart
de 1 à *chaque* exercice (`enregistrerSerie` : `faitsDe(e).length + 1`), donc
sans aucun sens une fois comparé entre deux exercices différents. L'ordre
affiché dépendait alors de l'ordre de retour de Firestore, à peu près
arbitraire — vérifié sur une vraie séance : neuf lignes dans un ordre qui ne
correspondait à rien. `horodatage`, écrit à chaque série (`enregistrerSerie`)
et jamais lu ici, est le seul champ qui grandit sur toute la séance : trier
dessus reconstitue l'ordre réel d'exécution — vérifié sur la même séance,
l'ordre chronologique retrouvé (10 h 09 → 11 h 39) correspondant exactement au
déroulé du programme.

**Un exercice qui revient deux fois dans la séance — lourd puis léger — montrait
son fil deux fois, mot pour mot.** Pas un doublon d'écriture ni de lecture :
le fil porte sur l'**exercice** (`exercice_id`), pas sur le passage, donc les
deux blocs de « Développé couché » d'une même séance partagent le même fil et
la même unique lettre du pratiquant. Affichée sous chacun, elle donnait
l'impression d'un bug de sauvegarde. `dataDetailSeance` ne la pose maintenant
que sous la **première** occurrence de l'exercice dans la séance.

## 9. Parti pris visuel — charte Wellness Sport Club

L'app reprend l'identité de **Wellness Sport Club** (`wellness-sportclub.fr`),
l'enseigne où travaille le coach. Valeurs relevées directement dans le CSS et les
fichiers du site.

| Jeton | Valeur | Usage |
|---|---|---|
| `--iron` | `#151515` | fond (repris de l'enseigne) |
| `--plate` | `#1E1E1E` | surfaces |
| `--edge` | `#2E2E2E` | bordures |
| `--chalk` | `#F4F4F4` | texte principal — 16,6:1 |
| `--dust` | `#9A9A9A` | texte secondaire — 6,5:1 |
| `--brand` | `#A61E1F` | **aplats uniquement** (`--main_color` du site) |
| `--brand-ink` | `#E05253` | **texte et accents** sur fond sombre — 4,8:1 |
| `--on-brand` | `#FFFFFF` | encre sur aplat rouge — 7,4:1 |

**Le dédoublement du rouge n'est pas cosmétique.** Le rouge officiel `#A61E1F`
plafonne à **2,42:1** sur le fond : illisible en texte. Il ne sert qu'en aplat, avec
du blanc dessus. Toute couleur de texte passe par `--brand-ink`. L'ancien parti pris
« encre sombre sur accent », hérité de l'ambre, a été abandonné : `#14171C` sur
`#A61E1F` ne donne que 2,4:1.

À noter : **la marque a deux rouges.** Le CSS déclare `#A61E1F`, le fichier du logo
est peint en `#C22026`. C'est le premier qui fait foi pour l'interface.

### Les deux thèmes

Sombre par défaut — c'est l'identité de l'enseigne, et une salle est rarement en
plein jour. Un thème clair a été ajouté, réglable par **chaque** utilisateur,
coach comme pratiquant, par le bouton ◐ de l'en-tête. Trois valeurs : `sombre`,
`clair`, `auto` (« comme le téléphone »).

Le choix vit dans `localStorage` sous `muscu.theme`, **pas dans le classeur** : le
même compte peut vouloir du clair sur l'ordinateur et du sombre sur le téléphone
en salle.

Rien n'est dupliqué : le clair **redéfinit les mêmes jetons**, jamais une règle de
composant. Deux sélecteurs y mènent — `:root[data-theme="clair"]` pour le choix
explicite, `:root.sys-clair` que le script d'amorçage pose quand `auto` et que le
système est en clair. Ce script est **en tête de document**, avant le premier
pixel : posé plus bas, l'écran clignoterait en sombre avant de virer au clair.
`matchMedia` reste écouté pour qu'`auto` suive le téléphone app ouverte.

Les couleurs en dur ont dû devenir des jetons pour que le clair existe :
`--sunk` (champs, vignettes), `--press` (appui), `--lift` (glissé), `--veil`
(voile des modales), `--nav-bg`, `--relief` (ombre portée, nulle en sombre), et
le trio sémantique `--warn-ink/-bg`, `--ok-ink/-bg`, `--bad-ink/-bg`, distinct de
l'accent de marque.

Un renversement à connaître : **`--brand-ink` vaut `#E05253` en sombre et
`#A61E1F` en clair.** Le rouge officiel, illisible en texte sur fond noir (2,4:1),
redevient le bon choix sur fond clair (7,4:1). C'est le même rôle, pas la même
valeur.

### Typographie

Le site utilise Futura (partout), Bebas (chiffres et dates), Catamaran (corps
éditorial) et Gilroy (prix uniquement). Futura et Gilroy sont sous licence
commerciale et ne peuvent pas être embarquées.

| Rôle | Retenu | Raison |
|---|---|---|
| Titres, chiffres | **Bebas Neue** | déjà dans la charte, libre (OFL) — remplace Anton |
| Interface | **Jost** | reprise libre de Futura — remplace Inter Tight |

### Logo

`assets/logo-wellness-dark.png` est une **variante dérivée** : le sous-titre
« SPORT CLUB » du fichier officiel est en gris `#494948`, invisible sur fond sombre ;
il a été recoloré en `#F4F4F4`. Le rouge n'a pas été touché. À remplacer par le
fichier officiel pour fond sombre dès que l'enseigne le fournit.

> **Autorisation à obtenir.** L'usage du logo et du nom Wellness dans une app
> distribuée aux pratiquants doit être validé par l'enseigne. Tant que ce n'est pas
> fait, l'app reste un outil interne au coach. Le logo est isolé dans un seul fichier
> et l'identité tient dans huit jetons CSS : revenir en arrière coûte cinq minutes.

### Constantes conservées

Cibles tactiles de 44 px minimum — l'app est utilisée en salle, téléphone en main,
entre deux séries.

Élément signature : les charges sont représentées par des **disques olympiques aux
couleurs réglementaires** (25 rouge, 20 bleu, 15 jaune, 10 vert, 5 blanc), calculés
par côté sur une barre de 20 kg. Fonction `disques()` dans `index.html`.
Ces couleurs sont normatives, pas décoratives : elles ne suivent pas la charte.

Le dessin montre **la barre entière**, symétrique : bague, disques, fût, disques,
bague. Les disques sont chargés comme on les charge vraiment — le plus lourd contre
le fût, les plus petits vers l'''extérieur.

    100 kg   |oO————Oo|      40 par côté : 25 + 15
    130 kg   |·OO————OO·|    55 par côté : 25 + 25 + 5

Deux versions ont raté avant celle-ci : la première posait les disques au milieu du
fût, la seconde ne dessinait qu'''un côté. Une barre est symétrique et se charge par
les bouts, les deux comptent.

## 10. Prochaines étapes

Ce qui reste, par ordre d'utilité décroissante — le détail et le « pourquoi » sont
dans `PRODUCTION.md` § 5.

1. **Importer les vrais programmes de Jérémy** depuis `Réglages ▸ Importer un
   programme`, avec `modele-import.xlsx` rempli. Le catalogue, lui, est déjà le vrai
   (171 exercices, seedé une fois par `scripts/seed.mjs`).
2. **Éprouver l'app en salle**, téléphone en main entre deux séries. Safari sur iOS,
   Chrome sur Android.
3. **Décider ce que le pratiquant peut ajuster d'autre** que la charge — les
   répétitions, par exemple (§ 8 octies).
4. **Construire l'écran de tableau de bord** qui remplace l'ancien rapport
   hebdomadaire par e-mail (`rapportHebdo`, disparu avec Apps Script) — assiduité de
   tous les athlètes en un coup d'œil, à la demande plutôt qu'un envoi programmé.
5. **Passer l'écran de consentement Google (Firebase Auth) en Production** avant
   d'ouvrir aux 40 pratiquants. En mode Test, seuls les comptes explicitement
   ajoutés se connectent.

## 11. Idées d'évolution non implémentées

- Notification au coach lors d'un record battu
- Export PDF du bilan mensuel — plus de `DocumentApp` sans un Apps Script dédié ;
  une lib JS côté client est la piste la plus simple maintenant
- Comparaison entre pratiquants suivant le même modèle
- Archivage annuel des séries — moins urgent qu'avec un classeur, Firestore n'a pas
  de plafond de lignes comparable
- Envoi d'e-mail direct depuis le compte du coach : second projet Apps Script
  autonome, sans classeur (PRODUCTION.md § 7) — `mailto:` fait l'affaire en attendant

## 12. Outillage local — clasp

**`apps-script/` n'est plus le backend de l'app** (§ 2) : ce qui suit reste vrai pour
qui touche à cette archive, ou construit le second projet Apps Script autonome dédié
à l'e-mail (PRODUCTION.md § 7) — plus pour développer l'app elle-même.

`clasp` est la CLI officielle Google qui synchronise un dossier local avec un projet
Apps Script. Elle supprime les copier-coller vers l'éditeur en ligne.

**En place sur ce poste :** Node 24 (via `nvm`, dans `~/.nvm`) et `@google/clasp` 3.4.1
en global. Les nouveaux terminaux chargent Node automatiquement (`~/.bashrc`).
Session ouverte au nom de `grapinat.pwts@gmail.com`, identifiants dans `~/.clasprc.json`
(hors du dépôt, cf. `.gitignore`).

Le backend vit dans `apps-script/`, séparé de la racine : GitHub Pages sert
`index.html` depuis la racine, et clasp ne pousse que le contenu de `apps-script/`.
Sans cette séparation, clasp enverrait `index.html` dans le projet Apps Script.

```
apps-script/
├── .clasp.json        scriptId + réglages clasp
├── appsscript.json    manifeste (fuseau Europe/Paris, V8, webapp ANYONE_ANONYMOUS)
└── Code.js            le backend — « Code.gs » dans l'éditeur en ligne
```

Le fichier s'appelle `Code.js` en local et `Code.gs` dans l'éditeur : clasp fait la
conversion. Ne pas le renommer en `.gs`, un `pull` recréerait un `Code.js` à côté.

### Coordonnées clasp

| Élément | Valeur |
|---|---|
| Script ID | `1IGvh4SSg-1YAZpO3yjEipg3YucdGG32HMLLSa1VQmhyqBU8g6Sciu09N` |
| Déploiement servant `/exec` | `AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ` (@3) |

Le Script ID n'est pas un secret : sans droit Drive sur le projet, il ne donne accès
à rien. L'ID de déploiement est déjà public, c'est le segment de l'URL `/exec`.

### Usage quotidien, depuis `apps-script/`

| Commande | Effet |
|---|---|
| `clasp pull` | rapatrie l'état de l'éditeur en ligne |
| `clasp push` | envoie le code local vers l'éditeur |
| `clasp push --watch` | pousse à chaque enregistrement |
| `clasp status` | liste ce qui serait poussé |
| `clasp open-script` | ouvre l'éditeur dans le navigateur |
| `clasp tail-logs` | affiche les logs d'exécution |

**`push` ne déploie pas.** Le code poussé devient la version « HEAD » de l'éditeur ;
l'URL `/exec` continue de servir le déploiement figé @3. Pour publier une modification :

```
clasp push
clasp redeploy AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ -d "ce qui change"
```

`redeploy` **met à jour** le déploiement existant : l'URL ne change pas, rien à
reporter dans `index.html`. Ne jamais utiliser `clasp deploy` (sans ID), qui en
créerait un nouveau — c'est le piège du § 8.

**Toujours `pull` avant de modifier** si le code a pu être touché dans l'éditeur en
ligne : `push` écrase le distant sans fusion.

### `clasp run` — tenté, abandonné

Objectif : lancer `migrerSchema` ou `programmeTest` depuis le terminal, sans passer
par le menu du Sheet. **Non retenu.** Trois obstacles levés, un quatrième rédhibitoire :

1. Déploiement de type « exécutable de l'API » manquant → `NOT_FOUND`. Créé puis
   **supprimé** : il rendait le manifeste `webapp` visible sous une seconde URL
   `/exec` publique, pour rien.
2. Client OAuth de Google au lieu d'un client du projet → résolu, clasp s'authentifie
   maintenant avec `765877661024-16v27e30…` (client « Application de bureau » du
   projet `coaching-musculation`, credentials dans `~/creds.json`, hors dépôt).
3. API Apps Script non activée sur le projet Cloud — distinct du réglage
   `script.google.com/home/usersettings`. Activée.
4. **Le périmètre d'autorisation.** L'API d'exécution ne sait pas travailler avec le
   scope restreint d'un script lié à un classeur. Il aurait fallu déclarer le scope
   Sheets complet, donnant au script l'accès à *tous* les classeurs du coach.
   Refusé : le cloisonnement vaut mieux que la commodité.

Conséquence : **les fonctions se lancent depuis le menu `Coaching Fitness` du Sheet.**
`migrerSchema`, `programmeTest`, `rechargerProgrammeTest` y sont toutes.

`projectId` a été ajouté à `.clasp.json` au passage — sans lui, `clasp list-apis` et
`clasp open-credentials-setup` envoient le script ID à la place de l'ID du projet et
échouent sur « projet non valide ».

### Coordonnées clasp

| Élément | Valeur |
|---|---|
| Script ID | `1IGvh4SSg-1YAZpO3yjEipg3YucdGG32HMLLSa1VQmhyqBU8g6Sciu09N` |
| Déploiement servant `/exec` | `AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ` (@3) |

Le Script ID n'est pas un secret : sans droit Drive sur le projet, il ne donne accès
à rien. L'ID de déploiement est déjà public, c'est le segment de l'URL `/exec`.

### Usage quotidien, depuis `apps-script/`

| Commande | Effet |
|---|---|
| `clasp pull` | rapatrie l'état de l'éditeur en ligne |
| `clasp push` | envoie le code local vers l'éditeur |
| `clasp push --watch` | pousse à chaque enregistrement |
| `clasp status` | liste ce qui serait poussé |
| `clasp open-script` | ouvre l'éditeur dans le navigateur |
| `clasp tail-logs` | affiche les logs d'exécution |

**`push` ne déploie pas.** Le code poussé devient la version « HEAD » de l'éditeur ;
l'URL `/exec` continue de servir le déploiement figé @3. Pour publier une modification :

```
clasp push
clasp redeploy AKfycbw8wC_TmFuLzP8yTrOmX5wH5k3Yoc-AbauN3Hj9oF57Lc1NSA-MrclnkuTnKr8DtBpEiQ -d "ce qui change"
```

`redeploy` **met à jour** le déploiement existant : l'URL ne change pas, rien à
reporter dans `index.html`. Ne jamais utiliser `clasp deploy` (sans ID), qui en
créerait un nouveau — c'est le piège du § 8.

**Toujours `pull` avant de modifier** si le code a pu être touché dans l'éditeur en
ligne : `push` écrase le distant sans fusion.

### Exécuter une fonction depuis le terminal — `clasp run`

Objectif : lancer `migrerSchema`, `programmeTest`, `rechargerProgrammeTest` sans
passer par le menu du Sheet.

Deux conditions, dont une seule reste à remplir :

1. **Un déploiement de type « exécutable de l'API ».** Fait : `executionApi` avec
   `access: MYSELF` a été ajouté au manifeste, et le déploiement **@4** créé. Sans
   lui, `clasp run` répond `NOT_FOUND`. `MYSELF` = seul le propriétaire du script
   peut appeler, rien n'est ouvert à quiconque.

2. **Un client OAuth appartenant au projet Cloud du script.** *À faire.*
   `scripts.run` exige que l'application appelante et le script partagent le même
   projet Cloud. clasp utilise par défaut le client OAuth de Google, d'où le
   message « Unable to run script function ». Il faut donc un client local :

   ```
   clasp open-credentials-setup          # ouvre la page Identifiants du projet
   # → Créer des identifiants ▸ ID client OAuth ▸ Application de bureau
   # → télécharger le JSON, par exemple dans ~/creds.json
   clasp login --creds ~/creds.json --extra-scopes https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/script.external_request,https://www.googleapis.com/auth/script.send_mail
   ```

   Les trois scopes correspondent à ce qu'utilise `Code.gs` : le Sheet,
   `UrlFetchApp` pour la vérification des tokens, `MailApp` pour `rapportHebdo`.
   Le jeton d'appel doit couvrir tout ce que la fonction touche.

   Le fichier de credentials contient un secret client : il est dans `.gitignore`,
   ne jamais le committer.

Ensuite :

```
clasp run migrerSchema
clasp run rechargerProgrammeTest
clasp run --params '["EX007"]' uneFonctionAvecArguments
```

`clasp run` s'exécute en mode dev par défaut : c'est la version **HEAD** qui tourne,
donc le code fraîchement poussé, pas celui du déploiement figé.

> **Effet de bord à connaître.** Le manifeste déclare aussi `webapp`, donc le
> déploiement @4 est *également* une application web et possède sa propre URL
> `/exec` publique. Même code, même vérification de token qu'en @3 : pas de risque
> nouveau, mais c'est une seconde URL vivante. `clasp undeploy <id>` la retire —
> au prix de `clasp run`, qui cesse alors de fonctionner.

> **Ce que ça donne comme pouvoir.** `clasp run` exécute n'importe quelle fonction
> du projet sous l'identité du coach, avec tous les droits du script sur le Sheet.
> C'est le but recherché, mais `rapportHebdo` envoie de vrais mails : à ne pas
> lancer à l'aveugle.

## 13. Le modèle AppSheet — ce qu'on en a repris

L'app AppSheet « BDD musculation » (classeur `1Kjo6Vmv…`, propriété du coach) a servi
de référence. Son moteur ne se laisse pas inspecter par outillage — la page ne se
stabilise jamais — mais le classeur source dit tout.

### Sa hiérarchie

```
Programme  (GR Février, 5 semaines, thème « Squats Bench Deadlift », Actif)
└─ Séance  (n°2, « HDC + box + deadlift », jour « 2-Mardi »)
   └─ Travail  (n°1 · 4 séries · 90 s)          ← notre « bloc »
      └─ Ligne  (Incline neutral DB row · 10 reps · 34 kg · cadence 1-1-1-0)
      └─ Ligne  (Développé militaire assis · 12 reps · 23 kg · 1-0-1-0)
```

Le « Travail » porte les séries et le repos ; les lignes portent reps, charge et
cadence. **C'est ce niveau qu'on a repris sous le nom de bloc** (§ 5), en le
réduisant à une colonne au lieu d'une table.

### Ce qu'on n'a pas repris

| Notion | Chez AppSheet | Chez nous |
|---|---|---|
| Programme réutilisable | entité, versionnée, `Actif`/`Brouillon` | absent — lignes collées à un email |
| `% RM` | colonne | absent |
| `Cadence` (tempo 1-0-3-0) | colonne | **repris** → `cadence` |
| `Temps pause` (rest-pause intra-bloc) | colonne | **repris** → `pause_s` |
| `Durée` (exercice au temps, « max ») | colonne | **repris** → `duree_s` |
| Catalogue exercice | + équipement, description longue, GIF, vidéo YouTube | id, nom, groupe, consigne |
| Profil pratiquant | ~20 champs + questionnaire de 104 colonnes | **repris, adapté** → § 8 unvicies |
| Blessures | 17 zones typées | **repris** → carte du corps cliquable, § 8 unvicies |

Le questionnaire d'entrée — objectifs notés, accès matériel, blessures par zone,
sommeil, stress, alimentation, disponibilités heure par heure, motivation,
craintes — n'est plus la pièce absente : il a son propre onglet dans l'app
(§ 8 unvicies), porté depuis un Google Forms équivalent que le coach avait
construit à côté d'AppSheet plutôt que depuis les 104 colonnes elles-mêmes. Le
coach compose à partir de contraintes, pas d'un objectif — les blessures et les
créneaux pèsent plus lourd que « prise de masse ».

### Deux leçons de leurs données

**Le préfixe numérique du jour.** `1-Lundi`, `2-Mardi` : le tri tombe juste. On a
préféré garder le texte libre et trier par jour de semaine côté serveur, mais le
problème était réel — l'alphabétique plaçait « Jeudi » avant « Lundi ».

**Les colonnes dénormalisées dérivent.** `Programme` et `Séance` sont recopiées dans
chaque table enfant ; elles sont déjà vides pour « GR Bulgare » alors que les liens
par ID sont bons. Le catalogue contient aussi deux « Curl » distincts, un exercice
nommé « Test » et deux lignes vides. À ne pas reproduire : un seul identifiant fait
foi, jamais de libellé recopié.
