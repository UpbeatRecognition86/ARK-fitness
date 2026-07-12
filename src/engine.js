// ============================================================
// ARK FITNESS — Engine v2
// Storage (with v1 migration), suggestions, analytics.
// ============================================================
import { WORKOUTS, CATALOG, ROTATION, BODYWEIGHT_TARGET } from "./data.js";

export const STORAGE_KEY = "ark_fitness_v3"; // SAME key as v1 → history preserved

// ---------------- STORAGE ----------------

function defaults() {
  return {
    version: 2,
    rotationIndex: 0,
    currentSession: null,
    history: [],
    cardio: [],
    bodyWeight: [],
    settings: { restTimer: true },
    createdAt: new Date().toISOString(),
  };
}

export function migrate(parsed) {
  // v1 data has no `version` field. All v1 fields carry over untouched —
  // history, rotationIndex, currentSession are 100% compatible.
  return {
    version: 2,
    rotationIndex: parsed.rotationIndex ?? 0,
    currentSession: parsed.currentSession ?? null,
    history: Array.isArray(parsed.history) ? parsed.history : [],
    cardio: Array.isArray(parsed.cardio) ? parsed.cardio : [],
    bodyWeight: Array.isArray(parsed.bodyWeight) ? parsed.bodyWeight : [],
    settings: { restTimer: true, ...(parsed.settings || {}) },
    createdAt: parsed.createdAt ?? new Date().toISOString(),
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { console.error("Load failed:", e); }
  return defaults();
}

export function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
  catch (e) { console.error("Save failed:", e); return false; }
}

export function exportJSON(data) {
  return JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2);
}

export function validateImport(text) {
  const parsed = JSON.parse(text); // throws on bad JSON
  if (!parsed || typeof parsed !== "object") throw new Error("Not a valid backup object");
  if (!Array.isArray(parsed.history)) throw new Error("Backup missing history array");
  return migrate(parsed);
}

// ---------------- DATE HELPERS ----------------

export const DAY_MS = 86400000;
export const todayStr = () => new Date().toISOString().split("T")[0];
export const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function daysAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

// ---------------- CORE QUERIES ----------------

