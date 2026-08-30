/**
 * CATALOGUE DE DÉPART — 97 exercices en français, illustrés.
 *
 * Source des données et des images : free-exercise-db (github.com/yuhonas/free-exercise-db),
 * publié sous Unlicense, c'est-à-dire versé au domaine public : réutilisation libre,
 * y compris commerciale, sans attribution obligatoire.
 * Noms, groupes, équipements et consignes ont été rédigés en français pour ce projet ;
 * le nom d'origine est conservé, c'est souvent lui qu'on lit sur les machines.
 *
 * L'import n'écrase jamais : un exercice dont le NOM existe déjà voit seulement ses
 * champs vides complétés. Les identifiants continuent la numérotation.
 *
 * [nom, groupe, équipement, nom d'origine, consigne, photo]
 */
const CATALOGUE_DEPART = [
  ["Développé couché", "Pectoraux", "Barre", "Barbell Bench Press - Medium Grip",
   "Omoplates serrées et basses, pieds ancrés au sol. La barre descend au niveau des tétons, coudes à 45° du buste.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg"],
  ["Développé incliné à la barre", "Pectoraux", "Barre", "Barbell Incline Bench Press - Medium Grip",
   "Banc à 30°. La barre descend haut sur la poitrine, sous les clavicules.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg"],
  ["Développé décliné à la barre", "Pectoraux", "Barre", "Decline Barbell Bench Press",
   "Banc décliné, jambes bien calées. Amplitude plus courte qu'au couché, ne pas rebondir sur le thorax.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/0.jpg"],
  ["Développé couché aux haltères", "Pectoraux", "Haltère", "Dumbbell Bench Press",
   "Amplitude plus grande qu'à la barre. Les haltères descendent au niveau des pectoraux sans se toucher en haut.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg"],
  ["Développé incliné aux haltères", "Pectoraux", "Haltère", "Incline Dumbbell Press",
   "Banc à 30°, poignets neutres. Ne pas verrouiller les coudes en haut pour garder la tension.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg"],
  ["Écarté couché aux haltères", "Pectoraux", "Haltère", "Dumbbell Flyes",
   "Coudes légèrement fléchis et bloqués dans cet angle. Descendre jusqu'à l'étirement, jamais plus bas que le banc.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg"],
  ["Écarté incliné aux haltères", "Pectoraux", "Haltère", "Incline Dumbbell Flyes",
   "Même geste que l'écarté couché, banc à 30°, pour le faisceau claviculaire.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Flyes/0.jpg"],
  ["Écarté à la poulie haute", "Pectoraux", "Poulie", "Cable Crossover",
   "Buste légèrement penché, un pied devant. Les mains se rejoignent devant le bassin, contraction marquée une seconde.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg"],
  ["Pec-deck", "Pectoraux", "Machine", "Butterfly",
   "Dos plaqué au dossier, coudes à hauteur d'épaules. Fermer sans claquer les bras l'un contre l'autre.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Butterfly/0.jpg"],
  ["Pompes", "Pectoraux", "Poids de corps", "Pushups",
   "Corps aligné des chevilles aux épaules, abdos gainés. Coudes à 45°, pas écartés à 90°.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg"],
  ["Pull-over à l'haltère", "Pectoraux", "Haltère", "Bent-Arm Dumbbell Pullover",
   "Allongé sur le banc, bassin bas. Descendre l'haltère derrière la tête sans cambrer, coudes semi-fléchis.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent-Arm_Dumbbell_Pullover/0.jpg"],
  ["Dips pectoraux", "Pectoraux", "Poids de corps", "Dips - Chest Version",
   "Buste penché en avant, coudes écartés. Descendre jusqu'à ce que les épaules passent sous les coudes.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Chest_Version/0.jpg"],
  ["Soulevé de terre", "Dos", "Barre", "Barbell Deadlift",
   "Barre contre les tibias, dos plat, épaules au-dessus de la barre. Pousser dans le sol plutôt que tirer avec les bras.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg"],
  ["Soulevé de terre sumo", "Dos", "Barre", "Sumo Deadlift",
   "Pieds très écartés, mains à l'intérieur des genoux. Buste plus vertical qu'au soulevé classique.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sumo_Deadlift/0.jpg"],
  ["Soulevé de terre roumain", "Dos", "Barre", "Romanian Deadlift",
   "Jambes quasi tendues, bassin qui recule. La barre frôle les cuisses, on descend jusqu'à l'étirement des ischios.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg"],
  ["Rack pull", "Dos", "Barre", "Rack Pulls",
   "Barre partant des supports à hauteur de genoux. Travaille le haut du mouvement avec des charges lourdes.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Rack_Pulls/0.jpg"],
  ["Rowing barre buste penché", "Dos", "Barre", "Bent Over Barbell Row",
   "Buste à 45°, dos plat. Tirer la barre vers le nombril, coudes le long du corps.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg"],
  ["Rowing barre en supination", "Dos", "Barre", "Reverse Grip Bent-Over Rows",
   "Prise en supination, coudes serrés. Sollicite davantage le bas des dorsaux et les biceps.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Grip_Bent-Over_Rows/0.jpg"],
  ["Rowing haltère un bras", "Dos", "Haltère", "One-Arm Dumbbell Row",
   "Genou et main opposés sur le banc, dos parallèle au sol. Tirer le coude vers la hanche, sans rotation du buste.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg"],
  ["Rowing haltères deux bras", "Dos", "Haltère", "Bent Over Two-Dumbbell Row",
   "Buste penché, un haltère dans chaque main. Serrer les omoplates en fin de tirage.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Two-Dumbbell_Row/0.jpg"],
  ["Rowing assis à la poulie", "Dos", "Poulie", "Seated Cable Rows",
   "Dos droit, buste fixe. Tirer la poignée vers le nombril en ouvrant la poitrine, revenir en contrôlant.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg"],
  ["Rowing T-bar", "Dos", "Machine", "T-Bar Row with Handle",
   "Buste penché, poitrine contre le support si la machine en a un. Tirer vers le bas du sternum.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/T-Bar_Row_with_Handle/0.jpg"],
  ["Tirage vertical prise large", "Dos", "Poulie", "Wide-Grip Lat Pulldown",
   "Buste légèrement en arrière, poitrine ouverte. Amener la barre sous le menton, pas derrière la nuque.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Wide-Grip_Lat_Pulldown/0.jpg"],
  ["Tirage vertical prise serrée", "Dos", "Poulie", "Close-Grip Front Lat Pulldown",
   "Prise neutre serrée. Tirer vers le haut de la poitrine, coudes vers l'arrière.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Front_Lat_Pulldown/0.jpg"],
  ["Tractions pronation", "Dos", "Poids de corps", "Pullups",
   "Prise pronation largeur épaules et demie. Monter jusqu'à ce que le menton dépasse la barre, sans élan.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg"],
  ["Tractions supination", "Dos", "Poids de corps", "Chin-Up",
   "Prise supination largeur épaules. Plus de biceps que la pronation, amplitude complète.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/0.jpg"],
  ["Pull-over à la poulie haute", "Dos", "Poulie", "Straight-Arm Pulldown",
   "Bras tendus, coudes verrouillés. Descendre la barre jusqu'aux cuisses par la seule action des dorsaux.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Straight-Arm_Pulldown/0.jpg"],
  ["Extension lombaire au banc", "Lombaires", "Poids de corps", "Hyperextensions (Back Extensions)",
   "Descendre jusqu'à 90°, remonter à l'alignement sans hyperextension. Le mouvement vient des hanches.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hyperextensions_Back_Extensions/0.jpg"],
  ["Good morning", "Lombaires", "Barre", "Good Morning",
   "Barre sur les trapèzes, genoux souples. Bassin qui recule, dos plat, on descend jusqu'à l'horizontale du buste.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Good_Morning/0.jpg"],
  ["Développé militaire debout", "Épaules", "Barre", "Barbell Shoulder Press",
   "Abdos et fessiers serrés, pas de cambrure. La tête recule légèrement au passage de la barre.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shoulder_Press/0.jpg"],
  ["Développé militaire assis", "Épaules", "Barre", "Seated Barbell Military Press",
   "Dossier vertical, dos plaqué. Amplitude jusqu'au menton, sans à-coup en bas.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Barbell_Military_Press/0.jpg"],
  ["Développé épaules aux haltères", "Épaules", "Haltère", "Dumbbell Shoulder Press",
   "Coudes légèrement en avant du plan du buste. Les haltères se rapprochent en haut sans se cogner.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg"],
  ["Développé Arnold", "Épaules", "Haltère", "Arnold Dumbbell Press",
   "Départ paumes vers soi, rotation progressive pendant la montée. Contrôler la rotation, pas la subir.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Arnold_Dumbbell_Press/0.jpg"],
  ["Élévations latérales", "Épaules", "Haltère", "Side Lateral Raise",
   "Coudes très légèrement fléchis, montée jusqu'à l'horizontale. Ne pas hausser les épaules.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg"],
  ["Élévations latérales à la poulie", "Épaules", "Poulie", "Cable Seated Lateral Raise",
   "Tension constante sur toute l'amplitude, contrairement aux haltères. Un bras à la fois.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Seated_Lateral_Raise/0.jpg"],
  ["Élévations frontales", "Épaules", "Haltère", "Front Dumbbell Raise",
   "Monter jusqu'à hauteur des yeux, sans élan de bassin. Alterner ou simultané.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg"],
  ["Oiseau buste penché", "Épaules", "Haltère", "Reverse Flyes",
   "Buste à 45° ou poitrine sur un banc incliné. Ouvrir les bras en serrant les omoplates.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Flyes/0.jpg"],
  ["Face pull", "Épaules", "Poulie", "Face Pull",
   "Corde à hauteur de visage. Tirer vers le front en écartant les mains, coudes hauts.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg"],
  ["Rowing menton aux haltères", "Trapèzes", "Haltère", "Standing Dumbbell Upright Row",
   "Coudes qui montent avant les mains, jusqu'à hauteur de poitrine. S'arrêter si l'épaule pince.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Dumbbell_Upright_Row/0.jpg"],
  ["Haussements d'épaules à la barre", "Trapèzes", "Barre", "Barbell Shrug",
   "Monter les épaules vers les oreilles, sans rouler. Marquer une seconde en haut.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/0.jpg"],
  ["Haussements d'épaules aux haltères", "Trapèzes", "Haltère", "Dumbbell Shrug",
   "Bras tendus le long du corps, mouvement strictement vertical.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shrug/0.jpg"],
  ["Curl barre", "Biceps", "Barre", "Barbell Curl",
   "Coudes fixes le long du corps, pas de balancier. Descendre en contrôlant jusqu'à l'extension complète.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg"],
  ["Curl à la barre EZ", "Biceps", "Barre EZ", "EZ-Bar Curl",
   "Prise cassée, plus confortable pour les poignets. Mêmes consignes que le curl barre.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Curl/0.jpg"],
  ["Curl haltères", "Biceps", "Haltère", "Dumbbell Bicep Curl",
   "Supination progressive pendant la montée. Alterner les bras ou monter ensemble.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg"],
  ["Curl marteau", "Biceps", "Haltère", "Hammer Curls",
   "Prise neutre maintenue. Cible le brachial et le long supinateur autant que le biceps.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg"],
  ["Curl incliné", "Biceps", "Haltère", "Incline Dumbbell Curl",
   "Banc à 45°, bras pendants. Position d'étirement maximal du biceps, charges légères.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Curl/0.jpg"],
  ["Curl au pupitre", "Biceps", "Barre EZ", "Preacher Curl",
   "Aisselles bien calées sur le pupitre. Ne pas verrouiller les coudes en bas.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/0.jpg"],
  ["Curl concentré", "Biceps", "Haltère", "Concentration Curls",
   "Coude calé contre l'intérieur de la cuisse. Un bras à la fois, contraction marquée en haut.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Concentration_Curls/0.jpg"],
  ["Curl marteau à la poulie", "Biceps", "Poulie", "Cable Hammer Curls - Rope Attachment",
   "Corde à la poulie basse, prise neutre. Tension constante sur toute l'amplitude.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Hammer_Curls_-_Rope_Attachment/0.jpg"],
  ["Développé couché prise serrée", "Triceps", "Barre", "Close-Grip Barbell Bench Press",
   "Mains à largeur d'épaules, coudes serrés contre le buste. La barre descend au bas du sternum.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Barbell_Bench_Press/0.jpg"],
  ["Barre au front", "Triceps", "Barre EZ", "EZ-Bar Skullcrusher",
   "Coudes fixes et pointés vers le plafond. Descendre la barre au front ou juste derrière.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/EZ-Bar_Skullcrusher/0.jpg"],
  ["Extension à la poulie haute", "Triceps", "Poulie", "Triceps Pushdown",
   "Coudes collés au corps. Étendre sans avancer les coudes, revenir jusqu'à 90°.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg"],
  ["Extension nuque à la corde", "Triceps", "Poulie", "Cable Rope Overhead Triceps Extension",
   "Bras au-dessus de la tête, coudes serrés. Position d'étirement de la longue portion.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Rope_Overhead_Triceps_Extension/0.jpg"],
  ["Extension nuque un bras", "Triceps", "Haltère", "Dumbbell One-Arm Triceps Extension",
   "Coude haut et fixe, l'autre main peut le stabiliser. Descendre lentement derrière la nuque.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_One-Arm_Triceps_Extension/0.jpg"],
  ["Dips sur banc", "Triceps", "Poids de corps", "Bench Dips",
   "Mains sur le banc derrière soi, coudes vers l'arrière. Descendre jusqu'à 90° maximum.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/0.jpg"],
  ["Dips triceps", "Triceps", "Poids de corps", "Dips - Triceps Version",
   "Buste vertical, coudes serrés. Version dure : lester avec une ceinture.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_-_Triceps_Version/0.jpg"],
  ["Extension couché à la barre", "Triceps", "Barre", "Lying Triceps Press",
   "Allongé, bras verticaux. Fléchir uniquement les coudes, les bras restent en place.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Triceps_Press/0.jpg"],
  ["Pompes prise serrée", "Triceps", "Poids de corps", "Close-Grip Push-Up off of a Dumbbell",
   "Mains sous les épaules, coudes frôlant les côtes. Gainage maintenu du début à la fin.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Close-Grip_Push-Up_off_of_a_Dumbbell/0.jpg"],
  ["Squat barre", "Jambes", "Barre", "Barbell Squat",
   "Barre sur les trapèzes, pieds largeur d'épaules. Descendre sous la parallèle, genoux dans l'axe des pieds.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg"],
  ["Squat complet", "Jambes", "Barre", "Barbell Full Squat",
   "Descente maximale, talons au sol. Demande de la mobilité de cheville et de hanche.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg"],
  ["Squat avant", "Jambes", "Barre", "Front Barbell Squat",
   "Barre sur les deltoïdes antérieurs, coudes hauts. Buste plus vertical, plus de quadriceps.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Barbell_Squat/0.jpg"],
  ["Box squat", "Jambes", "Barre", "Box Squat",
   "S'asseoir franchement sur la box, marquer un temps, puis repousser. Casse le rebond élastique.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Box_Squat/0.jpg"],
  ["Fente avant à la barre", "Jambes", "Barre", "Barbell Lunge",
   "Grand pas en avant, genou arrière proche du sol. Le buste reste vertical.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Lunge/0.jpg"],
  ["Fente aux haltères", "Jambes", "Haltère", "Dumbbell Lunges",
   "Un haltère dans chaque main. Alterner les jambes ou finir une jambe avant l'autre.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg"],
  ["Fente arrière", "Jambes", "Haltère", "Dumbbell Rear Lunge",
   "Pas vers l'arrière, plus doux pour les genoux que la fente avant.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Rear_Lunge/0.jpg"],
  ["Fente marchée", "Jambes", "Barre", "Barbell Walking Lunge",
   "Enchaîner les pas sans marquer d'arrêt. Cardio et équilibre en plus du travail musculaire.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Walking_Lunge/0.jpg"],
  ["Goblet squat", "Jambes", "Haltère", "Dumbbell Squat",
   "Haltère tenu contre la poitrine. Excellent pour apprendre la descente du squat.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Squat/0.jpg"],
  ["Squat bulgare", "Jambes", "Haltère", "Split Squat with Dumbbells",
   "Pied arrière sur un banc, poids sur la jambe avant. Descendre à la verticale, sans à-coup.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squat_with_Dumbbells/0.jpg"],
  ["Presse à cuisses", "Jambes", "Machine", "Leg Press",
   "Pieds à mi-hauteur de la plateforme. Ne jamais verrouiller les genoux en fin de poussée.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg"],
  ["Leg extension", "Jambes", "Machine", "Leg Extensions",
   "Dos plaqué, mouvement contrôlé. Marquer un temps en haut, contraction du quadriceps.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg"],
  ["Leg curl allongé", "Jambes", "Machine", "Lying Leg Curls",
   "Bassin plaqué au banc. Ne pas décoller les hanches pour tricher sur les dernières répétitions.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg"],
  ["Leg curl assis", "Jambes", "Machine", "Seated Leg Curl",
   "Dos calé, genoux alignés avec l'axe de la machine.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/0.jpg"],
  ["Hack squat à la barre", "Jambes", "Barre", "Barbell Hack Squat",
   "Barre derrière les mollets. Version historique du hack squat, très quadriceps.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hack_Squat/0.jpg"],
  ["Montée sur banc", "Jambes", "Barre", "Barbell Step Ups",
   "Pousser dans le talon de la jambe sur le banc, sans s'aider de la jambe au sol.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Step_Ups/0.jpg"],
  ["Mollets debout", "Mollets", "Machine", "Standing Calf Raises",
   "Amplitude complète, étirement en bas et contraction en haut. Ne pas rebondir.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/0.jpg"],
  ["Mollets assis", "Mollets", "Machine", "Seated Calf Raise",
   "Genoux fléchis : cible le soléaire plutôt que les jumeaux.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg"],
  ["Mollets à la presse", "Mollets", "Machine", "Calf Press On The Leg Press Machine",
   "Avant-pieds au bord de la plateforme, poussée par les orteils.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Calf_Press_On_The_Leg_Press_Machine/0.jpg"],
  ["Hip thrust", "Fessiers", "Barre", "Barbell Hip Thrust",
   "Omoplates sur le banc, menton rentré. Monter jusqu'à l'alignement cuisses-buste, serrer une seconde.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg"],
  ["Pont fessier à la barre", "Fessiers", "Barre", "Barbell Glute Bridge",
   "Dos au sol, même geste que le hip thrust avec moins d'amplitude.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg"],
  ["Pont fessier unilatéral", "Fessiers", "Poids de corps", "Single Leg Glute Bridge",
   "Une jambe tendue en l'air. Le bassin doit rester horizontal.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Single_Leg_Glute_Bridge/0.jpg"],
  ["Kickback à la poulie", "Fessiers", "Poulie", "One-Legged Cable Kickback",
   "Jambe tendue vers l'arrière, sans cambrer le bas du dos. Mouvement court et contrôlé.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Legged_Cable_Kickback/0.jpg"],
  ["Pull through à la poulie", "Fessiers", "Poulie", "Pull Through",
   "Corde entre les jambes, bassin qui recule puis avance. Charnière de hanche pure.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pull_Through/0.jpg"],
  ["Montée sur banc avec relevé de genou", "Fessiers", "Poids de corps", "Step-up with Knee Raise",
   "Monter puis lever le genou opposé. Équilibre et fessiers.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Step-up_with_Knee_Raise/0.jpg"],
  ["Swing kettlebell", "Fessiers", "Kettlebell", "One-Arm Kettlebell Swings",
   "Charnière de hanche, pas un squat. La kettlebell est projetée par les hanches, bras relâchés.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Kettlebell_Swings/0.jpg"],
  ["Gainage face", "Abdominaux", "Poids de corps", "Plank",
   "Corps aligné, bassin en rétroversion. Ne pas creuser le bas du dos, respirer normalement.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg"],
  ["Gainage latéral", "Abdominaux", "Poids de corps", "Side Bridge",
   "Appui sur l'avant-bras et le bord du pied. Hanches hautes, corps en ligne.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Bridge/0.jpg"],
  ["Crunch", "Abdominaux", "Poids de corps", "Crunches",
   "Décoller les omoplates sans tirer sur la nuque. Le bas du dos reste au sol.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg"],
  ["Crunch à la poulie", "Abdominaux", "Poulie", "Cable Crunch",
   "À genoux, corde derrière la nuque. Enrouler le buste, le bassin ne bouge pas.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crunch/0.jpg"],
  ["Relevé de jambes suspendu", "Abdominaux", "Poids de corps", "Hanging Leg Raise",
   "Suspendu à la barre, monter les jambes tendues ou genoux fléchis. Sans balancier.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg"],
  ["Crunch bicyclette", "Abdominaux", "Poids de corps", "Air Bike",
   "Coude vers le genou opposé, jambes en pédalage. Mouvement lent, pas rapide.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Air_Bike/0.jpg"],
  ["Russian twist", "Abdominaux", "Poids de corps", "Russian Twist",
   "Buste incliné en arrière, rotation d'un côté à l'autre. Talons décollés pour durcir.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg"],
  ["Roulette abdominale à genoux", "Abdominaux", "Barre", "Barbell Ab Rollout - On Knees",
   "Dérouler sans creuser le dos. Ne pas aller plus loin que ce que le gainage tient.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Ab_Rollout_-_On_Knees/0.jpg"],
  ["Crunch décliné", "Abdominaux", "Poids de corps", "Decline Crunch",
   "Banc décliné, amplitude plus grande. Contrôler la descente.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Crunch/0.jpg"],
  ["Dead bug", "Abdominaux", "Poids de corps", "Dead Bug",
   "Bras et jambe opposés qui s'éloignent, bas du dos plaqué au sol en permanence.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg"],
  ["Curl poignets", "Avant-bras", "Barre", "Palms-Up Barbell Wrist Curl Over A Bench",
   "Avant-bras sur le banc, paumes vers le haut. Amplitude courte, séries longues.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Up_Barbell_Wrist_Curl_Over_A_Bench/0.jpg"],
  ["Extension poignets", "Avant-bras", "Barre", "Palms-Down Wrist Curl Over A Bench",
   "Paumes vers le bas. Charges légères, le mouvement est petit.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Palms-Down_Wrist_Curl_Over_A_Bench/0.jpg"],
  ["Marche du fermier", "Avant-bras", "Haltère", "Farmer's Walk",
   "Charges lourdes dans chaque main, marcher en restant gainé. Grip, trapèzes et gainage.",
   "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Farmers_Walk/0.jpg"],
];

