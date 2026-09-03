#!/usr/bin/env node
/**
 * Génère `difficultes-exercices.json` : une difficulté d'exécution pour chacun des
 * 171 exercices du catalogue. Exécuté à la demande, jamais en production.
 *
 * Deux provenances, et le fichier produit le dit pour chaque exercice :
 *
 *  - `free-exercise-db` (109 exercices) — le champ `level` de la base d'origine
 *    (yuhonas/free-exercise-db, Unlicense), déjà la source des photos du catalogue.
 *    La correspondance est exacte, pas approximative : l'URL de photo déjà stockée
 *    contient l'identifiant source (`.../exercises/<Identifiant>/0.jpg`), on lit
 *    `level` sur cet identifiant. Aucun rapprochement de noms.
 *
 *  - `projet` (62 exercices) — les exercices au poids du corps rédigés pour ce
 *    projet, absents de la base d'origine (ni photo ni nom anglais). Ils sont
 *    classés à la main dans la table ci-dessous, selon une règle simple : une
 *    variante vaut un cran de plus que le mouvement de base (négatives et
 *    élastiques en dessous du mouvement complet, lesté et explosif au-dessus).
 *    C'est un jugement, pas une donnée sourcée — d'où le `source: 'projet'`, pour
 *    qu'on sache lesquels relire.
 *
 * Usage :
 *   node generer-difficultes.mjs                    # télécharge la base d'origine
 *   node generer-difficultes.mjs --source ex.json   # ou lit une copie locale
 */
import vm from 'node:vm';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');
const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