export function getExerciseHistory(exerciseId, history, limit = 50) {
  const out = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i];
    if (s.exercises && s.exercises[exerciseId]) {
      out.push({ date: s.date, sets: s.exercises[exerciseId].sets || [] });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function sessionVolume(session) {
  let v = 0;
  for (const ex of Object.values(session.exercises || {})) {
    for (const s of ex.sets || []) {
      if (s.done && s.reps) v += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
    }
  }
  return v;
}

export function sessionSets(session) {
  return Object.values(session.exercises || {}).reduce(
    (sum, e) => sum + (e.sets?.filter((s) => s.done).length || 0), 0);
}

export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function bestE1RM(sets) {
  let best = 0;
  for (const s of sets) {
    if (!s.reps) continue;
    const e = epley1RM(parseFloat(s.weight) || 0, parseInt(s.reps) || 0);
    if (e > best) best = e;
  }
  return best;
}

// ---------------- SUGGESTION ENGINE ----------------
// Double progression + stall detection + rust-knock after long gaps.

export function getSuggestion(exercise, history) {
  const past = getExerciseHistory(exercise.id, history, 3);
  if (past.length === 0) {
    return { weight: exercise.startWeight, isFirstTime: true, reason: "First session — start here, own the form.", progression: "new" };
  }

  const last = past[0];
  const done = last.sets.filter((s) => s.reps != null && s.reps !== "");
  if (done.length === 0) {
    return { weight: exercise.startWeight, isFirstTime: true, reason: "No completed sets last time.", progression: "new" };
  }

  const lastWeight = parseFloat(done[0].weight) || exercise.startWeight;
  const repsHit = done.map((s) => parseInt(s.reps) || 0);

  // Long layoff → shave 10%
  const gapDays = Math.floor((Date.now() - new Date(last.date).getTime()) / DAY_MS);
  if (gapDays >= 21 && exercise.type === "weighted") {
    const knocked = Math.max(exercise.startWeight, Math.round((lastWeight * 0.9) / 2.5) * 2.5);
    return { weight: knocked, reason: `${gapDays} days off this lift. Restart 10% lighter, rebuild fast.`, lastWeight, lastReps: repsHit, progression: "reset" };
  }

  const allHitTop = repsHit.every((r) => r >= exercise.repMax);
  if (allHitTop && exercise.increment > 0) {
    return { weight: lastWeight + exercise.increment, reason: `Hit ${exercise.repMax} on all sets. LEVEL UP → ${lastWeight + exercise.increment}kg.`, lastWeight, lastReps: repsHit, progression: "up" };
  }

  // Stall detection: 3+ sessions at same weight, no rep improvement
  if (past.length >= 3 && exercise.type === "weighted") {
    const weights = past.map((p) => parseFloat(p.sets.find((s) => s.weight)?.weight) || 0);
    const totals = past.map((p) => p.sets.reduce((sum, s) => sum + (parseInt(s.reps) || 0), 0));
    const sameWeight = weights.every((w) => w === weights[0]) && weights[0] > 0;
    const noRepProgress = totals[0] <= totals[2]; // newest total ≤ oldest
    if (sameWeight && noRepProgress) {
      const deload = Math.max(exercise.startWeight, Math.round((lastWeight * 0.9) / 2.5) * 2.5);
      return { weight: lastWeight, reason: `STALLED 3 sessions at ${lastWeight}kg. Option A: fight for +1 rep/set today. Option B: deload to ${deload}kg and rebuild.`, lastWeight, lastReps: repsHit, progression: "stalled", deloadWeight: deload };
    }
  }

  const allHitMin = repsHit.every((r) => r >= exercise.repMin);
  if (allHitMin) {
    return { weight: lastWeight, reason: `Last: ${repsHit.join(", ")}. Push for ${exercise.repMax} on ALL sets → then weight goes up.`, lastWeight, lastReps: repsHit, progression: "same" };
  }

  return { weight: lastWeight, reason: `Last: ${repsHit.join(", ")}. Hold ${lastWeight}kg until ${exercise.repMin}+ on all sets.`, lastWeight, lastReps: repsHit, progression: "hold" };
}

// ---------------- ANALYTICS ----------------

export function calcStreak(history, cardio = []) {
  const dates = [...new Set([...history.map((h) => h.date), ...cardio.map((c) => c.date)])].sort().reverse();
  if (dates.length === 0) return 0;
  const daysSince = Math.floor((Date.now() - new Date(dates[0]).getTime()) / DAY_MS);
  if (daysSince > 3) return 0;
  let streak = 1, lastDate = new Date(dates[0]);
  for (let i = 1; i < dates.length; i++) {
    const dt = new Date(dates[i]);
    const gap = Math.floor((lastDate - dt) / DAY_MS);
    if (gap <= 3) { streak++; lastDate = dt; } else break;
  }
  return streak;
}

export function volumeInWindow(history, fromDaysAgo, toDaysAgo = 0) {
  const from = Date.now() - fromDaysAgo * DAY_MS;
  const to = Date.now() - toDaysAgo * DAY_MS;
  return history
    .filter((s) => { const t = new Date(s.date).getTime(); return t >= from && t <= to; })
    .reduce((sum, s) => sum + sessionVolume(s), 0);
}

// Acute:Chronic Workload Ratio — sports-science fatigue metric.
// 0.8–1.3 sweet spot · >1.5 spike (injury risk) · <0.8 detraining
export function calcACWR(history) {
  const acute = volumeInWindow(history, 7);
  const chronicTotal = volumeInWindow(history, 28);
  const chronicWeekly = chronicTotal / 4;
  if (chronicWeekly < 500) return { ratio: null, acute, chronicWeekly };
  return { ratio: acute / chronicWeekly, acute, chronicWeekly };
}

export function consecutiveTrainingDays(history, cardio = []) {
  const dateSet = new Set([...history.map((h) => h.date), ...cardio.map((c) => c.date)]);
  let count = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() - i * DAY_MS).toISOString().split("T")[0];
    if (dateSet.has(d)) count++;
    else if (i > 0) break; // today can be a rest day without breaking backward count
    else if (!dateSet.has(d) && i === 0) continue;
  }
  return count;
}

