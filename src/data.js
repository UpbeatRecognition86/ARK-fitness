// ============================================================
// ARK FITNESS — Workout Data v2
// Barbell-era plan. Every legacy exercise ID is preserved
// (as primary or alternative) so old history stays browsable.
// ============================================================

export const ROTATION = ["push", "legs", "pull", "sculptor"];

// ---- Alternative exercises (own IDs, own history) ----
const ALTS = {
  // Push alternates
  db_bench_press: { id: "db_bench_press", name: "Flat DB Press", sets: 4, repMin: 8, repMax: 10, startWeight: 17.5, increment: 2.5, type: "weighted", restSec: 120, note: "Palms forward, press up and slightly in. Full stretch at bottom." },
  chest_dips: { id: "chest_dips", name: "Chest Dips", sets: 3, repMin: 6, repMax: 12, startWeight: 0, increment: 0, type: "amrap", restSec: 120, note: "Lean forward slightly for chest. Go to failure." },
  machine_chest_press: { id: "machine_chest_press", name: "Machine Chest Press", sets: 4, repMin: 8, repMax: 10, startWeight: 30, increment: 5, type: "weighted", restSec: 120, note: "Seat height: handles at mid-chest. Squeeze at lockout." },
  incline_barbell_press: { id: "incline_barbell_press", name: "Incline Barbell Press", sets: 3, repMin: 8, repMax: 10, startWeight: 30, increment: 2.5, type: "weighted", restSec: 120, note: "30° bench. Bar to upper chest. Elbows 45°." },
  barbell_ohp: { id: "barbell_ohp", name: "Standing Barbell OHP", sets: 3, repMin: 8, repMax: 10, startWeight: 25, increment: 2.5, type: "weighted", restSec: 120, note: "Squeeze glutes, brace core. Bar path close to face, lockout overhead." },
  cable_lateral_raises: { id: "cable_lateral_raises", name: "Cable Lateral Raises", sets: 4, repMin: 12, repMax: 15, startWeight: 5, increment: 2.5, type: "weighted", restSec: 60, note: "Constant tension. Lead with elbow, not hand." },
  overhead_tricep_ext: { id: "overhead_tricep_ext", name: "Overhead DB Extension", sets: 3, repMin: 12, repMax: 15, startWeight: 12.5, increment: 2.5, type: "weighted", restSec: 60, note: "Both hands on one DB. Deep stretch behind head." },
  close_grip_bench: { id: "close_grip_bench", name: "Close-Grip Bench Press", sets: 3, repMin: 8, repMax: 12, startWeight: 30, increment: 2.5, type: "weighted", restSec: 90, note: "Grip shoulder-width. Elbows tucked. Triceps do the work." },

  // Legs alternates
  goblet_squats: { id: "goblet_squats", name: "Goblet Squats", sets: 4, repMin: 10, repMax: 12, startWeight: 20, increment: 2.5, type: "weighted", restSec: 90, note: "Ass to grass. DB at chest. Drive through heels." },
  leg_press: { id: "leg_press", name: "Leg Press", sets: 4, repMin: 10, repMax: 12, startWeight: 80, increment: 10, type: "weighted", restSec: 120, note: "Feet mid-platform, shoulder width. Don't lock knees hard." },
  barbell_rdl: { id: "barbell_rdl", name: "Barbell RDL", sets: 4, repMin: 8, repMax: 10, startWeight: 40, increment: 2.5, type: "weighted", restSec: 120, note: "Hinge at hips, bar drags down thighs. Stretch, don't round." },
  bulgarian_split_squat: { id: "bulgarian_split_squat", name: "Bulgarian Split Squats", sets: 3, repMin: 10, repMax: 12, startWeight: 8, increment: 2, type: "weighted", restSec: 90, note: "Rear foot on bench. Torso upright. Brutal and worth it." },
  seated_calf_raise: { id: "seated_calf_raise", name: "Seated Calf Raises", sets: 4, repMin: 15, repMax: 20, startWeight: 20, increment: 5, type: "weighted", restSec: 45, note: "Full stretch, 2-sec squeeze at top." },
  hanging_knee_raise: { id: "hanging_knee_raise", name: "Hanging Knee Raises", sets: 3, repMin: 10, repMax: 15, startWeight: 0, increment: 0, type: "bodyweight", restSec: 60, note: "Dead hang. Curl pelvis up, don't just lift knees." },

  // Pull alternates
  rack_pulls: { id: "rack_pulls", name: "Rack Pulls", sets: 3, repMin: 6, repMax: 8, startWeight: 60, increment: 5, type: "weighted", restSec: 180, note: "Bar at knee height in rack. Upper-back focus, safer range." },
  assisted_pullups: { id: "assisted_pullups", name: "Assisted Pull-Ups", sets: 3, repMin: 6, repMax: 10, startWeight: 20, increment: -5, type: "weighted", restSec: 120, note: "Machine assist. Reduce assist weight over time (that's progress)." },
  inverted_rows: { id: "inverted_rows", name: "Inverted Rows", sets: 3, repMin: 8, repMax: 12, startWeight: 0, increment: 0, type: "bodyweight", restSec: 90, note: "Bar at hip height. Body straight as a plank. Chest to bar." },
  straight_arm_pulldown: { id: "straight_arm_pulldown", name: "Straight-Arm Pulldown", sets: 3, repMin: 12, repMax: 15, startWeight: 15, increment: 2.5, type: "weighted", restSec: 60, note: "Arms nearly straight. Pure lat isolation, big stretch." },
  chest_supported_row: { id: "chest_supported_row", name: "Chest-Supported DB Row", sets: 3, repMin: 10, repMax: 12, startWeight: 14, increment: 2, type: "weighted", restSec: 90, note: "Chest on incline bench. Zero momentum possible. Squeeze blades." },
  barbell_row: { id: "barbell_row", name: "Barbell Row", sets: 3, repMin: 8, repMax: 10, startWeight: 30, increment: 2.5, type: "weighted", restSec: 120, note: "Hinge 45°. Pull to lower chest. No jerking." },
  rear_delt_flyes: { id: "rear_delt_flyes", name: "Rear Delt Flyes", sets: 3, repMin: 15, repMax: 20, startWeight: 5, increment: 2.5, type: "weighted", restSec: 60, note: "Bent over, slight elbow bend. Lead with pinkies." },
  hammer_curls: { id: "hammer_curls", name: "Hammer Curls", sets: 2, repMin: 12, repMax: 15, startWeight: 10, increment: 2.5, type: "weighted", restSec: 45, note: "Neutral grip. Builds brachialis for arm thickness." },
  ez_bar_curls: { id: "ez_bar_curls", name: "EZ-Bar Curls", sets: 2, repMin: 10, repMax: 12, startWeight: 15, increment: 2.5, type: "weighted", restSec: 45, note: "Elbows pinned. Full range, controlled negative." },

  // Sculptor alternates
  db_chest_flyes: { id: "db_chest_flyes", name: "DB Chest Flyes", sets: 3, repMin: 12, repMax: 15, startWeight: 7.5, increment: 2.5, type: "weighted", restSec: 60, note: "Slight elbow bend, wide arc. Deep stretch, squeeze up." },
  pec_deck: { id: "pec_deck", name: "Pec Deck", sets: 3, repMin: 12, repMax: 15, startWeight: 25, increment: 5, type: "weighted", restSec: 60, note: "Elbows at chest height. Squeeze 1 sec at peak." },
  svend_press: { id: "svend_press", name: "Svend Press", sets: 3, repMin: 12, repMax: 15, startWeight: 5, increment: 2.5, type: "weighted", restSec: 60, note: "Squeeze plate between palms, press out. Constant chest tension." },
  machine_shoulder_press: { id: "machine_shoulder_press", name: "Machine Shoulder Press", sets: 3, repMin: 10, repMax: 12, startWeight: 20, increment: 5, type: "weighted", restSec: 90, note: "Back flat against pad. Full range." },
};