/** Les trois niveaux, dans l'ordre, tels qu'ils s'afficheront dans l'app. */
const NIVEAUX = { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' };

/**
 * Les 62 exercices maison. Progressions de callisthénie pour l'essentiel : le nom
 * dit le niveau, une suspension passive n'est pas un front lever.
 */
const DIFFICULTES_PROJET = {
  // Entrées de progression : suspensions, appuis, amplitudes partielles
  'Suspension passive': 'Débutant',
  'Suspension active': 'Débutant',
  'Suspension horizontale active': 'Débutant',
  "Tractions d'omoplates": 'Débutant',
  "Rows d'omoplates": 'Débutant',
  "Pompes d'omoplates": 'Débutant',
  "Dips d'omoplates": 'Débutant',
  'Support actif aux dips': 'Débutant',
  'Support actif en pompes': 'Débutant',
  'Pompes sur les genoux': 'Débutant',
  'Pompes surélevées': 'Débutant',
  'Rowing horizontal pronation': 'Débutant',
  'Rowing horizontal supination': 'Débutant',
  'Gainage bras tendus': 'Débutant',
  'Relevé de jambes au sol': 'Débutant',
  'Pont fessier au sol': 'Débutant',
  'Pont en table': 'Débutant',
  'Chaise au mur': 'Débutant',
  'Montées de genoux': 'Débutant',
  'Squat profond': 'Débutant',
  'Squats serrés': 'Débutant',
  'Crunch croisé debout': 'Débutant',
  'Burpee': 'Débutant',
  'Hip thrust à la machine': 'Débutant',
  'Fente sur Smith machine': 'Débutant',

  // Le mouvement complet, ou une variante qui demande de le tenir
  'Traction prise neutre': 'Intermédiaire',
  'Traction tempo': 'Intermédiaire',
  'Négatives de traction': 'Intermédiaire',
  'Tractions avec élastique': 'Intermédiaire',
  'Rowing horizontal à un bras': 'Intermédiaire',
  'Négatives de pompes': 'Intermédiaire',
  'Pompes piquées': 'Intermédiaire',
  'Support actif en pompes piquées': 'Intermédiaire',
  'Pompes sautées': 'Intermédiaire',
  'Pompes archer': 'Intermédiaire',
  'Négatives de dips': 'Intermédiaire',
  'Dips avec élastique': 'Intermédiaire',
  'Dips sur barre droite': 'Intermédiaire',
  'Dips explosifs': 'Intermédiaire',
  'Tuck L-sit': 'Intermédiaire',
  'Hollow body': 'Intermédiaire',
  'Essuie-glace': 'Intermédiaire',
  'Relevé de genoux suspendu': 'Intermédiaire',
  'Gainage dynamique': 'Intermédiaire',
  'Fentes sautées': 'Intermédiaire',
  'Leg curl nordique': 'Intermédiaire',
  'Squat pistolet assisté': 'Intermédiaire',
  'Squat pistolet surélevé': 'Intermédiaire',
  'Squats archer': 'Intermédiaire',
  'Skin the cat': 'Intermédiaire',
  'Équilibre au mur': 'Intermédiaire',
  'Soulevé de terre roumain aux haltères': 'Intermédiaire',
  'Zercher squat': 'Intermédiaire',

  // Ce qui suppose déjà de maîtriser le mouvement complet
  'Traction lestée': 'Expert',
  'Tractions explosives': 'Expert',
  'Front lever': 'Expert',
  'Back lever': 'Expert',
  'Pompes à un bras': 'Expert',
  'Planche gymnique': 'Expert',
  'L-sit': 'Expert',
  'Dragon flag': 'Expert',
  'Squat pistolet': 'Expert'
};

function extraire(fichierRelatif, ...noms) {
  const src = readFileSync(path.join(REPO, fichierRelatif), 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  new vm.Script(src, { filename: fichierRelatif }).runInContext(sandbox);
  return vm.runInContext(`({ ${noms.join(', ')} })`, sandbox);
}

async function baseOrigine() {
  const i = process.argv.indexOf('--source');
  if (i !== -1 && process.argv[i + 1]) {
    console.log(`Base d'origine : ${process.argv[i + 1]} (copie locale)`);
    return JSON.parse(readFileSync(process.argv[i + 1], 'utf8'));
  }
  console.log(`Base d'origine : ${SOURCE_URL}`);
  const r = await fetch(SOURCE_URL);
  if (!r.ok) throw new Error(`Téléchargement impossible (${r.status})`);
  return r.json();
}

const { CATALOGUE_DEPART } = extraire('apps-script/Catalogue.js', 'CATALOGUE_DEPART');
const base = await baseOrigine();
const niveauParId = {};
base.forEach(e => { niveauParId[e.id] = e.level; });

const sortie = {};
const sansDifficulte = [];
let depuisBase = 0, depuisProjet = 0;

CATALOGUE_DEPART.forEach(c => {
  const nom = String(c[0]).trim();
  const identifiantSource = (/\/exercises\/([^/]+)\//.exec(c[5] || '') || [])[1];
  const niveau = identifiantSource && niveauParId[identifiantSource];

  if (niveau && NIVEAUX[niveau]) {
    sortie[nom] = { difficulte: NIVEAUX[niveau], source: 'free-exercise-db' };
    depuisBase++;
  } else if (DIFFICULTES_PROJET[nom]) {
    sortie[nom] = { difficulte: DIFFICULTES_PROJET[nom], source: 'projet' };
    depuisProjet++;
  } else {
    sansDifficulte.push(nom);
  }
});

if (sansDifficulte.length) {
  console.error(`\n${sansDifficulte.length} exercice(s) sans difficulté — complétez DIFFICULTES_PROJET :`);
  sansDifficulte.forEach(n => console.error('  -', n));
  process.exit(1);
}

const chemin = path.join(__dirname, 'difficultes-exercices.json');
writeFileSync(chemin, JSON.stringify(sortie, null, 2) + '\n');

const compte = {};
Object.values(sortie).forEach(v => { compte[v.difficulte] = (compte[v.difficulte] || 0) + 1; });
console.log(`\n${Object.keys(sortie).length} exercices : ${depuisBase} depuis free-exercise-db, ${depuisProjet} classés pour le projet.`);
console.log('Répartition :', Object.entries(compte).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`Écrit dans ${path.relative(REPO, chemin)}`);