export function readiness(data) {
  const { history, cardio } = data;
  const factors = [];
  let score = 88; // healthy baseline

  if (history.length === 0) {
    return { score: 100, band: "primed", label: "Fresh", factors: [{ good: true, text: "No fatigue on the books. Perfect day to start." }] };
  }

  const lastDate = history[history.length - 1].date;
  const daysSinceLift = Math.floor((Date.now() - new Date(lastDate).getTime()) / DAY_MS);
  const consec = consecutiveTrainingDays(history, cardio);
  const { ratio } = calcACWR(history);

  if (consec >= 4) { score -= 30; factors.push({ good: false, text: `${consec} straight training days — recovery debt building.` }); }
  else if (consec === 3) { score -= 15; factors.push({ good: false, text: "3 consecutive days. One more is fine, then rest." }); }

  if (daysSinceLift === 0) { score -= 20; factors.push({ good: true, text: "Already trained today. Recovery mode." }); }
  else if (daysSinceLift === 1) { score += 4; factors.push({ good: true, text: "1 rest day banked — primed to lift." }); }
  else if (daysSinceLift === 2) { score += 8; factors.push({ good: true, text: "2 rest days — fully recovered, attack today." }); }
  else if (daysSinceLift >= 4) { score += 8; factors.push({ good: false, text: `${daysSinceLift} days since last lift. Muscle protein synthesis window closed — get back in.` }); }

  const lastSess = history[history.length - 1];
  if (lastSess?.feel && daysSinceLift <= 1) {
    if (lastSess.feel === "brutal") { score -= 10; factors.push({ good: false, text: "Last session rated Brutal — bank extra recovery." }); }
    else if (lastSess.feel === "easy") { score += 4; factors.push({ good: true, text: "Last session felt Easy — capacity to push harder." }); }
  }

  if (ratio != null) {
    if (ratio > 1.5) { score -= 25; factors.push({ good: false, text: `Workload spike (ACWR ${ratio.toFixed(2)}). Go lighter or rest — injury risk zone.` }); }
    else if (ratio > 1.3) { score -= 10; factors.push({ good: false, text: `Load ramping fast (ACWR ${ratio.toFixed(2)}). Watch recovery.` }); }
    else if (ratio < 0.8) { factors.push({ good: false, text: `Training load below your baseline (ACWR ${ratio.toFixed(2)}). Volume is slipping.` }); }
    else { score += 4; factors.push({ good: true, text: `Workload balanced (ACWR ${ratio.toFixed(2)}). Ideal progression zone.` }); }
  }

  score = Math.max(5, Math.min(100, Math.round(score)));
  const band = score >= 67 ? "primed" : score >= 34 ? "moderate" : "recover";
  const label = band === "primed" ? "Primed" : band === "moderate" ? "Moderate" : "Recover";
  return { score, band, label, factors };
}

export function todayRecommendation(data) {
  const { history, cardio, rotationIndex } = data;
  const next = WORKOUTS[ROTATION[rotationIndex]];
  const r = readiness(data);
  const trainedToday = history.some((s) => s.date === todayStr());
  const consec = consecutiveTrainingDays(history, cardio);

  if (trainedToday) return { kind: "done", title: "Session banked ✓", sub: "Protein, water, 7.5h sleep. That's the workout now.", workout: null };
  if (consec >= 3 || r.band === "recover") return { kind: "cardio", title: "Active recovery day", sub: "20–30 min zone-2 incline walk. Keeps fat loss moving without recovery cost.", workout: null };
  if (history.length > 0) {
    const daysSince = Math.floor((Date.now() - new Date(history[history.length - 1].date).getTime()) / DAY_MS);
    if (daysSince >= 4) return { kind: "urgent", title: `${daysSince} days off — train today`, sub: `${next.name} is up. Momentum beats perfection.`, workout: next };
  }
  return { kind: "train", title: `${next.name} is up`, sub: `${next.exercises.length} exercises · ~45 min · beat last session by 1 rep`, workout: next };
}

export function detectPRs(session, priorHistory) {
  const prs = [];
  for (const [exId, exData] of Object.entries(session.exercises || {})) {
    const setsWithReps = (exData.sets || []).filter((s) => s.done && s.reps);
    if (setsWithReps.length === 0) continue;
    const maxW = Math.max(...setsWithReps.map((s) => parseFloat(s.weight) || 0));
    if (maxW <= 0) continue;
    const older = getExerciseHistory(exId, priorHistory, 50);
    if (older.length === 0) continue;
    const prevMax = Math.max(0, ...older.flatMap((o) => o.sets.filter((s) => s.reps).map((s) => parseFloat(s.weight) || 0)));
    if (maxW > prevMax && prevMax > 0) {
      prs.push({ exerciseId: exId, name: CATALOG[exId]?.name || exId, weight: maxW, prev: prevMax });
    }
  }
  return prs;
}

export function stalledLifts(history) {
  const out = [];
  for (const ex of Object.values(CATALOG)) {
    if (ex.type !== "weighted" || !ex.increment) continue;
    const past = getExerciseHistory(ex.id, history, 3);
    if (past.length < 3) continue;
    const weights = past.map((p) => parseFloat(p.sets.find((s) => s.weight)?.weight) || 0);
    const totals = past.map((p) => p.sets.reduce((sum, s) => sum + (parseInt(s.reps) || 0), 0));
    if (weights.every((w) => w === weights[0]) && weights[0] > 0 && totals[0] <= totals[2]) {
      out.push({ id: ex.id, name: ex.name, weight: weights[0], color: ex.color, sessions: 3 });
    }
  }
  return out;
}