// ---- Main workouts ----
export const WORKOUTS = {
  push: {
    id: "push", label: "PUSH", name: "Heavy Armor", icon: "🛡️",
    color: "#FA4B4B", accent: "#FF7B7B",
    exercises: [
      { id: "barbell_bench_press", name: "Barbell Bench Press", sets: 4, repMin: 6, repMax: 8, startWeight: 40, increment: 2.5, type: "weighted", restSec: 150, main: true, note: "Shoulder blades pinned back & down. Bar to lower chest, elbows 45°. ALWAYS use safety pins or spotter.", altIds: ["db_bench_press", "machine_chest_press", "chest_dips"] },
      { id: "incline_db_press", name: "30° Incline DB Press", sets: 3, repMin: 10, repMax: 12, startWeight: 15, increment: 2.5, type: "weighted", restSec: 90, note: "Upper chest shelf builder. Slow 3-sec negative, feel UPPER chest.", altIds: ["incline_barbell_press"] },
      { id: "seated_shoulder_press", name: "Seated DB Shoulder Press", sets: 3, repMin: 10, repMax: 10, startWeight: 12.5, increment: 2.5, type: "weighted", restSec: 90, note: "Full lockout at top. Elbows at 45°, not flared wide.", altIds: ["barbell_ohp", "machine_shoulder_press"] },
      { id: "db_lateral_raises", name: "DB Lateral Raises", sets: 4, repMin: 15, repMax: 15, startWeight: 7.5, increment: 2.5, type: "weighted", restSec: 60, note: "No swinging. Pinky higher than thumb. Shoulder height only.", altIds: ["cable_lateral_raises"] },
      { id: "tricep_pushdowns", name: "Tricep Cable Pushdowns", sets: 3, repMin: 12, repMax: 15, startWeight: 15, increment: 2.5, type: "weighted", restSec: 60, note: "Elbows pinned to sides. Squeeze 1 sec at bottom.", altIds: ["overhead_tricep_ext", "close_grip_bench"] },
    ],
  },
  legs: {
    id: "legs", label: "LEGS", name: "The Furnace", icon: "🔥",
    color: "#FFA028", accent: "#FFC168",
    exercises: [
      { id: "barbell_back_squat", name: "Barbell Back Squat", sets: 4, repMin: 8, repMax: 10, startWeight: 40, increment: 2.5, type: "weighted", restSec: 150, main: true, note: "Bar on upper traps. Brace like taking a punch. Hip crease below knee. Squat INSIDE the rack with pins set.", altIds: ["goblet_squats", "leg_press"] },
      { id: "db_rdls", name: "Dumbbell RDLs", sets: 4, repMin: 10, repMax: 12, startWeight: 16, increment: 2, type: "weighted", restSec: 90, note: "Hinge at hips. Feel hamstring stretch. Back flat.", altIds: ["barbell_rdl"] },
      { id: "reverse_lunges", name: "Reverse Walking Lunges", sets: 3, repMin: 12, repMax: 12, startWeight: 10, increment: 2, type: "weighted", restSec: 90, note: "Step back. Knee kisses ground. Torso completely upright.", altIds: ["bulgarian_split_squat"] },
      { id: "calf_raises", name: "Standing Calf Raises", sets: 4, repMin: 15, repMax: 20, startWeight: 0, increment: 0, type: "bodyweight", restSec: 45, note: "Full stretch at bottom. 2-sec hold at top. Slow control.", altIds: ["seated_calf_raise"] },
      { id: "plank_pushup", name: "Plank to Push-up", sets: 3, repMin: 30, repMax: 60, startWeight: 0, increment: 0, type: "time", restSec: 60, note: "Core tight. No hip sway. Log seconds, not reps.", altIds: ["hanging_knee_raise"] },
    ],
  },
  pull: {
    id: "pull", label: "PULL", name: "V-Taper", icon: "🦅",
    color: "#2DD4BF", accent: "#5EEAD4",
    exercises: [
      { id: "trap_bar_deadlift", name: "Trap-Bar / Barbell Deadlift", sets: 3, repMin: 6, repMax: 8, startWeight: 60, increment: 5, type: "weighted", restSec: 180, main: true, note: "Neutral spine, push the floor away. Bar/handles stay close to body. NO ego loading — your arm injury history means form is everything.", altIds: ["barbell_rdl", "rack_pulls"] },
      { id: "pullups", name: "Strict Pull-Ups", sets: 3, repMin: 3, repMax: 10, startWeight: 0, increment: 2.5, type: "weighted_bw", restSec: 120, note: "Dead hang start. Chin over bar. Add weight when 8×3 hit.", altIds: ["assisted_pullups", "inverted_rows"] },
      { id: "lat_pulldowns", name: "Lat Pulldowns", sets: 3, repMin: 10, repMax: 12, startWeight: 30, increment: 5, type: "weighted", restSec: 90, note: "Wide grip. Pull to upper chest. Squeeze lats at bottom.", altIds: ["straight_arm_pulldown"] },
      { id: "seated_rows", name: "Seated Cable Rows", sets: 3, repMin: 12, repMax: 12, startWeight: 30, increment: 5, type: "weighted", restSec: 90, note: "Pull to belly button. Squeeze blades. No leaning back.", altIds: ["chest_supported_row", "barbell_row"] },
      { id: "face_pulls", name: "Face Pulls", sets: 3, repMin: 15, repMax: 20, startWeight: 15, increment: 2.5, type: "weighted", restSec: 60, note: "Pull to face. External rotate at end. Posture fix.", altIds: ["rear_delt_flyes"] },
      { id: "db_bicep_curls", name: "DB Bicep Curls", sets: 2, repMin: 10, repMax: 12, startWeight: 10, increment: 2.5, type: "weighted", restSec: 45, note: "No swinging. Full extension at bottom. Controlled negative.", altIds: ["hammer_curls", "ez_bar_curls"] },
    ],
  },
  sculptor: {
    id: "sculptor", label: "SCULPTOR", name: "Upper Hypertrophy", icon: "🗿",
    color: "#A78BFA", accent: "#C4B5FD",
    exercises: [
      { id: "incline_db_press_light", name: "Incline DB Press (Light)", sets: 3, repMin: 12, repMax: 15, startWeight: 10, increment: 2.5, type: "weighted", restSec: 60, note: "Lighter than Push day. Focus on squeeze and stretch.", altIds: ["incline_barbell_press"] },
      { id: "cable_chest_flyes", name: "Cable Chest Flyes", sets: 3, repMin: 15, repMax: 15, startWeight: 10, increment: 2.5, type: "weighted", restSec: 60, note: "Stretch wide, squeeze together.", altIds: ["db_chest_flyes", "pec_deck", "svend_press"] },
      { id: "wide_grip_lat_pulldown", name: "Wide-Grip Lat Pulldown", sets: 3, repMin: 12, repMax: 15, startWeight: 25, increment: 5, type: "weighted", restSec: 60, note: "Feel lats stretch and contract fully.", altIds: ["straight_arm_pulldown"] },
      { id: "single_arm_rows", name: "Single-Arm DB Rows", sets: 3, repMin: 12, repMax: 12, startWeight: 14, increment: 2, type: "weighted", restSec: 60, note: "Pull to hip not shoulder. Squeeze 1 sec at top.", altIds: ["chest_supported_row"] },
      { id: "lateral_raises_light", name: "Lateral Raises (Light)", sets: 3, repMin: 15, repMax: 15, startWeight: 5, increment: 2.5, type: "weighted", restSec: 45, note: "Light and strict. Shoulder caps create the V-taper.", altIds: ["cable_lateral_raises"] },
      { id: "arm_superset", name: "Bicep + Tricep Superset", sets: 2, repMin: 15, repMax: 15, startWeight: 8, increment: 2.5, type: "weighted", restSec: 60, note: "No rest between curl and pushdown. 60s after pair.", altIds: [] },
    ],
  },
};

