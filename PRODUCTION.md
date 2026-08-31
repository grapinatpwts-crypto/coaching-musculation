# Coaching Fitness — la route vers la production

Ce document sert à deux choses : garder la mémoire des décisions prises, et tenir la
liste de ce qui reste avant d'ouvrir aux 40 pratiquants. `PROJET.md` décrit **comment
l'app fonctionne** ; celui-ci dit **pourquoi elle est ainsi, et où elle va**.

---

## 1. La contrainte qui décide de tout

> **Gratuit. Aucun coût récurrent, aucun coût par utilisateur.**

C'est cette règle qui a écarté AppSheet — 205 $ par mois à 41 utilisateurs — et c'est
elle qui doit continuer à trancher les arbitrages. Confirmée explicitement.

Elle a déjà écarté, et continue d'écarter :

| Écarté | Pourquoi | Ce qu'on fait à la place |
|---|---|---|
| AppSheet | ~205 $/mois | app statique + Apps Script |
| Passerelle SMS (Twilio, Brevo) | quelques centimes par message | liens `sms:`, `wa.me`, `mailto:` |
| Hébergement d'images | facturé au stockage | photos encodées dans le classeur |
| Serveur applicatif | coût et administration | GitHub Pages + Apps Script |

Ce qu'on utilise est gratuit sans plafond gênant à cette échelle : GitHub Pages,
Google Apps Script, Google Sheets, Google Identity Services.

### Les deux vrais plafonds

**Quota de messagerie Google** : environ 100 destinataires par jour sur un compte
gratuit. Sans objet ici, puisque rien ne part automatiquement.

**Le classeur** : confortable jusqu'à ~50 000 lignes de séries. À 40 pratiquants et
3 séances par semaine, cela laisse plusieurs années. Un archivage annuel suffira.

---

## 2. Le second principe

> **Rien ne part vers un pratiquant sans un geste du coach.**

Jérémy est auto-entrepreneur : l'app lui fait gagner du temps, elle ne parle jamais à
sa place. Aucune relance automatique, aucune notification sortante.

Le bouton **Prévenir** compose le message, le coach choisit le canal et l'envoie.
`rapportHebdo` fait exception mais n'écrit **qu'au coach lui-même** : il alimente sa
décision, il ne la prend pas.

---

## 3. Le troisième principe

> **Le dépôt est public, le classeur est privé.**

| Contenu | Où |
|---|---|
| Code, catalogue d'exercices, méthodes publiquement documentées | dépôt |
| Programmes écrits par le coach, contenus achetés, données des pratiquants | **classeur seul** |

Un nom d'exercice n'appartient à personne ; un agencement de séries et de
progressions est un produit. Les illustrations de docteur-fitness et les tableaux de
la méthode Lafay ont été écartés pour cette raison. `free-exercise-db`, sous
*Unlicense*, a fourni les 171 exercices et leurs images.

L'onglet **Import** du classeur sert de sas : on y colle un programme composé dans un
tableur, `Réglages ▸ Importer la feuille` en fait un modèle. Rien ne transite par le
dépôt. Gabarit : `modele-import.xlsx`.

---

## 4. Ce qui est construit

### Pour le pratiquant

Accueil qui annonce la prochaine séance et l'avancement du programme, sans le détail
des exercices. Séance en blocs, avec supersets, cadence en courbe, exercices au temps,
et deux minuteurs distincts — pause dans le bloc, repos de fin de tour. Charge
ajustable par le pratiquant lui-même, qui prime sur celle du coach. Sorties partielles
à tous les niveaux : clore un exercice entamé, clore la séance, ou ne rien clore.
Calendrier, courbes de progression, activités libres hors programme. Commentaires
attachés à chaque exercice.

### Pour le coach

Accueil listant les athlètes avec statut, programme et barre d'assiduité. Fiche avec
contacts WhatsApp, appel et e-mail, statut, historique des programmes et suivi de
paiement. Bibliothèque de 171 exercices. Modèles génériques réutilisables, rangés par
catégorie puis par difficulté. Attribution datée, le même modèle pouvant être redonné.
Éditeur de programme avec glisser-déposer. Notes sur les exercices, visibles du
pratiquant. Écran Réglages qui remplace le menu du classeur, absent sur mobile.

### Sous le capot

Authentification Google vérifiée côté serveur, cloisonnement par email issu du jeton.
Mode hors ligne : lectures en cache, écritures en file rejouée au retour du réseau.
Aucune migration obligatoire — onglets et colonnes se créent au premier usage.

---

## 5. Avant d'ouvrir aux 40

Par ordre de nécessité.