/**
 * Verse le catalogue de départ dans l'onglet Exercices.
 * Ne modifie jamais une valeur saisie par le coach : sur un exercice déjà présent,
 * seuls les champs restés vides sont complétés.
 */
function importerCatalogue() {
  const existants = lire_(TABS.EXERCICES);
  const parNom = {};
  existants.forEach(function (e) {
    if (e.nom) parNom[String(e.nom).trim().toLowerCase()] = e;
  });

  let max = 0;
  existants.forEach(function (e) {
    const m = /^EX(\d+)$/.exec(String(e.id));
    if (m && Number(m[1]) > max) max = Number(m[1]);
  });

  const CHAMPS = ['nom', 'groupe', 'equipement', 'nom_en', 'consigne', 'photo'];
  const neufs = [];
  let completes = 0;

  CATALOGUE_DEPART.forEach(function (c) {
    const deja = parNom[c[0].trim().toLowerCase()];
    if (deja) {
      const patch = {};
      CHAMPS.forEach(function (champ, i) {
        if (i && !String(deja[champ] || '').trim() && c[i]) patch[champ] = c[i];
      });
      if (Object.keys(patch).length) {
        majLigne_(TABS.EXERCICES, 'id', deja.id, patch);
        completes++;
      }
      return;
    }
    max++;
    const o = { id: 'EX' + String(max).padStart(3, '0'), video: '' };
    CHAMPS.forEach(function (champ, i) { o[champ] = c[i]; });
    neufs.push(o);
  });

  if (neufs.length) ajouterPlusieurs_(TABS.EXERCICES, neufs);

  const msg = [
    neufs.length + ' exercice(s) ajouté(s)',
    completes ? completes + ' complété(s) sans rien écraser' : '',
    (CATALOGUE_DEPART.length - neufs.length - completes) + ' déjà à jour'
  ].filter(Boolean).join(', ') + '.';
  Logger.log(msg);
  return msg;
}

