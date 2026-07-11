import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, Cell, ReferenceLine } from "recharts";
import {
  ArrowLeft, ChevronRight, Check, TrendingUp, Minus as MinusIcon, Plus, Minus,
  Flame, X, AlertCircle, Repeat, Settings as SettingsIcon, Download, Upload,
  Activity, Scale, Timer, SkipForward, Home, Dumbbell, BarChart3, History as HistoryIcon, Trophy,
} from "lucide-react";
import { WORKOUTS, CATALOG, ROTATION, CARDIO_TYPES, BIG_THREE, BODYWEIGHT_TARGET } from "./data.js";
import {
  loadData, saveData, exportJSON, validateImport, STORAGE_KEY,
  fmtDate, daysAgo, todayStr, getExerciseHistory, sessionVolume, sessionSets,
  getSuggestion, calcStreak, readiness, todayRecommendation, detectPRs,
  stalledLifts, muscleBalance, weeklyReport, heatmapData, bodyweightTrend,
  calcACWR, bestE1RM,
} from "./engine.js";

// ---------------- THEME ----------------
const T = {
  bg: "#09090B", card: "#131316", cardHi: "#1A1A20", border: "#232329", border2: "#2E2E36",
  text: "#F4F4F5", mid: "#9C9CA6", dim: "#5D5D68", faint: "#3A3A44",
  green: "#4ADE80", yellow: "#FBBF24", red: "#FA4B4B", blue: "#60A5FA", violet: "#A78BFA",
};
const BAND_COLOR = { primed: T.green, moderate: T.yellow, recover: T.red };

// ---------------- SMALL PARTS ----------------

function Ring({ size = 120, stroke = 10, pct = 0, color = T.green, track = "#1E1E24", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 10px" }}>
      <div style={{ fontSize: 10, letterSpacing: 2.5, color: T.dim, fontWeight: 700 }}>{children}</div>
      {right}
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, ...(onClick ? { cursor: "pointer", WebkitTapHighlightColor: "transparent" } : {}), ...style }}>
      {children}
    </div>
  );
}

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto", background: T.card, borderRadius: "20px 20px 0 0", border: `1px solid ${T.border2}`, borderBottom: "none", padding: "18px 18px calc(24px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{title}</div>
          <button onClick={onClose} style={{ background: T.cardHi, border: `1px solid ${T.border}`, borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: T.mid, cursor: "pointer" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.12;
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15);
    });
  } catch { /* iOS may block — timer still shows visually */ }
}

// ---------------- SET ROW ----------------