1. **Passer l'écran OAuth en Production.** En mode Test, deux comptes seulement, et la
   session expire à 7 jours. C'est le point bloquant absolu.
2. **Saisir le vrai catalogue** et les vrais programmes de Jérémy.
3. **Éprouver l'app en salle**, téléphone en main, sur plusieurs séances réelles.
4. **Activer le déclencheur hebdomadaire** sur `rapportHebdo`.
5. **Décider du sort des données** quand un pratiquant part : le statut *Archivé*
   conserve tout, ce qui est le bon défaut, mais il faudra pouvoir exporter et
   supprimer sur demande.

---

## 6. Les idées gardées

### Le local-first — la vraie réponse à la lenteur

**L'état actuel.** Trois leviers ont été posés : un aller-retour par écran via
l'action `lot`, le cache de tous les onglets côté serveur, et l'affichage immédiat
depuis la copie locale. Un changement d'écran devrait tomber sous les 300 ms dans le
cas courant, et à zéro sur un retour.

**Le plafond restant.** Chaque invocation d'Apps Script coûte 0,5 à 2 secondes,
quoi qu'on y mette. C'est incompressible tant qu'on l'appelle.

**L'idée.** Un seul appel `snapshot` à la connexion rapatrie tout ce dont le rôle a
besoin — pour le coach : athlètes, programmes, modèles, catalogue ; pour le
pratiquant : son programme, son historique. Environ 300 ko, une à deux secondes
**une fois**. Ensuite toute la navigation est locale, et les écritures partent en
arrière-plan par la file déjà construite.

**Ce qui existe déjà et sert de fondation** : la file d'attente hors ligne, le cache
de lecture dans `localStorage`, la table de péremption, l'affichage immédiat.

**Ce qu'il resterait à faire** : un vrai magasin en mémoire, un numéro de version pour
détecter qu'un autre appareil a écrit, et la réconciliation quand deux appareils
divergent.

**Quand.** À l'ouverture aux 40 pratiquants. C'est là qu'il prend son sens, et il vaut
mieux le construire sur la base déjà optimisée. Coût : zéro, tout est côté client.

### Finitions de performance, non faites

- **Précharger l'intention** : charger la fiche du premier athlète pendant que la
  liste s'affiche, préparer le jour suivant à l'ouverture d'une séance.
- **Catalogue versionné en local** : 38 ko qu'on ne retélécharge que s'ils ont changé.
- **Squelettes de chargement** plutôt qu'un « Chargement… ».

### Fonctionnalités en attente

- **Le pratiquant ajuste plus que la charge** — les répétitions, par exemple.
- **Notification au coach lors d'un record battu** — dans l'app, pas par message.
- **Export PDF du bilan mensuel** via `DocumentApp`, gratuit.
- **Comparaison entre pratiquants** suivant le même modèle.
- **Archivage annuel** des séries.
- **Photos hors du classeur** au-delà de cent pratiquants ; d'ici là le classeur suffit.

### Le sujet Eric Flag

Ses blocs 0 à 4 ont fourni du **vocabulaire** — suspensions actives, travail
d'omoplates, négatives, assistances élastiques — versé au catalogue. Sa
**programmation** n'a pas été reprise : c'est son produit. Si Jérémy ou vous vouliez
la proposer à des pratiquants, c'est une licence à négocier avec lui.

L'idée de lui présenter l'app reste ouverte, et son format de séance montre exactement
ce qu'un auteur de programmes attend d'un outil.

---

## 7. Ce qu'on ne fera pas

| | Pourquoi |
|---|---|
| Messagerie intégrée | un canal de plus à surveiller ; les commentaires sur exercice couvrent le besoin, attachés à leur contexte |
| Suivi nutritionnel | hors du métier de ce coach |
| SMS automatiques | payant, et contraire au principe du § 2 |
| `clasp run` | exigeait d'élargir l'accès à tous les classeurs du coach ; l'écran Réglages couvre le besoin |
| Quitter Apps Script | ferait tomber la latence à 50 ms, mais casse la gratuité et l'absence de serveur à administrer. À ne rouvrir que si l'app dépasse largement son cadre |

---

## 8. Coordonnées

| | |
|---|---|
| App | https://grapinatpwts-crypto.github.io/coaching-musculation/ |
| Dépôt | `grapinatpwts-crypto/coaching-musculation` (public) |
| Classeur | privé, propriété du coach |
| Coach | Jérémy — Wellness Sport Club, Lyon Confluence |
| Documentation technique | `PROJET.md` |
| Gabarit d'import | `modele-import.xlsx` |