/**
 * Jeu d'essai réaliste pour le coach : un modèle complet, attribué à un
 * pratiquant avec trois semaines d'ancienneté pour que l'avancement soit visible.
 * Les exercices sont retrouvés par leur NOM, pas par leur identifiant : le jeu
 * fonctionne quels que soient les EXnnn attribués à l'import.
 */
const EXEMPLE = {
  modele: {
    nom: 'Prise de masse — Haut / Bas',
    categorie: 'Hypertrophie',
    difficulte: 'Intermédiaire',
    duree_semaines: 8,
    statut: 'Actif',
    description: 'Deux séances par semaine, haut puis bas du corps. Charges en pourcentage du max sur les mouvements lourds, supersets sur le volume.'
  },
  jours: [
    ['Lundi — Haut du corps', [
      { series: 4, repos_s: 150, exercices: [
        ['Développé couché', '8-10', '', 0, 75, '2-0-3-1', 0] ]},
      { series: 3, repos_s: 120, exercices: [
        ['Rowing barre buste penché', '10', '', 0, 70, '2-0-2-0', 30],
        ['Développé militaire debout', '10', '', 0, 65, '2-0-2-0', 0] ]},
      { series: 3, repos_s: 75, exercices: [
        ['Curl barre', '12', '', 25, 0, '2-0-2-0', 20],
        ['Extension à la poulie haute', '12', '', 25, 0, '2-0-2-0', 0] ]}
    ]],
    ['Jeudi — Bas du corps', [
      { series: 5, repos_s: 180, exercices: [
        ['Squat barre', '5', '', 0, 80, '3-1-1-0', 0] ]},
      { series: 3, repos_s: 150, exercices: [
        ['Soulevé de terre roumain', '8', '', 0, 65, '3-0-1-0', 30],
        ['Gainage face', '', 45, 0, 0, '', 0] ]},
      { series: 4, repos_s: 60, exercices: [
        ['Mollets debout', '15', '', 60, 0, '1-1-2-1', 0] ]}
    ]]
  ]
};

