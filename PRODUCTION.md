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
| AppSheet | ~205 $/mois | app statique + Firestore |
| Passerelle SMS (Twilio, Brevo) | quelques centimes par message | liens `sms:`, `wa.me`, `mailto:` |
| Hébergement d'images | facturé au stockage | photos encodées en base64 dans un document Firestore |
| Serveur applicatif | coût et administration | GitHub Pages, sans backend du tout — la sécurité tient aux Security Rules |
| Cloud Functions | palier payant (plan Blaze) | tout ce qui aurait mérité un déclencheur serveur (compteurs, agrégats) est soit écrit par le client lui-même en fin de geste, soit recalculé à la lecture |

Ce qu'on utilise est gratuit sans plafond gênant à cette échelle : GitHub Pages,
Firebase (Firestore + Authentication, plan **Spark**), Google Identity via Firebase Auth.

L'app a tourné sur Google Apps Script + Google Sheets jusqu'à l'été 2026 — la
latence incompressible d'Apps Script (0,5 à 2 s par appel, voir l'ancienne section
« local-first » au § 6) a fait basculer vers Firestore, qui apporte la synchro
hors-ligne native en prime. Le classeur Google Sheets et `apps-script/` sont
conservés en **archive passive** : plus aucun trafic ne les touche, rien n'y est
supprimé. Détail du chantier et des décisions actées : `git log` sur la branche
`firestore`, chaque commit explique un « pourquoi ».

### Le vrai plafond restant

**Quota de messagerie Google** : environ 100 destinataires par jour sur un compte
gratuit — pertinent seulement pour le second projet Apps Script autonome dédié à
l'e-mail (§ 7), le seul bout d'Apps Script qui subsiste. Le classeur Sheets, lui,
n'a plus de plafond qui compte : il n'est plus lu.

Firestore lui-même n'a pas de plafond gênant à l'échelle visée (~40 pratiquants) :
pas de limite de lignes façon tableur, chaque document plafonné à 1 Mo (une photo
encodée en base64 tient large dans ce budget).

---

## 2. Le second principe

> **Rien ne part vers un pratiquant sans un geste du coach.**

Jérémy est auto-entrepreneur : l'app lui fait gagner du temps, elle ne parle jamais à
sa place. Aucune relance automatique, aucune notification sortante.