export function muscleBalance(history, days = 28) {
  const from = Date.now() - days * DAY_MS;
  const byType = { push: 0, legs: 0, pull: 0, sculptor: 0 };
  for (const s of history) {
    if (new Date(s.date).getTime() < from) continue;
    if (byType[s.workoutType] != null) byType[s.workoutType] += sessionVolume(s);
  }
  const pushSide = byType.push + byType.sculptor * 0.5;
  const pullSide = byType.pull + byType.sculptor * 0.5;
  let flag = null;
  if (pullSide > 500 && pushSide / pullSide > 1.35) flag = "Push volume is outpacing Pull — shoulder-imbalance risk. Prioritise rows & pulldowns.";
  if (pushSide > 500 && pullSide / pushSide > 1.35) flag = "Pull volume well ahead of Push — bench/press has room to grow.";
  return { byType, flag };
}

export function weeklyReport(data) {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Monday=0
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek); monday.setHours(0, 0, 0, 0);
  const prevMonday = new Date(monday.getTime() - 7 * DAY_MS);

  const inRange = (d, from, to) => { const t = new Date(d).getTime(); return t >= from.getTime() && t < to.getTime(); };
  const thisWeek = data.history.filter((s) => inRange(s.date, monday, new Date(monday.getTime() + 7 * DAY_MS)));
  const lastWeek = data.history.filter((s) => inRange(s.date, prevMonday, monday));
  const thisCardio = data.cardio.filter((c) => inRange(c.date, monday, new Date(monday.getTime() + 7 * DAY_MS)));

  const vol = (arr) => arr.reduce((sum, s) => sum + sessionVolume(s), 0);
  const thisVol = vol(thisWeek), lastVol = vol(lastWeek);
  const prCount = thisWeek.reduce((sum, s) => sum + (s.prs?.length || 0), 0);
  const cardioMin = thisCardio.reduce((sum, c) => sum + (c.minutes || 0), 0);

  return {
    sessions: thisWeek.length, lastSessions: lastWeek.length,
    volume: Math.round(thisVol), lastVolume: Math.round(lastVol),
    volDelta: lastVol > 0 ? Math.round(((thisVol - lastVol) / lastVol) * 100) : null,
    prCount, cardioMin,
  };
}

export function heatmapData(data, weeks = 12) {
  const days = weeks * 7;
  const volByDate = {};
  for (const s of data.history) volByDate[s.date] = (volByDate[s.date] || 0) + sessionVolume(s);
  const cardioDates = new Set(data.cardio.map((c) => c.date));

  const vols = Object.values(volByDate).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p) => vols.length ? vols[Math.min(vols.length - 1, Math.floor(p * vols.length))] : 0;
  const q33 = q(0.33), q66 = q(0.66);

  const cells = [];
  // Align so the grid ends on today, starts on a Monday
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const endDow = (today.getDay() + 6) % 7;
  const start = new Date(today.getTime() - (days - 1 + (6 - endDow) - 6) * DAY_MS);
  const startAligned = new Date(start); startAligned.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  for (let i = 0; i < days; i++) {
    const d = new Date(startAligned.getTime() + i * DAY_MS);
    if (d > today) break;
    const key = d.toISOString().split("T")[0];
    const v = volByDate[key] || 0;
    let level = 0;
    if (v > 0) level = v <= q33 ? 2 : v <= q66 ? 3 : 4;
    else if (cardioDates.has(key)) level = 1;
    cells.push({ date: key, level });
  }
  return cells;
}

export function bodyweightTrend(bodyWeight) {
  if (!bodyWeight || bodyWeight.length === 0) return null;
  const sorted = [...bodyWeight].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1];

  // 7-day moving average series
  const series = sorted.map((p, i) => {
    const from = new Date(p.date).getTime() - 6 * DAY_MS;
    const win = sorted.filter((q) => { const t = new Date(q.date).getTime(); return t >= from && t <= new Date(p.date).getTime(); });
    const ma = win.reduce((s, q) => s + q.kg, 0) / win.length;
    return { date: p.date, kg: p.kg, ma: Math.round(ma * 10) / 10 };
  });

  // Weekly rate via linear fit over last 21 days
  const cutoff = Date.now() - 21 * DAY_MS;
  const recent = sorted.filter((p) => new Date(p.date).getTime() >= cutoff);
  let ratePerWeek = null, etaWeeks = null;
  if (recent.length >= 3) {
    const xs = recent.map((p) => new Date(p.date).getTime() / DAY_MS);
    const ys = recent.map((p) => p.kg);
    const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    ratePerWeek = Math.round(slope * 7 * 100) / 100;
    const maNow = series[series.length - 1].ma;
    if (ratePerWeek < -0.05 && maNow > BODYWEIGHT_TARGET) {
      etaWeeks = Math.ceil((maNow - BODYWEIGHT_TARGET) / Math.abs(ratePerWeek));
    }
  }
  return { latest, series, ratePerWeek, etaWeeks, target: BODYWEIGHT_TARGET };
}