function SetRow({ setIdx, set, exercise, suggestion, onChange, onComplete, isActive, color }) {
  const isWeighted = exercise.type === "weighted" || exercise.type === "weighted_bw";
  const isTime = exercise.type === "time";

  const adjW = (d) => onChange({ ...set, weight: Math.max(0, (parseFloat(set.weight) || suggestion.weight || 0) + d) });
  const adjR = (d) => onChange({ ...set, reps: Math.max(0, (parseInt(set.reps) || (isTime ? 30 : exercise.repMin)) + d) });

  const Step = ({ children, onClick }) => (
    <button onClick={onClick} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${T.border2}`, background: T.cardHi, color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>{children}</button>
  );

  if (set.done) {
    return (
      <div style={{ display: "flex", alignItems: "center", padding: "11px 12px", background: "rgba(74,222,128,0.07)", borderRadius: 12, marginBottom: 6, border: "1px solid rgba(74,222,128,0.22)" }}>
        <div style={{ width: 30, fontSize: 11, color: T.green, fontWeight: 800 }}>S{setIdx + 1}</div>
        <div style={{ flex: 1, fontSize: 14, color: "#B7EFC5" }}>
          {isWeighted && set.weight ? <><b style={{ color: T.text }}>{set.weight}</b> kg × </> : null}
          <b style={{ color: T.text }}>{set.reps}</b> {isTime ? "sec" : "reps"}
        </div>
        <button onClick={() => onChange({ weight: set.weight, reps: set.reps, done: false })} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 4 }}><X size={15} /></button>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, background: isActive ? T.cardHi : "#101014", borderRadius: 12, marginBottom: 6, border: `1px solid ${isActive ? color + "44" : T.border}` }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <div style={{ width: 30, fontSize: 11, color, fontWeight: 800 }}>S{setIdx + 1}</div>
        <div style={{ flex: 1, fontSize: 10, color: T.dim, letterSpacing: 0.5 }}>
          {suggestion.lastWeight != null && suggestion.lastReps && (
            <span>LAST {suggestion.lastWeight}{isWeighted ? "kg" : ""} × {suggestion.lastReps[setIdx] ?? "—"}</span>
          )}
        </div>
      </div>
      {isWeighted && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: T.dim, width: 30, letterSpacing: 1, flexShrink: 0 }}>KG</div>
          <Step onClick={() => adjW(-2.5)}><Minus size={15} /></Step>
          <input type="number" inputMode="decimal" value={set.weight ?? ""} placeholder={`${suggestion.weight}`}
            onChange={(e) => onChange({ ...set, weight: e.target.value })}
            style={{ flex: 1, minWidth: 0, background: "#0C0C0F", border: `1px solid ${T.border2}`, borderRadius: 10, padding: "11px 4px", color: T.text, fontSize: 19, fontWeight: 700, fontFamily: "inherit", textAlign: "center", outline: "none", WebkitAppearance: "none" }} />
          <Step onClick={() => adjW(2.5)}><Plus size={15} /></Step>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: T.dim, width: 30, letterSpacing: 1, flexShrink: 0 }}>{isTime ? "SEC" : "REP"}</div>
        <Step onClick={() => adjR(-1)}><Minus size={15} /></Step>
        <input type="number" inputMode="numeric" value={set.reps ?? ""} placeholder={exercise.repMin === exercise.repMax ? `${exercise.repMax}` : `${exercise.repMin}–${exercise.repMax}`}
          onChange={(e) => onChange({ ...set, reps: e.target.value })}
          style={{ flex: 1, minWidth: 0, background: "#0C0C0F", border: `1px solid ${T.border2}`, borderRadius: 10, padding: "11px 4px", color: T.text, fontSize: 19, fontWeight: 700, fontFamily: "inherit", textAlign: "center", outline: "none", WebkitAppearance: "none" }} />
        <Step onClick={() => adjR(1)}><Plus size={15} /></Step>
      </div>
      <button onClick={onComplete} disabled={!set.reps} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: set.reps ? color : T.cardHi, color: set.reps ? "#0A0A0A" : T.faint, fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: set.reps ? "pointer" : "not-allowed", fontFamily: "inherit", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>
        ✓ LOG SET
      </button>
    </div>
  );
}

// ---------------- EXERCISE CARD (with alternates) ----------------

function ExerciseCard({ slotExercise, activeExercise, sessionData, history, isExpanded, onToggle, onUpdate, onSwap, color }) {
  const ex = activeExercise;
  const suggestion = useMemo(() => getSuggestion(ex, history), [ex.id, history.length]);
  const sets = sessionData?.sets || Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false }));
  const completed = sets.filter((s) => s.done).length;
  const activeIdx = sets.findIndex((s) => !s.done);
  const isComplete = completed === ex.sets;
  const [showAlts, setShowAlts] = useState(false);
  const canSwap = (slotExercise.altIds?.length > 0 || ex.id !== slotExercise.id) && completed === 0;

  const updateSet = (i, ns) => {
    const arr = [...sets]; arr[i] = ns;
    if (ns.done && i + 1 < ex.sets && !arr[i + 1].weight && !arr[i + 1].done) arr[i + 1] = { ...arr[i + 1], weight: ns.weight, reps: ns.reps };
    onUpdate({ ...sessionData, sets: arr });
  };

  const progColor = suggestion.progression === "up" ? T.green : suggestion.progression === "stalled" ? T.red : suggestion.progression === "hold" ? T.yellow : suggestion.progression === "reset" ? T.blue : color;
  const ProgIcon = suggestion.progression === "up" ? TrendingUp : suggestion.progression === "stalled" || suggestion.progression === "hold" ? AlertCircle : MinusIcon;

  return (
    <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${isExpanded ? color + "44" : T.border}`, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "13px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, WebkitTapHighlightColor: "transparent" }}>
        <div style={{ width: 4, height: 36, background: isComplete ? T.green : color, borderRadius: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            {ex.name}
            {slotExercise.main && <span style={{ fontSize: 8, letterSpacing: 1, background: color + "22", color, padding: "2px 6px", borderRadius: 5, fontWeight: 800, flexShrink: 0 }}>MAIN</span>}
            {ex.id !== slotExercise.id && <span style={{ fontSize: 8, letterSpacing: 1, background: T.cardHi, color: T.mid, padding: "2px 6px", borderRadius: 5, fontWeight: 800, flexShrink: 0 }}>SWAP</span>}
          </div>
          <div style={{ fontSize: 10.5, color: T.mid, marginTop: 2 }}>
            {ex.sets}×{ex.repMin === ex.repMax ? ex.repMax : `${ex.repMin}–${ex.repMax}`}
            {suggestion.weight > 0 && ` · ${suggestion.weight}kg`}
            {` · rest ${ex.restSec}s`}
          </div>
        </div>
        {isComplete ? (
          <div style={{ width: 26, height: 26, borderRadius: 13, background: T.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={13} color="#0A0A0A" strokeWidth={3.5} /></div>
        ) : completed > 0 ? (
          <div style={{ fontSize: 11.5, fontWeight: 800, color, flexShrink: 0 }}>{completed}/{ex.sets}</div>
        ) : <div style={{ fontSize: 11.5, color: T.faint, flexShrink: 0 }}>0/{ex.sets}</div>}
        <ChevronRight size={16} color={T.dim} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </div>

      {isExpanded && (
        <div style={{ padding: "0 11px 11px" }}>
          <div style={{ background: color + "10", borderLeft: `3px solid ${color}`, padding: "9px 11px", borderRadius: "0 10px 10px 0", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: color, lineHeight: 1.45, marginBottom: 5 }}>{ex.note}</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 10.5, color: progColor, fontWeight: 700, lineHeight: 1.4 }}>
              <ProgIcon size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{suggestion.reason}</span>
            </div>
          </div>

          {canSwap && (
            <button onClick={() => setShowAlts(!showAlts)} style={{ width: "100%", padding: "9px", marginBottom: 8, borderRadius: 10, border: `1px dashed ${T.border2}`, background: "transparent", color: T.mid, fontSize: 10.5, fontWeight: 700, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Repeat size={12} /> {showAlts ? "HIDE ALTERNATIVES" : "SWAP EXERCISE (equipment busy?)"}
            </button>
          )}

          {showAlts && (
            <div style={{ marginBottom: 8 }}>
              {[slotExercise.id, ...(slotExercise.altIds || [])].map((aid) => {
                const alt = CATALOG[aid]; if (!alt) return null;
                const isCurrent = aid === ex.id;
                const lastUsed = getExerciseHistory(aid, history, 1)[0];
                return (
                  <div key={aid} onClick={() => { if (!isCurrent) { onSwap(aid); setShowAlts(false); } }}
                    style={{ padding: "10px 12px", marginBottom: 5, borderRadius: 10, border: `1px solid ${isCurrent ? color + "55" : T.border}`, background: isCurrent ? color + "12" : T.cardHi, cursor: isCurrent ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? color : T.text }}>{alt.name}</div>
                      <div style={{ fontSize: 9.5, color: T.dim, marginTop: 1 }}>
                        {alt.sets}×{alt.repMin === alt.repMax ? alt.repMax : `${alt.repMin}–${alt.repMax}`}
                        {lastUsed ? ` · last used ${daysAgo(lastUsed.date)}` : " · never used"}
                      </div>
                    </div>
                    {isCurrent && <Check size={14} color={color} />}
                  </div>
                );
              })}
            </div>
          )}

          {sets.map((s, i) => (
            <SetRow key={i} setIdx={i} set={s} exercise={ex} suggestion={suggestion}
              onChange={(ns) => updateSet(i, ns)} onComplete={() => updateSet(i, { ...sets[i], done: true })}
              isActive={i === activeIdx} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- WORKOUT VIEW ----------------

function WorkoutView({ data, workoutType, onBack, onSave }) {
  const workout = WORKOUTS[workoutType];
  const [expandedId, setExpandedId] = useState(workout.exercises[0].id);
  const [session, setSession] = useState(() => {
    if (data.currentSession && data.currentSession.workoutType === workoutType) return data.currentSession;
    return { workoutType, startedAt: new Date().toISOString(), exercises: {}, swaps: {} };
  });
  const [timer, setTimer] = useState(null); // {endsAt, total}
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer) return;
    const iv = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= timer.endsAt) { beep(); setTimer(null); }
    }, 300);
    return () => clearInterval(iv);
  }, [timer]);

  const swaps = session.swaps || {};
  const slots = workout.exercises.map((slot) => ({ slot, active: CATALOG[swaps[slot.id]] || slot }));

  const updateExercise = (activeId, exData, restSec) => {
    const ns = { ...session, exercises: { ...session.exercises, [activeId]: exData } };
    setSession(ns); onSave(ns, false);
    // start rest timer when a set was just completed
    if (data.settings?.restTimer !== false && restSec) setTimer({ endsAt: Date.now() + restSec * 1000, total: restSec });
  };

  const handleSwap = (slotId, altId) => {
    const ns = { ...session, swaps: { ...swaps, [slotId]: altId === slotId ? undefined : altId } };
    setSession(ns); onSave(ns, false);
  };

  const totalSets = slots.reduce((s, { active }) => s + active.sets, 0);
  const doneSets = slots.reduce((s, { active }) => s + (session.exercises[active.id]?.sets?.filter((x) => x.done).length || 0), 0);
  const vol = sessionVolume(session);
  const progress = totalSets ? (doneSets / totalSets) * 100 : 0;
  const remaining = timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : 0;

  const handleFinish = () => {
    const completed = { ...session, date: todayStr(), completedAt: new Date().toISOString() };
    onSave(completed, true);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, paddingBottom: 130 }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(9,9,11,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${workout.color}26`, padding: "12px 14px calc(10px)" , paddingTop: "calc(12px + env(safe-area-inset-top))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.mid, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: workout.color, fontWeight: 800 }}>{workout.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 1 }}>{workout.icon} {workout.name}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: workout.color }}>{doneSets}<span style={{ fontSize: 11, color: T.dim }}>/{totalSets}</span></div>
            <div style={{ fontSize: 8, color: T.dim, letterSpacing: 1 }}>{vol > 0 ? `${Math.round(vol)} KG VOL` : "SETS"}</div>
          </div>
        </div>
        <div style={{ marginTop: 9, height: 3, background: T.cardHi, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: workout.color, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {slots.map(({ slot, active }) => (
          <ExerciseCard key={slot.id} slotExercise={slot} activeExercise={active}
            sessionData={session.exercises[active.id]} history={data.history}
            isExpanded={expandedId === slot.id} onToggle={() => setExpandedId(expandedId === slot.id ? null : slot.id)}
            onUpdate={(d) => {
              const prevDone = session.exercises[active.id]?.sets?.filter((x) => x.done).length || 0;
              const newDone = d.sets?.filter((x) => x.done).length || 0;
              updateExercise(active.id, d, newDone > prevDone ? active.restSec : null);
            }}
            onSwap={(altId) => handleSwap(slot.id, altId)} color={workout.color} />
        ))}

        {doneSets > 0 && (
          <button onClick={handleFinish} style={{ width: "100%", padding: 16, marginTop: 12, borderRadius: 14, border: "none", background: workout.color, color: "#0A0A0A", fontSize: 13, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 24px ${workout.color}40`, WebkitTapHighlightColor: "transparent" }}>
            FINISH · {doneSets} SETS · {Math.round(vol)} KG
          </button>
        )}
      </div>

      {timer && remaining > 0 && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(20px + env(safe-area-inset-bottom))", zIndex: 50, background: T.cardHi, border: `1px solid ${workout.color}66`, borderRadius: 999, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", minWidth: 200 }}>
          <Timer size={16} color={workout.color} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text, fontVariantNumeric: "tabular-nums" }}>
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </div>
            <div style={{ height: 3, background: T.border, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(remaining / timer.total) * 100}%`, background: workout.color, transition: "width 0.3s linear" }} />
            </div>
          </div>
          <button onClick={() => setTimer(null)} style={{ background: "none", border: "none", color: T.mid, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>
            <SkipForward size={14} /> SKIP
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------- TODAY TAB ----------------

function TodayView({ data, banner, onDismissBanner, onStartWorkout, onLogCardio, onLogWeight, onOpenSettings }) {
  const r = useMemo(() => readiness(data), [data.history.length, data.cardio.length]);
  const rec = useMemo(() => todayRecommendation(data), [data.history.length, data.cardio.length, data.rotationIndex]);
  const report = useMemo(() => weeklyReport(data), [data.history.length, data.cardio.length]);
  const streak = calcStreak(data.history, data.cardio);
  const bw = useMemo(() => bodyweightTrend(data.bodyWeight), [data.bodyWeight.length]);
  const bandColor = BAND_COLOR[r.band];
  const next = WORKOUTS[ROTATION[data.rotationIndex]];

  return (
    <div style={{ padding: "0 14px" }}>
      <div style={{ padding: "22px 2px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3.5, color: T.red, fontWeight: 800 }}>ARK FITNESS</div>
          <div style={{ fontSize: 25, fontWeight: 800, marginTop: 2, letterSpacing: -0.5 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </div>
          <div style={{ fontSize: 11.5, color: T.mid, marginTop: 2 }}>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })} · Barbell Era</div>
        </div>
        <button onClick={onOpenSettings} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: T.mid, cursor: "pointer" }}><SettingsIcon size={17} /></button>
      </div>

      {banner && (
        <Card style={{ marginBottom: 12, borderColor: "rgba(74,222,128,0.35)", background: "rgba(74,222,128,0.06)", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
          <Trophy size={18} color={T.green} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, color: T.text, lineHeight: 1.45 }}>{banner}</div>
          <button onClick={onDismissBanner} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={15} /></button>
        </Card>
      )}

      {/* Readiness + week rings */}
      <Card style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
        <Ring size={116} stroke={10} pct={r.score / 100} color={bandColor}>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.text, lineHeight: 1 }}>{r.score}</div>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: bandColor, fontWeight: 800, marginTop: 3 }}>{r.label.toUpperCase()}</div>
        </Ring>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: T.dim, fontWeight: 700, marginBottom: 7 }}>READINESS</div>
          {r.factors.slice(0, 3).map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start" }}>
              <div style={{ width: 5, height: 5, borderRadius: 3, background: f.good ? T.green : T.yellow, marginTop: 4.5, flexShrink: 0 }} />
              <div style={{ fontSize: 10.5, color: T.mid, lineHeight: 1.4 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendation */}
      <div
        onClick={() => rec.workout && onStartWorkout(rec.workout.id)}
        style={{
          background: rec.workout ? `linear-gradient(135deg, ${rec.workout.color}1F, ${rec.workout.color}08)` : `linear-gradient(135deg, ${T.blue}18, transparent)`,
          border: `1px solid ${rec.workout ? rec.workout.color + "50" : T.blue + "40"}`,
          borderRadius: 16, padding: 18, marginBottom: 12, cursor: rec.workout ? "pointer" : "default",
          position: "relative", overflow: "hidden", WebkitTapHighlightColor: "transparent",
        }}>
        {rec.workout && <div style={{ position: "absolute", top: -12, right: -8, fontSize: 68, opacity: 0.08 }}>{rec.workout.icon}</div>}
        <div style={{ fontSize: 9, letterSpacing: 3, color: rec.workout ? rec.workout.color : T.blue, fontWeight: 800 }}>
          {rec.kind === "train" ? "UP NEXT" : rec.kind === "urgent" ? "OVERDUE" : rec.kind === "cardio" ? "COACH CALL" : "TODAY"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 5, letterSpacing: -0.3 }}>{rec.title}</div>
        <div style={{ fontSize: 11.5, color: T.mid, marginTop: 4, lineHeight: 1.5 }}>{rec.sub}</div>
        {rec.workout && (
          <button style={{ marginTop: 13, padding: "12px 18px", background: rec.workout.color, color: "#0A0A0A", border: "none", borderRadius: 11, fontSize: 11, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit" }}>
            START {rec.workout.label} →
          </button>
        )}
        {rec.kind === "cardio" && (
          <button onClick={onLogCardio} style={{ marginTop: 13, padding: "12px 18px", background: T.blue, color: "#0A0A0A", border: "none", borderRadius: 11, fontSize: 11, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit" }}>
            LOG CARDIO →
          </button>
        )}
      </div>

      {/* Week snapshot */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <Card style={{ padding: "12px 10px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.red, display: "flex", alignItems: "center", gap: 4 }}><Flame size={14} />{streak}</div>
          <div style={{ fontSize: 8, color: T.dim, letterSpacing: 1, marginTop: 3 }}>STREAK</div>
        </Card>
        <Card style={{ padding: "12px 10px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.yellow }}>{report.sessions}<span style={{ fontSize: 11, color: T.dim }}>/4</span></div>
          <div style={{ fontSize: 8, color: T.dim, letterSpacing: 1, marginTop: 3 }}>LIFTS THIS WK</div>
        </Card>
        <Card style={{ padding: "12px 10px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.blue }}>{report.cardioMin}<span style={{ fontSize: 11, color: T.dim }}>m</span></div>
          <div style={{ fontSize: 8, color: T.dim, letterSpacing: 1, marginTop: 3 }}>CARDIO / 90m</div>
        </Card>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <Card onClick={onLogCardio} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px" }}>
          <Activity size={17} color={T.blue} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Log Cardio</div>
            <div style={{ fontSize: 9.5, color: T.dim }}>Zone-2 walk / run</div>
          </div>
        </Card>
        <Card onClick={onLogWeight} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px" }}>
          <Scale size={17} color={T.violet} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Log Weight</div>
            <div style={{ fontSize: 9.5, color: T.dim }}>{bw ? `${bw.latest.kg} kg → ${BODYWEIGHT_TARGET}` : `Target ${BODYWEIGHT_TARGET} kg`}</div>
          </div>
        </Card>
      </div>

      {bw && bw.ratePerWeek != null && (
        <Card style={{ marginBottom: 12, padding: "13px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 18 }}>{bw.ratePerWeek < -0.05 ? "📉" : bw.ratePerWeek > 0.05 ? "📈" : "➡️"}</div>
            <div style={{ fontSize: 11.5, color: T.mid, lineHeight: 1.5 }}>
              {bw.ratePerWeek < -0.05
                ? <>Losing <b style={{ color: T.green }}>{Math.abs(bw.ratePerWeek)} kg/week</b>.{bw.etaWeeks ? <> At this rate you hit <b style={{ color: T.text }}>{BODYWEIGHT_TARGET} kg in ~{bw.etaWeeks} weeks</b>.</> : null}</>
                : bw.ratePerWeek > 0.05
                  ? <>Weight trending <b style={{ color: T.yellow }}>up {bw.ratePerWeek} kg/week</b>. Deficit isn't real yet — audit the snacks.</>
                  : <>Weight flat. Maintenance mode — tighten the deficit to move toward {BODYWEIGHT_TARGET} kg.</>}
            </div>
          </div>
        </Card>
      )}

      {/* Rotation strip */}
      <SectionLabel>ROTATION</SectionLabel>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {ROTATION.map((wt, i) => {
          const w = WORKOUTS[wt]; const isNext = i === data.rotationIndex;
          return (
            <div key={wt} onClick={() => onStartWorkout(wt)} style={{ flex: 1, padding: "10px 4px", background: isNext ? `${w.color}1C` : T.card, border: `1px solid ${isNext ? w.color + "55" : T.border}`, borderRadius: 12, textAlign: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
              <div style={{ fontSize: 17 }}>{w.icon}</div>
              <div style={{ fontSize: 8, fontWeight: 800, color: isNext ? w.color : T.dim, marginTop: 3, letterSpacing: 1 }}>{w.label}</div>
            </div>
          );
        })}
      </div>

      <Card style={{ background: "linear-gradient(135deg, #14142A, #101024)", borderColor: "#26264A", marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#7C7CF0", fontWeight: 800, marginBottom: 10 }}>THE TWO RULES</div>
        <div style={{ display: "flex", gap: 9, marginBottom: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: T.red, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, color: "#0A0A0A" }}>1</div>
          <div style={{ fontSize: 11, color: "#C9C9E8", lineHeight: 1.45 }}>Log every set. Beat last session by 1 rep or 2.5 kg.</div>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: T.yellow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, color: "#0A0A0A" }}>2</div>
          <div style={{ fontSize: 11, color: "#C9C9E8", lineHeight: 1.45 }}>4 protein meals daily. No junk between meals. Period.</div>
        </div>
      </Card>
    </div>
  );
}

// ---------------- TRAIN TAB ----------------

function TrainView({ data, onStartWorkout }) {
  return (
    <div style={{ padding: "0 14px" }}>
      <div style={{ padding: "22px 2px 14px" }}>
        <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Train</div>
        <div style={{ fontSize: 11.5, color: T.mid, marginTop: 2 }}>Rotation: Push → Legs → Pull → Sculptor. Next one is highlighted.</div>
      </div>
      {ROTATION.map((wt, i) => {
        const w = WORKOUTS[wt];
        const isNext = i === data.rotationIndex;
        const lastOfType = [...data.history].reverse().find((s) => s.workoutType === wt);
        return (
          <div key={wt} onClick={() => onStartWorkout(wt)} style={{ background: isNext ? `linear-gradient(135deg, ${w.color}1F, ${w.color}08)` : T.card, border: `1px solid ${isNext ? w.color + "55" : T.border}`, borderRadius: 16, padding: 16, marginBottom: 10, cursor: "pointer", position: "relative", overflow: "hidden", WebkitTapHighlightColor: "transparent" }}>
            <div style={{ position: "absolute", top: -10, right: -6, fontSize: 58, opacity: 0.07 }}>{w.icon}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: w.color, fontWeight: 800 }}>{w.label}</div>
              {isNext && <div style={{ fontSize: 8, letterSpacing: 1, background: w.color, color: "#0A0A0A", padding: "2px 7px", borderRadius: 6, fontWeight: 800 }}>UP NEXT</div>}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{w.icon} {w.name}</div>
            <div style={{ fontSize: 11, color: T.mid, marginTop: 3 }}>
              {w.exercises.length} exercises · {lastOfType ? `last done ${daysAgo(lastOfType.date)}` : "not yet done"}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 10.5, color: T.dim, lineHeight: 1.6, padding: "4px 4px 8px" }}>
        Tapping any workout starts it and, on finish, the rotation advances from there. Cardio is logged from the Today tab and never advances the rotation.
      </div>
    </div>
  );
}

// ---------------- INSIGHTS TAB ----------------

function Heatmap({ cells }) {
  const levels = ["#17171C", "#1E3A5F", "#14532D", "#15803D", "#22C55E"];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {week.map((c, di) => (
            <div key={di} title={c.date} style={{ width: 13, height: 13, borderRadius: 3.5, background: levels[c.level] }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function InsightsView({ data }) {
  const report = useMemo(() => weeklyReport(data), [data.history.length, data.cardio.length]);
  const stalls = useMemo(() => stalledLifts(data.history), [data.history.length]);
  const balance = useMemo(() => muscleBalance(data.history), [data.history.length]);
  const cells = useMemo(() => heatmapData(data), [data.history.length, data.cardio.length]);
  const acwr = useMemo(() => calcACWR(data.history), [data.history.length]);
  const bw = useMemo(() => bodyweightTrend(data.bodyWeight), [data.bodyWeight.length]);

  // 8-week volume trend
  const volTrend = useMemo(() => {
    const out = [];
    for (let w = 7; w >= 0; w--) {
      const from = new Date(Date.now() - (w + 1) * 7 * 86400000);
      const to = new Date(Date.now() - w * 7 * 86400000);
      const vol = data.history.filter((s) => { const t = new Date(s.date); return t >= from && t < to; }).reduce((sum, s) => sum + sessionVolume(s), 0);
      out.push({ week: w === 0 ? "now" : `-${w}w`, volume: Math.round(vol) });
    }
    return out;
  }, [data.history.length]);

  // Big-3 e1RM series
  const e1rmSeries = useMemo(() => {
    const byDate = {};
    for (const id of BIG_THREE) {
      const past = getExerciseHistory(id, data.history, 50).reverse();
      for (const p of past) {
        const e = bestE1RM(p.sets);
        if (e > 0) {
          byDate[p.date] = byDate[p.date] || { date: fmtDate(p.date) };
          byDate[p.date][id] = Math.round(e * 10) / 10;
        }
      }
    }
    return Object.entries(byDate).sort(([a], [b]) => new Date(a) - new Date(b)).map(([, v]) => v);
  }, [data.history.length]);
  const hasE1RM = e1rmSeries.length >= 2;

  const totalByType = balance.byType;
  const maxType = Math.max(1, ...Object.values(totalByType));

  return (
    <div style={{ padding: "0 14px" }}>
      <div style={{ padding: "22px 2px 14px" }}>
        <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Insights</div>
        <div style={{ fontSize: 11.5, color: T.mid, marginTop: 2 }}>What the data says. No feelings, just numbers.</div>
      </div>

      {/* Weekly report */}
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>THIS WEEK VS LAST</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{report.sessions}<span style={{ fontSize: 12, color: T.dim }}> vs {report.lastSessions}</span></div>
            <div style={{ fontSize: 8.5, color: T.dim, letterSpacing: 1, marginTop: 2 }}>SESSIONS</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: report.volDelta > 0 ? T.green : report.volDelta < 0 ? T.red : T.text }}>
              {(report.volume / 1000).toFixed(1)}k
              {report.volDelta != null && <span style={{ fontSize: 11 }}> {report.volDelta > 0 ? "▲" : report.volDelta < 0 ? "▼" : ""}{Math.abs(report.volDelta)}%</span>}
            </div>
            <div style={{ fontSize: 8.5, color: T.dim, letterSpacing: 1, marginTop: 2 }}>VOLUME KG</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: report.prCount > 0 ? T.green : T.text }}>{report.prCount} <span style={{ fontSize: 14 }}>🏆</span></div>
            <div style={{ fontSize: 8.5, color: T.dim, letterSpacing: 1, marginTop: 2 }}>PRs</div>
          </div>
        </div>
        {acwr.ratio != null && (
          <div style={{ marginTop: 12, padding: "9px 11px", background: T.cardHi, borderRadius: 10, fontSize: 10.5, color: T.mid, lineHeight: 1.5 }}>
            <b style={{ color: acwr.ratio > 1.5 ? T.red : acwr.ratio > 1.3 ? T.yellow : acwr.ratio < 0.8 ? T.yellow : T.green }}>ACWR {acwr.ratio.toFixed(2)}</b>
            {" — "}{acwr.ratio > 1.5 ? "load spiking, injury-risk zone. Ease off." : acwr.ratio > 1.3 ? "ramping fast. Watch recovery." : acwr.ratio < 0.8 ? "below baseline. Volume slipping." : "in the ideal 0.8–1.3 progression zone."}
          </div>
        )}
      </Card>

      {/* Consistency heatmap */}
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>LAST 12 WEEKS</SectionLabel>
        <Heatmap cells={cells} />
        <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 9, color: T.dim, alignItems: "center" }}>
          <span>Less</span>
          {["#17171C", "#1E3A5F", "#14532D", "#15803D", "#22C55E"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: c }} />)}
          <span>More</span>
          <span style={{ marginLeft: "auto" }}>blue = cardio only</span>
        </div>
      </Card>

      {/* Volume trend */}
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>VOLUME TREND (8 WEEKS)</SectionLabel>
        <div style={{ width: "100%", height: 120 }}>
          <ResponsiveContainer>
            <BarChart data={volTrend} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
              <XAxis dataKey="week" stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
              <YAxis stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: T.bg, border: `1px solid ${T.border2}`, borderRadius: 10, fontSize: 11 }} labelStyle={{ color: T.mid }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="volume" radius={[5, 5, 0, 0]} fill={T.red} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Big 3 strength curve */}
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>BIG-3 STRENGTH (EST. 1RM)</SectionLabel>
        {hasE1RM ? (
          <>
            <div style={{ width: "100%", height: 150 }}>
              <ResponsiveContainer>
                <LineChart data={e1rmSeries} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
                  <XAxis dataKey="date" stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <YAxis stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: T.bg, border: `1px solid ${T.border2}`, borderRadius: 10, fontSize: 11 }} labelStyle={{ color: T.mid }} />
                  <Line type="monotone" dataKey="barbell_bench_press" name="Bench" stroke={T.red} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="barbell_back_squat" name="Squat" stroke="#FFA028" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="trap_bar_deadlift" name="Deadlift" stroke={T.green} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 9.5, color: T.dim }}>
              <span><span style={{ color: T.red }}>●</span> Bench</span>
              <span><span style={{ color: "#FFA028" }}>●</span> Squat</span>
              <span><span style={{ color: T.green }}>●</span> Deadlift</span>
            </div>
          </>
        ) : (
          <div style={{ padding: "16px 4px", fontSize: 11.5, color: T.dim, lineHeight: 1.6 }}>
            Log 2+ sessions of Bench, Squat, or Deadlift to unlock your strength curve. Estimated 1RM is computed from your best set (Epley formula) — the truest measure of whether you're actually getting stronger.
          </div>
        )}
      </Card>

      {/* Muscle balance */}
      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>MUSCLE BALANCE (28 DAYS)</SectionLabel>
        {Object.entries(totalByType).map(([type, vol]) => {
          const w = WORKOUTS[type];
          return (
            <div key={type} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                <span style={{ color: T.mid, fontWeight: 700 }}>{w.icon} {w.label}</span>
                <span style={{ color: T.dim }}>{Math.round(vol).toLocaleString()} kg</span>
              </div>
              <div style={{ height: 7, background: T.cardHi, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(vol / maxType) * 100}%`, background: w.color, borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>
          );
        })}
        {balance.flag && (
          <div style={{ marginTop: 10, padding: "9px 11px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 10, fontSize: 10.5, color: "#FDE68A", lineHeight: 1.5 }}>
            ⚠️ {balance.flag}
          </div>
        )}
      </Card>

      {/* Stalled lifts */}
      {stalls.length > 0 && (
        <Card style={{ marginBottom: 12, borderColor: "rgba(250,75,75,0.3)" }}>
          <SectionLabel>STALLED LIFTS — ACTION NEEDED</SectionLabel>
          {stalls.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
              <AlertCircle size={15} color={T.red} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{s.name}</div>
                <div style={{ fontSize: 10, color: T.mid, marginTop: 1 }}>{s.sessions} sessions stuck at {s.weight}kg — fight for +1 rep or deload 10%</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Bodyweight */}
      <Card style={{ marginBottom: 8 }}>
        <SectionLabel>BODYWEIGHT → {BODYWEIGHT_TARGET} KG</SectionLabel>
        {bw && bw.series.length >= 2 ? (
          <>
            <div style={{ width: "100%", height: 140 }}>
              <ResponsiveContainer>
                <LineChart data={bw.series.map((p) => ({ ...p, d: fmtDate(p.date) }))} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                  <XAxis dataKey="d" stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: T.bg, border: `1px solid ${T.border2}`, borderRadius: 10, fontSize: 11 }} labelStyle={{ color: T.mid }} />
                  <ReferenceLine y={BODYWEIGHT_TARGET} stroke={T.green} strokeDasharray="5 4" />
                  <Line type="monotone" dataKey="kg" stroke={T.faint} strokeWidth={1.5} dot={{ r: 2, fill: T.faint }} name="Daily" />
                  <Line type="monotone" dataKey="ma" stroke={T.violet} strokeWidth={2.5} dot={false} name="7-day avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>
              <span style={{ color: T.violet }}>—</span> 7-day average (trust this) · <span style={{ color: T.faint }}>—</span> daily (noise) · <span style={{ color: T.green }}>- -</span> target
            </div>
          </>
        ) : (
          <div style={{ padding: "14px 4px", fontSize: 11.5, color: T.dim, lineHeight: 1.6 }}>
            Log your weight from the Today tab (2+ entries needed). You'll get a 7-day trend line and a projected date to hit {BODYWEIGHT_TARGET} kg — that projection is a stronger motivator than any mirror check.
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------- HISTORY TAB ----------------

function HistoryView({ data, onSelectExercise }) {
  const allExercises = useMemo(() => {
    const out = [];
    for (const ex of Object.values(CATALOG)) {
      const sessions = getExerciseHistory(ex.id, data.history, 1);
      if (sessions.length > 0) out.push({ ...ex, lastSession: sessions[0] });
    }
    return out.sort((a, b) => new Date(b.lastSession.date) - new Date(a.lastSession.date));
  }, [data.history.length]);

  const recent = [...data.history].reverse().slice(0, 25);
  const recentCardio = [...data.cardio].reverse().slice(0, 5);

  return (
    <div style={{ padding: "0 14px" }}>
      <div style={{ padding: "22px 2px 14px" }}>
        <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>History</div>
        <div style={{ fontSize: 11.5, color: T.mid, marginTop: 2 }}>{data.history.length} workouts · {data.cardio.length} cardio sessions logged</div>
      </div>

      <SectionLabel>SESSIONS</SectionLabel>
      {recent.length === 0 ? (
        <Card style={{ textAlign: "center", color: T.dim, fontSize: 12, marginBottom: 16 }}>No workouts yet. Everything you log lives here forever.</Card>
      ) : recent.map((s, i) => {
        const w = WORKOUTS[s.workoutType]; if (!w) return null;
        const sets = sessionSets(s), vol = Math.round(sessionVolume(s));
        const dur = s.startedAt && s.completedAt ? Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 60000) : null;
        return (
          <div key={s.id || i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 19 }}>{w.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                {w.name}
                {s.prs?.length > 0 && <span style={{ fontSize: 10 }}>🏆×{s.prs.length}</span>}
              </div>
              <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                {fmtDate(s.date)} · {sets} sets · {vol > 0 ? `${vol}kg` : ""}{dur && dur > 0 && dur < 180 ? ` · ${dur}min` : ""}
              </div>
            </div>
            <div style={{ width: 4, height: 26, background: w.color, borderRadius: 2, flexShrink: 0 }} />
          </div>
        );
      })}

      {recentCardio.length > 0 && (
        <>
          <SectionLabel>CARDIO</SectionLabel>
          {recentCardio.map((c, i) => {
            const ct = CARDIO_TYPES.find((x) => x.id === c.type);
            return (
              <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 17 }}>{ct?.icon || "🏃"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ct?.name || c.type}</div>
                  <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{fmtDate(c.date)} · {c.minutes} min</div>
                </div>
                <div style={{ width: 4, height: 26, background: T.blue, borderRadius: 2 }} />
              </div>
            );
          })}
        </>
      )}

      <SectionLabel>EXERCISE TRENDS</SectionLabel>
      {allExercises.length === 0 ? (
        <Card style={{ textAlign: "center", color: T.dim, fontSize: 12 }}>Complete a workout to unlock per-exercise trends.</Card>
      ) : allExercises.map((ex) => {
        const lw = ex.lastSession.sets.filter((s) => s.weight)[0]?.weight;
        return (
          <div key={ex.id} onClick={() => onSelectExercise(ex.id)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, WebkitTapHighlightColor: "transparent" }}>
            <div style={{ width: 3, height: 26, background: ex.color, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
              <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{lw ? `Last ${lw}kg · ` : ""}{daysAgo(ex.lastSession.date)}</div>
            </div>
            <ChevronRight size={14} color={T.faint} style={{ flexShrink: 0 }} />
          </div>
        );
      })}
      <div style={{ height: 8 }} />
    </div>
  );
}

// ---------------- EXERCISE DETAIL ----------------

function ExerciseDetailView({ exerciseId, history, onBack }) {
  const ex = CATALOG[exerciseId];
  if (!ex) return null;
  const past = getExerciseHistory(exerciseId, history, 60).reverse();

  const chartData = past.map((s) => {
    const withReps = s.sets.filter((x) => x.reps);
    if (!withReps.length) return null;
    const maxW = Math.max(...withReps.map((x) => parseFloat(x.weight) || 0));
    const e1 = bestE1RM(withReps);
    return { date: fmtDate(s.date), weight: maxW, e1rm: Math.round(e1 * 10) / 10 };
  }).filter(Boolean);

  const allSets = past.flatMap((s) => s.sets).filter((s) => s.reps);
  const pr = allSets.length ? Math.max(...allSets.map((s) => parseFloat(s.weight) || 0)) : 0;
  const bestE = allSets.length ? Math.max(...chartData.map((c) => c.e1rm || 0)) : 0;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, paddingBottom: 40 }}>
      <div style={{ padding: "12px 14px", paddingTop: "calc(12px + env(safe-area-inset-top))", borderBottom: `1px solid ${ex.color}26`, display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, background: "rgba(9,9,11,0.92)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.mid, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: ex.color, fontWeight: 800 }}>{ex.label}{ex.isAlt ? " · ALTERNATE" : ""}</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 12 }}>
          {[["BEST WT", `${pr}`, "kg"], ["EST 1RM", `${Math.round(bestE)}`, "kg"], ["SESSIONS", `${past.length}`, ""]].map(([l, v, u]) => (
            <Card key={l} style={{ padding: "11px 9px" }}>
              <div style={{ fontSize: 8, letterSpacing: 1.5, color: T.dim }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: ex.color, marginTop: 3 }}>{v}<span style={{ fontSize: 10, color: T.dim }}>{u}</span></div>
            </Card>
          ))}
        </div>

        {chartData.length > 1 && (
          <Card style={{ marginBottom: 12 }}>
            <SectionLabel>PROGRESSION</SectionLabel>
            <div style={{ width: "100%", height: 150 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
                  <XAxis dataKey="date" stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <YAxis stroke={T.dim} fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: T.bg, border: `1px solid ${T.border2}`, borderRadius: 10, fontSize: 11 }} labelStyle={{ color: T.mid }} />
                  <Line type="monotone" dataKey="weight" name="Top set" stroke={ex.color} strokeWidth={2.5} dot={{ fill: ex.color, r: 3 }} />
                  <Line type="monotone" dataKey="e1rm" name="Est 1RM" stroke={T.dim} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 9.5, color: T.dim, marginTop: 4 }}><span style={{ color: ex.color }}>—</span> top-set weight · <span>- -</span> estimated 1RM</div>
          </Card>
        )}

        <SectionLabel>ALL SESSIONS</SectionLabel>
        {past.length === 0 ? (
          <Card style={{ textAlign: "center", color: T.dim, fontSize: 12 }}>No data yet for this movement.</Card>
        ) : past.slice().reverse().map((s, i) => (
          <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.mid }}>{fmtDate(s.date)}</div>
              <div style={{ fontSize: 9, color: T.dim }}>{daysAgo(s.date)}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {s.sets.filter((x) => x.reps).map((x, j) => (
                <div key={j} style={{ padding: "3px 8px", background: T.bg, borderRadius: 6, fontSize: 10.5, color: "#CCC", border: `1px solid ${T.border}` }}>
                  {x.weight ? `${x.weight}×` : ""}{x.reps}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- MODALS ----------------

function CardioSheet({ open, onClose, onSave }) {
  const [type, setType] = useState(CARDIO_TYPES[0].id);
  const [minutes, setMinutes] = useState(25);
  return (
    <Sheet open={open} onClose={onClose} title="Log Cardio">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {CARDIO_TYPES.map((c) => (
          <div key={c.id} onClick={() => { setType(c.id); setMinutes(c.defaultMin); }} style={{ padding: "13px 12px", borderRadius: 12, border: `1px solid ${type === c.id ? T.blue : T.border}`, background: type === c.id ? "rgba(96,165,250,0.1)" : T.cardHi, cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>{c.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: type === c.id ? T.blue : T.text }}>{c.name}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, letterSpacing: 2, color: T.dim, fontWeight: 700, marginBottom: 8 }}>DURATION (MIN)</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMinutes(Math.max(5, minutes - 5))} style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${T.border2}`, background: T.cardHi, color: T.text, cursor: "pointer", fontSize: 18 }}>−</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 28, fontWeight: 800 }}>{minutes}</div>
        <button onClick={() => setMinutes(minutes + 5)} style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${T.border2}`, background: T.cardHi, color: T.text, cursor: "pointer", fontSize: 18 }}>+</button>
      </div>
      <button onClick={() => { onSave({ type, minutes, date: todayStr() }); onClose(); }} style={{ width: "100%", padding: 15, borderRadius: 12, border: "none", background: T.blue, color: "#0A0A0A", fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit" }}>
        SAVE CARDIO
      </button>
    </Sheet>
  );
}

function WeightSheet({ open, onClose, onSave, lastKg }) {
  const [kg, setKg] = useState(lastKg || 85);
  useEffect(() => { if (open && lastKg) setKg(lastKg); }, [open, lastKg]);
  return (
    <Sheet open={open} onClose={onClose} title="Log Bodyweight">
      <div style={{ fontSize: 11, color: T.mid, marginBottom: 14, lineHeight: 1.5 }}>Weigh in the morning, after the bathroom, before food. Same conditions daily — the 7-day average does the rest.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setKg(Math.round((kg - 0.1) * 10) / 10)} style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${T.border2}`, background: T.cardHi, color: T.text, cursor: "pointer", fontSize: 18 }}>−</button>
        <input type="number" inputMode="decimal" value={kg} onChange={(e) => setKg(parseFloat(e.target.value) || 0)}
          style={{ flex: 1, background: "#0C0C0F", border: `1px solid ${T.border2}`, borderRadius: 12, padding: "12px", color: T.text, fontSize: 26, fontWeight: 800, fontFamily: "inherit", textAlign: "center", outline: "none" }} />
        <button onClick={() => setKg(Math.round((kg + 0.1) * 10) / 10)} style={{ width: 44, height: 44, borderRadius: 12, border: `1px solid ${T.border2}`, background: T.cardHi, color: T.text, cursor: "pointer", fontSize: 18 }}>+</button>
      </div>
      <button onClick={() => { if (kg > 30 && kg < 200) { onSave({ kg: Math.round(kg * 10) / 10, date: todayStr() }); onClose(); } }} style={{ width: "100%", padding: 15, borderRadius: 12, border: "none", background: T.violet, color: "#0A0A0A", fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit" }}>
        SAVE WEIGHT
      </button>
    </Sheet>
  );
}

function SettingsSheet({ open, onClose, data, onImport, onToggleTimer, onReset }) {
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  const doExport = () => {
    const json = exportJSON(data);
    try {
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ark-fitness-backup-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* fall through to clipboard */ }
    navigator.clipboard?.writeText(json).then(() => setMsg({ ok: true, text: "Backup downloaded + copied to clipboard." })).catch(() => setMsg({ ok: true, text: "Backup file downloaded." }));
  };

  const doImport = (text) => {
    try {
      const migrated = validateImport(text);
      onImport(migrated);
      setMsg({ ok: true, text: `Imported ${migrated.history.length} workouts, ${migrated.bodyWeight.length} weigh-ins, ${migrated.cardio.length} cardio sessions.` });
      setImportText("");
    } catch (e) {
      setMsg({ ok: false, text: `Import failed: ${e.message}` });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Settings & Data">
      <div style={{ fontSize: 10, letterSpacing: 2, color: T.dim, fontWeight: 700, marginBottom: 8 }}>YOUR DATA</div>
      <div style={{ fontSize: 11, color: T.mid, marginBottom: 12, lineHeight: 1.55 }}>
        {data.history.length} workouts · {data.bodyWeight.length} weigh-ins · {data.cardio.length} cardio sessions.
        Data lives in this browser's storage. <b style={{ color: T.text }}>Moving to a new device or URL?</b> Export here, then Import there.
      </div>

      <button onClick={doExport} style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${T.border2}`, background: T.cardHi, color: T.text, fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
        <Download size={15} /> EXPORT BACKUP (JSON)
      </button>

      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => doImport(r.result); r.readAsText(f); } e.target.value = ""; }} />
      <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${T.border2}`, background: T.cardHi, color: T.text, fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
        <Upload size={15} /> IMPORT FROM FILE
      </button>

      <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="…or paste backup JSON here"
        style={{ width: "100%", height: 64, background: "#0C0C0F", border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, color: T.text, fontSize: 10.5, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
      {importText.trim() && (
        <button onClick={() => doImport(importText)} style={{ width: "100%", padding: 11, marginTop: 6, borderRadius: 10, border: "none", background: T.green, color: "#0A0A0A", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>
          IMPORT PASTED DATA
        </button>
      )}

      {msg && <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 10, fontSize: 11, lineHeight: 1.45, background: msg.ok ? "rgba(74,222,128,0.1)" : "rgba(250,75,75,0.1)", color: msg.ok ? "#B7EFC5" : "#FCA5A5", border: `1px solid ${msg.ok ? "rgba(74,222,128,0.3)" : "rgba(250,75,75,0.3)"}` }}>{msg.text}</div>}

      <div style={{ height: 1, background: T.border, margin: "16px 0" }} />

      <div onClick={onToggleTimer} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0 16px", cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Rest timer</div>
          <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Auto-starts after each logged set</div>
        </div>
        <div style={{ width: 44, height: 26, borderRadius: 13, background: data.settings?.restTimer !== false ? T.green : T.cardHi, border: `1px solid ${T.border2}`, position: "relative", transition: "background 0.2s" }}>
          <div style={{ position: "absolute", top: 2, left: data.settings?.restTimer !== false ? 20 : 2, width: 20, height: 20, borderRadius: 10, background: "#fff", transition: "left 0.2s" }} />
        </div>
      </div>

      <button onClick={onReset} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(250,75,75,0.35)", background: "rgba(250,75,75,0.06)", color: "#FCA5A5", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>
        RESET ALL DATA
      </button>
      <div style={{ fontSize: 9.5, color: T.faint, textAlign: "center", marginTop: 14 }}>ARK Fitness v2.0 · Barbell Era · Built for Ayush</div>
    </Sheet>
  );
}

// ---------------- BOTTOM NAV ----------------

function BottomNav({ tab, setTab }) {
  const items = [
    { id: "today", icon: Home, label: "Today" },
    { id: "train", icon: Dumbbell, label: "Train" },
    { id: "insights", icon: BarChart3, label: "Insights" },
    { id: "history", icon: HistoryIcon, label: "History" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 500, background: "rgba(13,13,16,0.94)", backdropFilter: "blur(16px)", borderTop: `1px solid ${T.border}`, display: "flex", zIndex: 40, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map((it) => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{ flex: 1, padding: "10px 0 8px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, WebkitTapHighlightColor: "transparent", fontFamily: "inherit" }}>
            <Icon size={20} color={active ? T.text : T.dim} strokeWidth={active ? 2.4 : 2} />
            <div style={{ fontSize: 8.5, letterSpacing: 0.5, fontWeight: 700, color: active ? T.text : T.dim }}>{it.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------- MAIN APP ----------------

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("today");
  const [screen, setScreen] = useState(null); // null | {type:'workout',workoutType} | {type:'exercise',id}
  const [banner, setBanner] = useState(null);
  const [showCardio, setShowCardio] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { setData(loadData()); }, []);
  const persist = useCallback((d) => { setData(d); saveData(d); }, []);

  if (!data) return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.mid, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ fontSize: 11, letterSpacing: 3 }}>LOADING…</div>
    </div>
  );

  const handleSaveSession = (session, isComplete) => {
    if (isComplete) {
      const prs = detectPRs(session, data.history);
      const completed = { ...session, id: `s_${Date.now()}`, prs };
      const idx = ROTATION.indexOf(session.workoutType);
      persist({ ...data, currentSession: null, history: [...data.history, completed], rotationIndex: (idx + 1) % ROTATION.length });
      const vol = Math.round(sessionVolume(completed));
      setBanner(prs.length > 0
        ? `Session banked — ${sessionSets(completed)} sets, ${vol} kg. ${prs.length} PR${prs.length > 1 ? "s" : ""}: ${prs.map((p) => `${p.name} ${p.weight}kg`).join(", ")} 🏆`
        : `Session banked — ${sessionSets(completed)} sets, ${vol} kg total volume. Beat it next time.`);
      setScreen(null); setTab("today");
    } else {
      persist({ ...data, currentSession: session });
    }
  };

  // Full-screen flows
  if (screen?.type === "workout") {
    return (
      <Shell>
        <WorkoutView data={data} workoutType={screen.workoutType} onBack={() => setScreen(null)} onSave={handleSaveSession} />
      </Shell>
    );
  }
  if (screen?.type === "exercise") {
    return (
      <Shell>
        <ExerciseDetailView exerciseId={screen.id} history={data.history} onBack={() => setScreen(null)} />
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, paddingBottom: 90, paddingTop: "env(safe-area-inset-top)" }}>
        {tab === "today" && (
          <TodayView data={data} banner={banner} onDismissBanner={() => setBanner(null)}
            onStartWorkout={(wt) => setScreen({ type: "workout", workoutType: wt })}
            onLogCardio={() => setShowCardio(true)} onLogWeight={() => setShowWeight(true)}
            onOpenSettings={() => setShowSettings(true)} />
        )}
        {tab === "train" && <TrainView data={data} onStartWorkout={(wt) => setScreen({ type: "workout", workoutType: wt })} />}
        {tab === "insights" && <InsightsView data={data} />}
        {tab === "history" && <HistoryView data={data} onSelectExercise={(id) => setScreen({ type: "exercise", id })} />}
      </div>

      <BottomNav tab={tab} setTab={setTab} />

      <CardioSheet open={showCardio} onClose={() => setShowCardio(false)} onSave={(c) => persist({ ...data, cardio: [...data.cardio, c] })} />
      <WeightSheet open={showWeight} onClose={() => setShowWeight(false)} lastKg={data.bodyWeight[data.bodyWeight.length - 1]?.kg}
        onSave={(w) => persist({ ...data, bodyWeight: [...data.bodyWeight.filter((x) => x.date !== w.date), w] })} />
      <SettingsSheet open={showSettings} onClose={() => setShowSettings(false)} data={data}
        onImport={(d) => persist(d)}
        onToggleTimer={() => persist({ ...data, settings: { ...data.settings, restTimer: data.settings?.restTimer === false } })}
        onReset={() => { if (confirm("Delete ALL workout history, weigh-ins and cardio? This cannot be undone.") && confirm("Really sure? Export a backup first if in doubt.")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }} />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ fontFamily: "'Space Grotesk', 'Inter', -apple-system, sans-serif", background: T.bg, minHeight: "100vh", maxWidth: 500, margin: "0 auto" }}>
      {children}
    </div>
  );
}