Le bouton **Prévenir** compose le message, le coach choisit le canal et l'envoie —
WhatsApp, SMS et e-mail par lien `mailto:` fonctionnent déjà. Un envoi direct depuis
le compte du coach (l'ancien `rapportHebdo`/`notifierMail`) reste à construire : voir
§ 7. Le rapport hebdomadaire d'assiduité, lui, change de forme dans ce chantier —
plus un envoi automatique à surveiller, mais un écran de tableau de bord du coach à
consulter à la demande (non encore construit ; l'assiduité par pratiquant, elle,
est déjà là sur chaque fiche).

---

## 3. Le troisième principe

> **Le dépôt est public, les données du coach et des pratiquants sont privées.**

| Contenu | Où |
|---|---|
| Code, catalogue d'exercices, méthodes publiquement documentées | dépôt |
| Programmes écrits par le coach, contenus achetés, données des pratiquants | **Firestore seul**, protégé par les Security Rules |

Un nom d'exercice n'appartient à personne ; un agencement de séries et de
progressions est un produit. Les illustrations de docteur-fitness et les tableaux de
la méthode Lafay ont été écartés pour cette raison. `free-exercise-db`, sous
*Unlicense*, a fourni les 171 exercices et leurs images.

Le gabarit `modele-import.xlsx` sert de sas : le coach y compose un programme, les
exercices désignés par leur nom (aucun identifiant à manipuler), puis l'importe
directement depuis `Réglages ▸ Importer un programme` — lu par SheetJS dans le
navigateur, écrit dans Firestore. Rien ne transite par le dépôt, et l'ancien
aller-retour par un onglet du classeur Google a disparu avec Sheets : c'est
maintenant un import de fichier, pas un copier-coller.

---

## 4. Ce qui est construit

### Pour le pratiquant

Accueil qui annonce la prochaine séance et l'avancement du programme, sans le détail
des exercices, plus un bandeau de la semaine (lundi à dimanche : quel jour de
programme tombe où, déjà fait ou non) et un planning personnel pour les engagements
extérieurs récurrents (chaque semaine à jour fixe, ou une date ponctuelle) — visible aussi
par le coach sur la fiche du pratiquant, et reporté dans le bandeau comme dans le
calendrier. Les deux grilles nomment ce qu'elles montrent au lieu d'un point :
« Séance 2 », « Arts martiaux », en rouge pour ce que le coach a prescrit et dans
l'encre du texte pour ce que le pratiquant a posé, plein quand ça a eu lieu et en
contour quand c'est encore prévu. Séance en blocs, avec supersets, cadence en
courbe, exercices au temps, et deux minuteurs distincts — pause dans le bloc, repos
de fin de tour — enchaînés automatiquement depuis la saisie, ou lançables à la main
depuis une rangée de chronos en haut de la séance, qui reprend les durées du jour. Charge ajustable par le pratiquant lui-même, qui prime sur celle du
coach. Une pastille par **ligne de programme** compte les séries faites et sert de
raccourci : appui court pour en valider une de plus aux valeurs par défaut, appui
long pour remplir les séries restantes d'un coup. Le compteur s'arrête à la
consigne du coach, et deux lignes du même exercice dans un bloc restent
indépendantes — le pratiquant valide l'une puis l'autre. Sorties partielles à tous les niveaux :
clore un exercice entamé, clore la séance, ou ne rien clore. Calendrier, courbes de
progression, activités libres hors programme. Commentaires attachés à chaque
exercice.

### Pour le coach

Accueil listant les athlètes avec statut, programme et barre d'assiduité. Fiche avec
contacts WhatsApp, appel et e-mail, statut, historique des programmes, planning
personnel déclaré par le pratiquant et suivi de paiement. Bibliothèque de 171
exercices. Modèles génériques réutilisables, rangés par catégorie puis par
difficulté, importables depuis un fichier Excel. Attribution datée avec durée et fin prévue pilotables, le même modèle
pouvant être redonné. Les séances du programme se déroulent au calendrier, où
chacune peut être déplacée ou annulée par l'athlète, supprimée par le coach —
sans que le rythme des suivantes ne bouge. Éditeur de programme avec glisser-déposer. Notes sur les
exercices, visibles du pratiquant. Écran Réglages avec l'attribution des rôles pour l'admin — coach et admin, donnés
ou retirés compte par compte, jamais sur soi-même. Réglages par ailleurs réduit à
l'import de programme
depuis la migration Firestore — les opérations de maintenance du classeur
(catalogue de départ, jeu d'essai...) n'ont plus de raison d'être, ce travail est
fait une fois par `scripts/seed.mjs`.

### Sous le capot

Authentification Firebase (Google), cloisonnement par email issu du jeton — vérifié
par les Firestore Security Rules à chaque lecture et écriture, plus de routeur
serveur entre le SDK et la base : une règle mal écrite serait une faille immédiate,
pas un bug discret, d'où les règles écrites avant tout portage et jamais élargies à
la légère. Mode hors ligne natif : `persistentLocalCache` sert les lectures depuis
le cache et rejoue les écritures au retour du réseau, sans file ni identifiant
provisoire à gérer à la main — la file maison qui faisait ce travail a disparu avec
elle. Aucune migration de schéma à faire : Firestore n'a pas de colonnes, un champ
absent se lit simplement comme absent.

---

## 5. Avant d'ouvrir aux 40

Par ordre de nécessité.

1. **Passer l'écran de consentement Google (Firebase Auth) en Production.** En mode
   Test, deux comptes seulement, et l'app n'est pas présentable à un inconnu. C'est
   le point bloquant absolu, pas encore fait.
2. **Saisir les vrais programmes de Jérémy.** Le catalogue est déjà le vrai (171
   exercices, seedé une fois). L'outil existe maintenant : `Réglages ▸ Importer un
   programme`, depuis `modele-import.xlsx` rempli.
3. **Éprouver l'app en salle**, téléphone en main, sur plusieurs séances réelles —
   en cours à l'écriture de ces lignes.
4. **Construire l'écran de tableau de bord** qui remplace l'ancien rapport
   hebdomadaire par e-mail (§ 2) — pas commencé.
5. **Décider du sort des données** quand un pratiquant part : le statut *Archivé*
   conserve tout, ce qui est le bon défaut, mais il faudra pouvoir exporter et
   supprimer sur demande.

---

## 6. Les idées gardées

### Le local-first — obsolète, résolu autrement

Cette section proposait de construire à la main un magasin local (un seul appel
`snapshot`, cache en mémoire, file d'écriture, réconciliation entre appareils) pour
contourner les 0,5 à 2 s incompressibles de chaque appel Apps Script. La migration
vers Firestore (résumée au § 1) a rendu cette idée sans objet : `persistentLocalCache`
fait exactement ce travail, en natif, gratuitement, et mieux — synchro hors ligne
réelle plutôt qu'un cache qui se périme. Rien de ce qui suivait dans cette section
n'a de sens à construire.

### Finitions de performance, non faites

- **Précharger l'intention** : charger la fiche du premier athlète pendant que la
  liste s'affiche, préparer le jour suivant à l'ouverture d'une séance.
- **Squelettes de chargement** plutôt qu'un « Chargement… ».
- **Dénormaliser le volume/nombre de séries** sur le document de séance plutôt que de
  les recalculer depuis la sous-collection `series` à chaque ouverture du calendrier
  — actuellement une lecture par séance affichée, borné mais pas gratuit.

### Fonctionnalités en attente

- **Le pratiquant ajuste plus que la charge** — les répétitions, par exemple.
- **Notification au coach lors d'un record battu** — dans l'app, pas par message.
- **Export PDF du bilan mensuel** — `DocumentApp` n'est plus disponible sans un
  Apps Script dédié (donc un aller-retour réseau de plus) ; une lib JS côté client
  (jsPDF ou équivalent) est la piste la plus simple maintenant.
- **Comparaison entre pratiquants** suivant le même modèle.
- **Archivage annuel** des séries — moins urgent qu'avec un classeur : Firestore n'a
  pas de plafond de lignes comparable, voir § 1.
- **Photos ailleurs qu'en base64 dans Firestore** au-delà de cent pratiquants ; à ce
  volume le document reste largement sous la limite de 1 Mo.
- **Envoi d'e-mail direct depuis le compte du coach** (§ 7) — le second projet Apps
  Script autonome n'est pas construit ; le lien `mailto:` reste le repli qui marche
  déjà.

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
| `clasp run` | exigeait d'élargir l'accès à tous les classeurs du coach ; n'a plus d'objet, l'écran Réglages n'appelle plus Apps Script |
| Cloud Functions (plan Blaze) | ferait tomber certains calculs à un aller-retour serveur, mais casse la gratuité. Les Security Rules et quelques agrégats dénormalisés par le client (§ 6) couvrent le besoin sans y toucher |

**Déjà fait, pas « à ne pas faire » : quitter Apps Script/Sheets comme backend
principal.** Ce que cette ligne écartait par prudence (« casserait la gratuité »)
s'est avéré faux à l'usage : Firestore reste sur le plan Spark, gratuit, et la
latence tombe sous la seconde. Seul un second projet Apps Script autonome, sans
classeur, dédié uniquement à l'envoi d'e-mail depuis le compte du coach, reste dans
les tuyaux — pas construit, le lien `mailto:` fait l'affaire en attendant (§ 6).

---

## 8. Coordonnées

| | |
|---|---|
| App | https://grapinatpwts-crypto.github.io/coaching-musculation/ |
| Dépôt | `grapinatpwts-crypto/coaching-musculation` (public) |
| Projet Firebase | `coaching-musculation-f0c1c` (plan Spark), Firestore en `europe-west9` |
| Ancien classeur Sheets + `apps-script/` | archive passive, privé, propriété du coach — plus aucun trafic ne les touche |
| Coach | Jérémy — Wellness Sport Club, Lyon Confluence |
| Documentation technique | `PROJET.md` |
| Gabarit d'import | `modele-import.xlsx` |