/** Crée le modèle d'exemple et l'attribue au compte de test pratiquant. */
function creerExemple_() {
  const rapport = [];

  const noms = {};
  const indexer = function () {
    lire_(TABS.EXERCICES).forEach(function (e) {
      if (e.nom) noms[String(e.nom).trim().toLowerCase()] = String(e.id);
    });
  };
  indexer();
  if (Object.keys(noms).length < 20) { rapport.push(importerCatalogue()); indexer(); }

  let modele = lire_(TABS.MODELES).filter(function (m) {
    return String(m.nom) === EXEMPLE.modele.nom;
  })[0];

  if (!modele) {
    const r = modeleSave_(EXEMPLE.modele);
    modele = { id: r.id };
    rapport.push('Modèle « ' + EXEMPLE.modele.nom + ' » créé');

    EXEMPLE.jours.forEach(function (j) {
      const blocs = j[1].map(function (b) {
        return {
          series: b.series, repos_s: b.repos_s,
          exercices: b.exercices.map(function (e) {
            const id = noms[e[0].toLowerCase()];
            if (!id) throw new Error('EXERCICE_ABSENT_' + e[0]);
            return {
              exercice_id: id, reps_cible: e[1], duree_s: e[2],
              charge_cible: e[3], pct_rm: e[4], cadence: e[5], pause_s: e[6]
            };
          })
        };
      });
      modeleJourSave_({ modele_id: modele.id, jour: j[0], blocs: blocs });
    });
    rapport.push(EXEMPLE.jours.length + ' jours composés');
  } else {
    rapport.push('Modèle déjà présent, laissé tel quel');
  }

  const email = 'guillaume.rapinat@gmail.com';
  if (!findPratiquant_(email)) {
    pratiquantCreer_({ email: email, nom: 'Guillaume Rapinat', telephone: '+33786855433',
                       objectif: 'Être musclé et sec pour mes 40 ans' });
    rapport.push('Pratiquant inscrit');
  }
  pratiquantSave_({ email: email, statut: ETATS.ACTIF });

  const deja = lire_(TABS.ATTRIBUTIONS).filter(function (a) {
    return String(a.email).toLowerCase() === email && String(a.modele_id) === String(modele.id);
  })[0];
  if (!deja) {
    const r = attribuer_({
      email: email, modele_id: modele.id,
      date_debut: new Date(Date.now() - 21 * 86400000).toISOString()
    });
    rapport.push('Programme attribué à Guillaume, ' + r.lignes + ' lignes, démarré il y a 3 semaines');
  } else {
    rapport.push('Programme déjà attribué');
  }

  const msg = rapport.join('\n');
  Logger.log(msg);
  return msg;
}