// ---- Cardio types (logged separately, don't advance rotation) ----
export const CARDIO_TYPES = [
  { id: "incline_walk", name: "Incline Walk", icon: "🚶", defaultMin: 25 },
  { id: "easy_run", name: "Easy Run (Zone 2)", icon: "🏃", defaultMin: 20 },
  { id: "cycling", name: "Cycling", icon: "🚴", defaultMin: 25 },
  { id: "stairs", name: "Stair Climber", icon: "🪜", defaultMin: 15 },
];

// ---- Flattened catalog: every exercise (primary + alt) with display context ----
export const CATALOG = (() => {
  const cat = {};
  for (const w of Object.values(WORKOUTS)) {
    for (const ex of w.exercises) {
      cat[ex.id] = { ...ex, workoutType: w.id, color: w.color, label: w.label };
    }
  }
  // Alternates inherit context of the first primary that references them
  for (const w of Object.values(WORKOUTS)) {
    for (const ex of w.exercises) {
      for (const altId of ex.altIds || []) {
        if (!cat[altId] && ALTS[altId]) {
          cat[altId] = { ...ALTS[altId], workoutType: w.id, color: w.color, label: w.label, isAlt: true };
        }
      }
    }
  }
  return cat;
})();

export const BIG_THREE = ["barbell_bench_press", "barbell_back_squat", "trap_bar_deadlift"];

export const BODYWEIGHT_TARGET = 78; // kg — the goal