// ---------------- ACHIEVEMENTS ----------------

export function achievements(data) {
  const h = data.history || [];
  const totalSessions = h.length;
  const prTotal = h.reduce((s, x) => s + (x.prs?.length || 0), 0);
  const bestOf = (id) => {
    let b = 0;
    for (const s of h) {
      const e = s.exercises?.[id]; if (!e) continue;
      for (const st of e.sets || []) { const w = parseFloat(st.weight) || 0; if (st.reps && w > b) b = w; }
    }
    return b;
  };
  const bench = bestOf("barbell_bench_press"), squat = bestOf("barbell_back_squat"), dl = bestOf("trap_bar_deadlift");
  let pullupReps = 0;
  for (const s of h) { const e = s.exercises?.pullups; if (!e) continue; for (const st of e.sets || []) pullupReps += parseInt(st.reps) || 0; }

  const weekKey = (dstr) => { const d = new Date(dstr); const day = (d.getDay() + 6) % 7; const mon = new Date(d); mon.setDate(d.getDate() - day); return mon.toISOString().split("T")[0]; };
  const volByWeek = {}, countByWeek = {};
  for (const s of h) {
    const k = weekKey(s.date);
    volByWeek[k] = (volByWeek[k] || 0) + sessionVolume(s);
    countByWeek[k] = (countByWeek[k] || 0) + 1;
  }
  const bestWeek = Object.values(volByWeek).length ? Math.max(...Object.values(volByWeek)) : 0;

  let consecWeeks = 0, run = 0;
  for (let w = 25; w >= 0; w--) {
    const mon = new Date(); const day = (mon.getDay() + 6) % 7;
    mon.setDate(mon.getDate() - day - w * 7); mon.setHours(0, 0, 0, 0);
    const k = mon.toISOString().split("T")[0];
    if ((countByWeek[k] || 0) >= 3) { run++; consecWeeks = Math.max(consecWeeks, run); } else run = 0;
  }

  const cardioCount = (data.cardio || []).length;
  const A = (id, icon, name, desc, cur, target) => ({ id, icon, name, desc, earned: cur >= target, cur: Math.min(Math.round(cur), target), target });
  return [
    A("first", "⚡", "First Blood", "Complete your first workout", totalSessions, 1),
    A("ten", "🔟", "Double Digits", "Log 10 workouts", totalSessions, 10),
    A("committed", "🎯", "Committed", "Log 25 workouts", totalSessions, 25),
    A("fifty", "🏛️", "Half Century", "Log 50 workouts", totalSessions, 50),
    A("pr1", "🏆", "Record Breaker", "Set your first PR", prTotal, 1),
    A("pr10", "🔥", "PR Hunter", "Set 10 personal records", prTotal, 10),
    A("bench60", "🛡️", "Bench 60 Club", "Bench press 60 kg", bench, 60),
    A("squat80", "🔩", "Squat 80 Club", "Back squat 80 kg", squat, 80),
    A("dl100", "🦍", "Deadlift 100 Club", "Deadlift 100 kg", dl, 100),
    A("pullup100", "🦅", "Century Pull", "100 strict pull-up reps, lifetime", pullupReps, 100),
    A("vol10k", "🏗️", "10-Tonne Week", "10,000 kg volume in one week", bestWeek, 10000),
    A("consist4", "📆", "Consistency Machine", "4 straight weeks with 3+ lifts", consecWeeks, 4),
    A("cardio10", "🫀", "Engine Builder", "Log 10 cardio sessions", cardioCount, 10),
  ];
}

export function waistTrend(bodyWeight) {
  const w = (bodyWeight || []).filter((x) => x.waist).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (w.length === 0) return null;
  const latest = w[w.length - 1];
  const cutoff = Date.now() - 30 * DAY_MS;
  const monthAgo = w.find((x) => new Date(x.date).getTime() >= cutoff) || w[0];
  const delta = Math.round((latest.waist - monthAgo.waist) * 10) / 10;
  return { latest: latest.waist, delta, count: w.length };
}