/**
 * PROGRAMMES TYPES — dix méthodes d'entraînement largement documentées.
 *
 * Un schéma séries × répétitions est une méthode, pas une œuvre : il se reprend
 * librement. Les descriptions ci-dessous sont rédigées pour ce projet, aucune n'est
 * recopiée. L'origine est citée quand la méthode porte le nom de son auteur, par
 * honnêteté et parce que le coach voudra remonter à la source.
 *
 * Ce sont des points de départ à adapter, pas des prescriptions : les pourcentages
 * supposent un max connu, les charges fixes sont laissées à zéro quand elles
 * dépendent trop de la personne.
 *
 * [nom, reps, durée, charge, % du max, cadence, pause]
 */
const PROGRAMMES_TYPES = [
{
  nom: '5×5 débutant', source: 'https://stronglifts.com/5x5/', categorie: 'Force', difficulte: 'Débutant',
  duree_semaines: 12, statut: 'Actif',
  description: "D'après StrongLifts. Trois séances par semaine en alternant A et B, cinq séries de cinq sur les mouvements de base. On ajoute 2,5 kg à chaque séance tant que les cinq séries passent. Le plus court chemin pour un débutant.",
  jours: [
    ['Lundi — Séance A', [
      { series:5, repos_s:180, exercices:[['Squat barre','5','',0,0,'2-0-1-0',0]] },
      { series:5, repos_s:180, exercices:[['Développé couché','5','',0,0,'2-1-1-0',0]] },
      { series:5, repos_s:150, exercices:[['Rowing barre buste penché','5','',0,0,'2-0-1-0',0]] }]],
    ['Mercredi — Séance B', [
      { series:5, repos_s:180, exercices:[['Squat barre','5','',0,0,'2-0-1-0',0]] },
      { series:5, repos_s:180, exercices:[['Développé militaire debout','5','',0,0,'2-0-1-0',0]] },
      { series:1, repos_s:0,   exercices:[['Soulevé de terre','5','',0,0,'1-0-1-0',0]] }]],
    ['Vendredi — Séance A', [
      { series:5, repos_s:180, exercices:[['Squat barre','5','',0,0,'2-0-1-0',0]] },
      { series:5, repos_s:180, exercices:[['Développé couché','5','',0,0,'2-1-1-0',0]] },
      { series:5, repos_s:150, exercices:[['Rowing barre buste penché','5','',0,0,'2-0-1-0',0]] }]]
  ]
},
{
  nom: 'Force 3 jours', source: 'https://startingstrength.com/get-started/programs', categorie: 'Force', difficulte: 'Débutant',
  duree_semaines: 12, statut: 'Actif',
  description: "D'après Starting Strength de Mark Rippetoe. Trois séries de cinq, très peu d'exercices, progression à chaque séance. Encore plus dépouillé que le 5×5 : on apprend les mouvements avant de chercher le volume.",
  jours: [
    ['Lundi — Séance A', [
      { series:3, repos_s:180, exercices:[['Squat barre','5','',0,0,'2-0-1-0',0]] },
      { series:3, repos_s:180, exercices:[['Développé couché','5','',0,0,'2-1-1-0',0]] },
      { series:1, repos_s:0,   exercices:[['Soulevé de terre','5','',0,0,'1-0-1-0',0]] }]],
    ['Mercredi — Séance B', [
      { series:3, repos_s:180, exercices:[['Squat barre','5','',0,0,'2-0-1-0',0]] },
      { series:3, repos_s:180, exercices:[['Développé militaire debout','5','',0,0,'2-0-1-0',0]] },
      { series:3, repos_s:150, exercices:[['Tractions pronation','max','',0,0,'2-0-1-0',0]] }]],
    ['Vendredi — Séance A', [
      { series:3, repos_s:180, exercices:[['Squat barre','5','',0,0,'2-0-1-0',0]] },
      { series:3, repos_s:180, exercices:[['Développé couché','5','',0,0,'2-1-1-0',0]] },
      { series:1, repos_s:0,   exercices:[['Soulevé de terre','5','',0,0,'1-0-1-0',0]] }]]
  ]
},
{
  nom: 'Push Pull Legs', source: 'https://thefitness.wiki/reddit-archive/a-linear-progression-based-ppl-program-for-beginners/', categorie: 'Hypertrophie', difficulte: 'Intermédiaire',
  duree_semaines: 8, statut: 'Actif',
  description: "Trois séances : ce qui pousse, ce qui tire, les jambes. Découpage classique qui laisse 48 h à chaque groupe. Se double facilement en six séances quand le temps le permet.",
  jours: [
    ['Lundi — Push', [
      { series:4, repos_s:150, exercices:[['Développé couché','8-10','',0,72,'2-0-3-1',0]] },
      { series:3, repos_s:120, exercices:[['Développé militaire debout','10','',0,65,'2-0-2-0',0]] },
      { series:3, repos_s:90,  exercices:[['Développé incliné aux haltères','10-12','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:75,  exercices:[['Élévations latérales','15','',0,0,'2-0-2-0',20],
                                          ['Extension à la poulie haute','12','',0,0,'2-0-2-0',0]] }]],
    ['Mercredi — Pull', [
      { series:4, repos_s:150, exercices:[['Rowing barre buste penché','8','',0,70,'2-0-2-0',0]] },
      { series:3, repos_s:120, exercices:[['Tractions pronation','max','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90,  exercices:[['Rowing assis à la poulie','12','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:75,  exercices:[['Face pull','15','',0,0,'2-1-2-0',20],
                                          ['Curl barre','12','',0,0,'2-0-2-0',0]] }]],
    ['Vendredi — Legs', [
      { series:4, repos_s:180, exercices:[['Squat barre','8','',0,72,'3-0-1-0',0]] },
      { series:3, repos_s:150, exercices:[['Soulevé de terre roumain','10','',0,60,'3-0-1-0',0]] },
      { series:3, repos_s:90,  exercices:[['Presse à cuisses','12','',0,0,'2-0-2-0',0]] },
      { series:4, repos_s:60,  exercices:[['Mollets debout','15','',0,0,'1-1-2-1',20],
                                          ['Gainage face','',45,0,0,'',0]] }]]
  ]
},
{
  nom: 'Haut / Bas 4 jours', categorie: 'Hypertrophie', difficulte: 'Intermédiaire',
  duree_semaines: 10, statut: 'Actif',
  description: "Deux hauts, deux bas. Chaque moitié du corps est travaillée deux fois par semaine, ce qui vaut mieux qu'une seule pour progresser. Le meilleur rapport résultat / temps passé pour qui vient quatre fois.",
  jours: [
    ['Lundi — Haut lourd', [
      { series:4, repos_s:180, exercices:[['Développé couché','6','',0,80,'3-1-1-0',0]] },
      { series:4, repos_s:150, exercices:[['Rowing barre buste penché','6','',0,75,'2-0-1-0',0]] },
      { series:3, repos_s:120, exercices:[['Développé militaire debout','8','',0,70,'2-0-2-0',0]] },
      { series:3, repos_s:75,  exercices:[['Curl barre','10','',0,0,'2-0-2-0',20],
                                          ['Barre au front','10','',0,0,'2-0-2-0',0]] }]],
    ['Mardi — Bas lourd', [
      { series:4, repos_s:210, exercices:[['Squat barre','5','',0,82,'3-1-1-0',0]] },
      { series:3, repos_s:180, exercices:[['Soulevé de terre roumain','8','',0,65,'3-0-1-0',0]] },
      { series:3, repos_s:120, exercices:[['Fente aux haltères','10','',0,0,'2-0-1-0',0]] },
      { series:4, repos_s:60,  exercices:[['Mollets debout','12','',0,0,'1-1-2-1',0]] }]],
    ['Jeudi — Haut volume', [
      { series:4, repos_s:120, exercices:[['Développé incliné aux haltères','10-12','',0,0,'2-0-2-0',0]] },
      { series:4, repos_s:120, exercices:[['Tirage vertical prise large','10-12','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:75,  exercices:[['Élévations latérales','15','',0,0,'2-0-2-0',20],
                                          ['Oiseau buste penché','15','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:60,  exercices:[['Curl haltères','12','',0,0,'2-0-2-0',20],
                                          ['Extension nuque à la corde','12','',0,0,'2-0-2-0',0]] }]],
    ['Vendredi — Bas volume', [
      { series:4, repos_s:120, exercices:[['Presse à cuisses','12','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90,  exercices:[['Leg curl allongé','12','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:90,  exercices:[['Hip thrust','12','',0,0,'1-1-2-0',0]] },
      { series:3, repos_s:60,  exercices:[['Mollets assis','15','',0,0,'1-1-2-1',20],
                                          ['Relevé de jambes suspendu','12','',0,0,'2-0-2-0',0]] }]]
  ]
},
{
  nom: 'Full body débutant', source: 'https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/', categorie: 'Remise en forme', difficulte: 'Débutant',
  duree_semaines: 8, statut: 'Actif',
  description: "Tout le corps à chaque séance, trois fois par semaine, sur machines et poids libres légers. Pensé pour quelqu'un qui n'a jamais mis les pieds en salle : peu de charge, beaucoup de répétitions, on installe le geste.",
  jours: [
    ['Lundi — Complet', [
      { series:3, repos_s:90, exercices:[['Goblet squat','12','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90, exercices:[['Développé couché aux haltères','12','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90, exercices:[['Rowing assis à la poulie','12','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:60, exercices:[['Gainage face','',30,0,0,'',0]] }]],
    ['Mercredi — Complet', [
      { series:3, repos_s:90, exercices:[['Presse à cuisses','15','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90, exercices:[['Développé épaules aux haltères','12','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90, exercices:[['Tirage vertical prise large','12','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:60, exercices:[['Crunch','15','',0,0,'2-0-2-0',0]] }]],
    ['Vendredi — Complet', [
      { series:3, repos_s:90, exercices:[['Fente aux haltères','10','',0,0,'2-0-1-0',0]] },
      { series:3, repos_s:90, exercices:[['Pompes','max','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90, exercices:[['Rowing haltère un bras','12','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:60, exercices:[['Gainage latéral','',25,0,0,'',0]] }]]
  ]
},
{
  nom: 'Cycle 5/3/1', source: 'https://thefitness.wiki/routines/5-3-1-for-beginners/', categorie: 'Force', difficulte: 'Avancé',
  duree_semaines: 4, statut: 'Actif',
  description: "D'après la méthode 5/3/1 de Jim Wendler. Un mouvement lourd par séance, en pourcentages d'un max minoré à 90 %. Semaine 1 en 5, semaine 2 en 3, semaine 3 en 5/3/1, semaine 4 allégée. Ce modèle décrit la première semaine ; le max doit être renseigné dans l'onglet Maxis.",
  jours: [
    ['Lundi — Développé militaire', [
      { series:1, repos_s:180, exercices:[['Développé militaire debout','5','',0,65,'2-0-2-0',0]] },
      { series:1, repos_s:180, exercices:[['Développé militaire debout','5','',0,75,'2-0-2-0',0]] },
      { series:1, repos_s:240, exercices:[['Développé militaire debout','max','',0,85,'2-0-2-0',0]] },
      { series:5, repos_s:90,  exercices:[['Dips triceps','10','',0,0,'2-0-2-0',0]] }]],
    ['Mardi — Soulevé de terre', [
      { series:1, repos_s:180, exercices:[['Soulevé de terre','5','',0,65,'1-0-1-0',0]] },
      { series:1, repos_s:180, exercices:[['Soulevé de terre','5','',0,75,'1-0-1-0',0]] },
      { series:1, repos_s:300, exercices:[['Soulevé de terre','max','',0,85,'1-0-1-0',0]] },
      { series:5, repos_s:90,  exercices:[['Good morning','10','',0,0,'3-0-1-0',0]] }]],
    ['Jeudi — Développé couché', [
      { series:1, repos_s:180, exercices:[['Développé couché','5','',0,65,'2-1-1-0',0]] },
      { series:1, repos_s:180, exercices:[['Développé couché','5','',0,75,'2-1-1-0',0]] },
      { series:1, repos_s:240, exercices:[['Développé couché','max','',0,85,'2-1-1-0',0]] },
      { series:5, repos_s:90,  exercices:[['Rowing haltères deux bras','10','',0,0,'2-1-2-0',0]] }]],
    ['Vendredi — Squat', [
      { series:1, repos_s:180, exercices:[['Squat barre','5','',0,65,'3-0-1-0',0]] },
      { series:1, repos_s:180, exercices:[['Squat barre','5','',0,75,'3-0-1-0',0]] },
      { series:1, repos_s:300, exercices:[['Squat barre','max','',0,85,'3-0-1-0',0]] },
      { series:5, repos_s:90,  exercices:[['Leg curl allongé','10','',0,0,'2-1-2-0',0]] }]]
  ]
},
{
  nom: 'Texas Method', categorie: 'Force', difficulte: 'Avancé',
  duree_semaines: 8, statut: 'Actif',
  description: "Trois séances qui ne se ressemblent pas : volume le lundi, récupération le mercredi, record le vendredi. Conçu pour l'intermédiaire qui ne progresse plus à chaque séance et doit raisonner à la semaine.",
  jours: [
    ['Lundi — Volume', [
      { series:5, repos_s:210, exercices:[['Squat barre','5','',0,80,'3-0-1-0',0]] },
      { series:5, repos_s:180, exercices:[['Développé couché','5','',0,80,'2-1-1-0',0]] },
      { series:5, repos_s:150, exercices:[['Rowing barre buste penché','5','',0,0,'2-0-1-0',0]] }]],
    ['Mercredi — Récupération', [
      { series:2, repos_s:150, exercices:[['Squat barre','5','',0,65,'3-0-1-0',0]] },
      { series:3, repos_s:120, exercices:[['Développé militaire debout','5','',0,65,'2-0-2-0',0]] },
      { series:3, repos_s:120, exercices:[['Tractions pronation','max','',0,0,'2-0-2-0',0]] }]],
    ['Vendredi — Intensité', [
      { series:1, repos_s:300, exercices:[['Squat barre','5','',0,92,'3-0-1-0',0]] },
      { series:1, repos_s:300, exercices:[['Développé couché','5','',0,92,'2-1-1-0',0]] },
      { series:1, repos_s:0,   exercices:[['Soulevé de terre','5','',0,90,'1-0-1-0',0]] }]]
  ]
},
{
  nom: 'Madcow 5×5', source: 'https://stronglifts.com/madcow-5x5/', categorie: 'Force', difficulte: 'Intermédiaire',
  duree_semaines: 12, statut: 'Actif',
  description: "La suite logique du 5×5 débutant, quand ajouter du poids à chaque séance ne passe plus. Les cinq séries montent en charge au lieu d'être toutes égales, et la progression se joue à la semaine.",
  jours: [
    ['Lundi — Lourd', [
      { series:5, repos_s:180, exercices:[['Squat barre','5','',0,0,'3-0-1-0',0]] },
      { series:5, repos_s:180, exercices:[['Développé couché','5','',0,0,'2-1-1-0',0]] },
      { series:5, repos_s:150, exercices:[['Rowing barre buste penché','5','',0,0,'2-0-1-0',0]] }]],
    ['Mercredi — Léger', [
      { series:4, repos_s:150, exercices:[['Squat barre','5','',0,0,'3-0-1-0',0]] },
      { series:4, repos_s:120, exercices:[['Développé militaire debout','5','',0,0,'2-0-2-0',0]] },
      { series:4, repos_s:150, exercices:[['Soulevé de terre','5','',0,0,'1-0-1-0',0]] }]],
    ['Vendredi — Record', [
      { series:4, repos_s:210, exercices:[['Squat barre','3','',0,0,'3-0-1-0',0]] },
      { series:4, repos_s:180, exercices:[['Développé couché','3','',0,0,'2-1-1-0',0]] },
      { series:4, repos_s:150, exercices:[['Rowing barre buste penché','3','',0,0,'2-0-1-0',0]] }]]
  ]
},
{
  nom: 'Split 5 jours', categorie: 'Hypertrophie', difficulte: 'Intermédiaire',
  duree_semaines: 10, statut: 'Actif',
  description: "Un groupe musculaire par séance, cinq fois par semaine. Beaucoup de volume sur chaque groupe, mais une seule fois tous les sept jours : réservé à qui vient vraiment cinq fois et récupère bien.",
  jours: [
    ['Lundi — Pectoraux', [
      { series:4, repos_s:150, exercices:[['Développé couché','8-10','',0,72,'2-0-3-1',0]] },
      { series:4, repos_s:120, exercices:[['Développé incliné aux haltères','10','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90,  exercices:[['Écarté à la poulie haute','12','',0,0,'2-1-2-0',20],
                                          ['Pompes','max','',0,0,'2-0-2-0',0]] }]],
    ['Mardi — Dos', [
      { series:4, repos_s:150, exercices:[['Rowing barre buste penché','8','',0,70,'2-0-2-0',0]] },
      { series:4, repos_s:120, exercices:[['Tractions pronation','max','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90,  exercices:[['Rowing assis à la poulie','12','',0,0,'2-1-2-0',20],
                                          ['Pull-over à la poulie haute','15','',0,0,'2-1-2-0',0]] }]],
    ['Mercredi — Jambes', [
      { series:4, repos_s:180, exercices:[['Squat barre','8','',0,75,'3-0-1-0',0]] },
      { series:3, repos_s:150, exercices:[['Presse à cuisses','12','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:90,  exercices:[['Leg extension','15','',0,0,'2-1-2-0',20],
                                          ['Leg curl allongé','15','',0,0,'2-1-2-0',0]] },
      { series:4, repos_s:60,  exercices:[['Mollets debout','15','',0,0,'1-1-2-1',0]] }]],
    ['Jeudi — Épaules', [
      { series:4, repos_s:120, exercices:[['Développé militaire debout','8','',0,68,'2-0-2-0',0]] },
      { series:4, repos_s:75,  exercices:[['Élévations latérales','15','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:75,  exercices:[['Oiseau buste penché','15','',0,0,'2-1-2-0',20],
                                          ['Face pull','15','',0,0,'2-1-2-0',0]] },
      { series:3, repos_s:60,  exercices:[["Haussements d'épaules à la barre",'12','',0,0,'1-1-1-0',0]] }]],
    ['Vendredi — Bras', [
      { series:4, repos_s:90, exercices:[['Curl barre','10','',0,0,'2-0-2-0',20],
                                         ['Développé couché prise serrée','10','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:75, exercices:[['Curl incliné','12','',0,0,'2-0-3-0',20],
                                         ['Extension nuque à la corde','12','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:60, exercices:[['Curl marteau','12','',0,0,'2-0-2-0',20],
                                         ['Extension à la poulie haute','15','',0,0,'2-0-2-0',0]] }]]
  ]
},
{
  nom: 'Sans matériel', source: 'https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/', categorie: 'Remise en forme', difficulte: 'Débutant',
  duree_semaines: 6, statut: 'Actif',
  description: "Uniquement du poids de corps, à faire chez soi ou en déplacement. Trois circuits par semaine, le volume monte en ajoutant des tours plutôt que de la charge. Utile pour tenir pendant les vacances.",
  jours: [
    ['Lundi — Circuit complet', [
      { series:4, repos_s:90, exercices:[['Pompes','max','',0,0,'2-0-2-0',20],
                                         ['Gainage face','',40,0,0,'',0]] },
      { series:4, repos_s:90, exercices:[['Fente arrière','12','',0,0,'2-0-1-0',20],
                                         ['Pont fessier unilatéral','12','',0,0,'1-1-2-0',0]] }]],
    ['Mercredi — Circuit haut', [
      { series:4, repos_s:90, exercices:[['Tractions pronation','max','',0,0,'2-0-2-0',20],
                                         ['Pompes prise serrée','max','',0,0,'2-0-2-0',0]] },
      { series:3, repos_s:75, exercices:[['Dips sur banc','12','',0,0,'2-0-2-0',20],
                                         ['Gainage latéral','',30,0,0,'',0]] }]],
    ['Vendredi — Circuit bas', [
      { series:4, repos_s:90, exercices:[['Squat bulgare','12','',0,0,'3-0-1-0',20],
                                         ['Pont fessier unilatéral','15','',0,0,'1-1-2-0',0]] },
      { series:3, repos_s:75, exercices:[['Dead bug','12','',0,0,'2-0-2-0',20],
                                         ['Crunch bicyclette','20','',0,0,'2-0-2-0',0]] }]]
  ]
}
];

/**
 * Verse les programmes types dans les modèles. Un modèle portant déjà ce nom
 * est laissé intact : le coach a pu l'adapter.
 */
function importerProgrammes() {
  const noms = {};
  const indexer = function () {
    lire_(TABS.EXERCICES).forEach(function (e) {
      if (e.nom) noms[String(e.nom).trim().toLowerCase()] = String(e.id);
    });
  };
  indexer();
  const rapport = [];
  if (Object.keys(noms).length < 20) { rapport.push(importerCatalogue()); indexer(); }

  const deja = {};
  lire_(TABS.MODELES).forEach(function (m) {
    if (m.nom) deja[String(m.nom).trim().toLowerCase()] = true;
  });

  let crees = 0, ignores = 0, manquants = [];
  PROGRAMMES_TYPES.forEach(function (p) {
    if (deja[p.nom.trim().toLowerCase()]) { ignores++; return; }

    const r = modeleSave_({
      nom: p.nom, categorie: p.categorie, difficulte: p.difficulte,
      duree_semaines: p.duree_semaines, statut: p.statut, description: p.description,
      source: p.source || '', video: p.video || ''
    });

    p.jours.forEach(function (j) {
      const blocs = j[1].map(function (b) {
        return {
          series: b.series, repos_s: b.repos_s,
          exercices: b.exercices.map(function (e) {
            const id = noms[e[0].toLowerCase()];
            if (!id) { manquants.push(e[0]); return null; }
            return {
              exercice_id: id, reps_cible: e[1], duree_s: e[2], charge_cible: e[3],
              pct_rm: e[4], cadence: e[5], pause_s: e[6]
            };
          }).filter(function (x) { return x; })
        };
      }).filter(function (b) { return b.exercices.length; });
      if (blocs.length) modeleJourSave_({ modele_id: r.id, jour: j[0], blocs: blocs });
    });
    crees++;
  });

  const msg = [
    crees + ' programme(s) créé(s)',
    ignores ? ignores + ' déjà présent(s)' : '',
    manquants.length ? 'exercices introuvables : ' + [...new Set(manquants)].join(', ') : ''
  ].filter(Boolean).join(', ') + '.';
  Logger.log(msg);
  return msg;
}
