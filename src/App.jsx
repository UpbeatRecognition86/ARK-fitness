import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, ReferenceLine } from "recharts";
import {
  ArrowLeft, ChevronRight, ChevronDown, Check, TrendingUp, Minus as MinusIcon, Plus, Minus,
  Flame, X, AlertCircle, Repeat, Settings as SettingsIcon, Download, Upload, Wind,
  Activity, Scale, Timer, SkipForward, Home, Dumbbell, BarChart3, History as HistoryIcon, Trophy, Camera, Copy, User,
} from "lucide-react";
import { WORKOUTS, CATALOG, ROTATION, CARDIO_TYPES, BIG_THREE, BODYWEIGHT_TARGET, WARMUPS, SETUP_GUIDES, COACH_LINES } from "./data.js";
import { savePhoto, getPhoto, compressImage } from "./photos.js";
import {
  loadData, saveData, exportJSON, validateImport, STORAGE_KEY,
  fmtDate, daysAgo, todayStr, getExerciseHistory, sessionVolume, sessionSets,
  getSuggestion, calcStreak, readiness, todayRecommendation, detectPRs,
  stalledLifts, muscleBalance, weeklyReport, heatmapData, bodyweightTrend,
  calcACWR, bestE1RM, achievements, waistTrend,
  blockStatus, briefing, computeCheckpointSummary, claudeHandoffText,
} from "./engine.js";

// ============ APPLE FITNESS DESIGN SYSTEM ============
const T = {
  bg: "#000000",
  tile: "#1C1C1E", tileHi: "#2C2C2E", tileHi2: "#3A3A3C",
  text: "#FFFFFF", sub: "#8E8E93", dim: "#636366", faint: "#48484A",
  move: "#FA114F", exercise: "#92E82A", stand: "#00D9F5",
  yellow: "#FFD60A", orange: "#FF9F0A", purple: "#BF5AF2", green: "#30D158",
  hairline: "rgba(255,255,255,0.08)",
};
const RING = {
  move: ["#FA114F", "#FF5C86"],
  exercise: ["#92E82A", "#D4FB53"],
  stand: ["#00D9F5", "#5CEBFF"],
};
const BAND_GRAD = {
  primed: RING.exercise,
  moderate: ["#FFD60A", "#FFE97A"],
  recover: RING.move,
};
const FEEL = { easy: "😌", solid: "💪", brutal: "🥵" };
const ON = { "#FA114F": "#FFFFFF", "#FF9F0A": "#1F1200", "#00D9F5": "#002229", "#BF5AF2": "#FFFFFF", "#92E82A": "#122400" };
const onColor = (c) => ON[c] || "#000";

const tile = (o = {}) => ({ background: T.tile, borderRadius: 20, padding: 16, ...o });
const tileSub = (o = {}) => ({ background: T.tileHi, borderRadius: 14, ...o });
const rise = (i = 0) => ({ animation: "riseIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both", animationDelay: `${Math.min(i, 9) * 0.07}s` });

function SectionTitle({ children, right, style }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "4px 2px 10px", ...style }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: -0.4 }}>{children}</div>
      {right}
    </div>
  );
}

function Label({ children, color = T.sub }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: 0.1 }}>{children}</div>;
}

function Ring({ size = 120, stroke = 11, pct = 0, colors = RING.exercise, track = "rgba(255,255,255,0.09)", children, id = "g" }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function TripleRings({ rings, size = 150 }) {
  const stroke = 14, gap = 3;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {rings.map((rg, i) => {
        const s = size - i * (stroke * 2 + gap * 2);
        return (
          <div key={i} style={{ position: "absolute", top: (size - s) / 2, left: (size - s) / 2 }}>
            <Ring size={s} stroke={stroke} pct={rg.pct} colors={rg.colors} id={`tri${i}`} />
          </div>
        );
      })}
    </div>
  );
}

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto",
        background: T.tile, borderRadius: "22px 22px 0 0",
        boxShadow: "0 -14px 50px rgba(0,0,0,0.7)",
        padding: "10px 18px calc(26px + env(safe-area-inset-bottom))",
        animation: "riseIn 0.4s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, background: T.tileHi2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: T.text, letterSpacing: -0.3 }}>{title}</div>
          <button onClick={onClose} style={{ ...tileSub({ borderRadius: 15 }), width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: T.sub, cursor: "pointer", border: "none" }}><X size={15} /></button>
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
  } catch { /* visual timer still works */ }
}

// ============ SET ROW ============

function SetRow({ setIdx, set, exercise, suggestion, onChange, onComplete, isActive, color }) {
  const isWeighted = exercise.type === "weighted" || exercise.type === "weighted_bw";
  const isTime = exercise.type === "time";
  const adjW = (d) => onChange({ ...set, weight: Math.max(0, (parseFloat(set.weight) || suggestion.weight || 0) + d) });
  const adjR = (d) => onChange({ ...set, reps: Math.max(0, (parseInt(set.reps) || (isTime ? 30 : exercise.repMin)) + d) });

  const Step = ({ children, onClick }) => (
    <button onClick={onClick} style={{ ...tileSub({ borderRadius: 12 }), width: 40, height: 40, border: "none", color: T.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>{children}</button>
  );
  const inputStyle = { flex: 1, minWidth: 0, background: "#000", border: `1px solid ${T.hairline}`, borderRadius: 12, padding: "11px 4px", color: T.text, fontSize: 20, fontWeight: 700, fontFamily: "inherit", textAlign: "center", outline: "none", WebkitAppearance: "none" };

  if (set.done) {
    return (
      <div style={{ display: "flex", alignItems: "center", padding: "11px 12px", background: "rgba(146,232,42,0.12)", borderRadius: 14, marginBottom: 6 }}>
        <div style={{ width: 30, fontSize: 11, color: T.exercise, fontWeight: 800 }}>S{setIdx + 1}</div>
        <div style={{ flex: 1, fontSize: 14, color: "#DBF7B8" }}>
          {isWeighted && set.weight ? <><b style={{ color: T.text }}>{set.weight}</b> kg × </> : null}
          <b style={{ color: T.text }}>{set.reps}</b> {isTime ? "sec" : "reps"}
        </div>
        <button onClick={() => onChange({ weight: set.weight, reps: set.reps, done: false })} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", padding: 4 }}><X size={15} /></button>
      </div>
    );
  }

  return (
    <div style={{ padding: 12, background: isActive ? T.tileHi : "#111112", borderRadius: 16, marginBottom: 7, border: isActive ? `1.5px solid ${color}66` : "1.5px solid transparent" }}>
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
            onChange={(e) => onChange({ ...set, weight: e.target.value })} style={inputStyle} />
          <Step onClick={() => adjW(2.5)}><Plus size={15} /></Step>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: T.dim, width: 30, letterSpacing: 1, flexShrink: 0 }}>{isTime ? "SEC" : "REP"}</div>
        <Step onClick={() => adjR(-1)}><Minus size={15} /></Step>
        <input type="number" inputMode="numeric" value={set.reps ?? ""} placeholder={exercise.repMin === exercise.repMax ? `${exercise.repMax}` : `${exercise.repMin}–${exercise.repMax}`}
          onChange={(e) => onChange({ ...set, reps: e.target.value })} style={inputStyle} />
        <Step onClick={() => adjR(1)}><Plus size={15} /></Step>
      </div>
      <button onClick={onComplete} disabled={!set.reps} style={{
        width: "100%", padding: 14, borderRadius: 13, border: "none",
        background: set.reps ? color : T.tileHi,
        color: set.reps ? onColor(color) : T.faint, fontSize: 12, fontWeight: 800, letterSpacing: 2,
        cursor: set.reps ? "pointer" : "not-allowed", fontFamily: "inherit",
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
      }}>
        ✓ LOG SET
      </button>
    </div>
  );
}

// ============ EXERCISE CARD ============

function ExerciseCard({ slotExercise, activeExercise, sessionData, history, isExpanded, onToggle, onUpdate, onSwap, color, idx, sugCtx }) {
  const ex = activeExercise;
  const suggestion = useMemo(() => getSuggestion(ex, history, sugCtx), [ex.id, history.length, sugCtx?.deload]);
  const sets = sessionData?.sets || Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false }));
  const completed = sets.filter((s) => s.done).length;
  const activeIdx = sets.findIndex((s) => !s.done);
  const isComplete = completed === ex.sets;
  const [showAlts, setShowAlts] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const canSwap = (slotExercise.altIds?.length > 0 || ex.id !== slotExercise.id) && completed === 0;
  const setup = SETUP_GUIDES[ex.id];

  const updateSet = (i, ns) => {
    const arr = [...sets]; arr[i] = ns;
    if (ns.done && i + 1 < ex.sets && !arr[i + 1].weight && !arr[i + 1].done) arr[i + 1] = { ...arr[i + 1], weight: ns.weight, reps: ns.reps };
    onUpdate({ ...sessionData, sets: arr });
  };

  const progColor = suggestion.progression === "up" ? T.exercise : suggestion.progression === "stalled" ? T.move : suggestion.progression === "hold" ? T.yellow : suggestion.progression === "reset" || suggestion.progression === "deload" ? T.stand : color;
  const ProgIcon = suggestion.progression === "up" ? TrendingUp : suggestion.progression === "stalled" || suggestion.progression === "hold" ? AlertCircle : MinusIcon;

  return (
    <div style={{ ...tile({ padding: 0, marginBottom: 10 }), overflow: "hidden", ...rise(idx) }}>
      <div onClick={onToggle} style={{ padding: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, WebkitTapHighlightColor: "transparent" }}>
        <div style={{ width: 4, height: 36, background: isComplete ? T.exercise : color, borderRadius: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
            {ex.name}
            {slotExercise.main && <span style={{ fontSize: 8, letterSpacing: 1, background: color, color: onColor(color), padding: "2.5px 7px", borderRadius: 6, fontWeight: 800, flexShrink: 0 }}>MAIN</span>}
            {ex.id !== slotExercise.id && <span style={{ fontSize: 8, letterSpacing: 1, background: T.tileHi, color: T.sub, padding: "2.5px 7px", borderRadius: 6, fontWeight: 800, flexShrink: 0 }}>SWAP</span>}
          </div>
          <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
            {ex.sets}×{ex.repMin === ex.repMax ? ex.repMax : `${ex.repMin}–${ex.repMax}`}
            {suggestion.weight > 0 && ` · ${suggestion.weight}kg`}
            {` · rest ${ex.restSec}s`}
          </div>
        </div>
        {isComplete ? (
          <div style={{ width: 26, height: 26, borderRadius: 13, background: T.exercise, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Check size={13} color="#122400" strokeWidth={3.5} /></div>
        ) : completed > 0 ? (
          <div style={{ fontSize: 12.5, fontWeight: 800, color, flexShrink: 0 }}>{completed}/{ex.sets}</div>
        ) : <div style={{ fontSize: 12.5, color: T.faint, flexShrink: 0 }}>0/{ex.sets}</div>}
        <ChevronRight size={16} color={T.dim} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </div>

      {isExpanded && (
        <div style={{ padding: "0 11px 11px" }}>
          <div style={{ background: "#111112", borderLeft: `3px solid ${color}`, padding: "9px 11px", borderRadius: "0 12px 12px 0", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color, lineHeight: 1.45, marginBottom: 5 }}>{ex.note}</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 10.5, color: progColor, fontWeight: 700, lineHeight: 1.4 }}>
              <ProgIcon size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{suggestion.reason}</span>
            </div>
          </div>

          {setup && (
            <div style={{ ...tileSub({ marginBottom: 8 }), overflow: "hidden" }}>
              <div onClick={() => setShowSetup(!showSetup)} style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <AlertCircle size={13} color={T.yellow} />
                <div style={{ flex: 1, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, color: T.yellow }}>SETUP CHECK</div>
                <ChevronDown size={14} color={T.dim} style={{ transform: showSetup ? "rotate(180deg)" : "none", transition: "0.2s" }} />
              </div>
              {showSetup && (
                <div style={{ padding: "0 12px 10px" }}>
                  {setup.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(255,214,10,0.18)", color: T.yellow, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <div style={{ fontSize: 11, color: T.sub, lineHeight: 1.45 }}>{s}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {canSwap && (
            <button onClick={() => setShowAlts(!showAlts)} style={{ width: "100%", padding: 9, marginBottom: 8, borderRadius: 12, border: `1px dashed ${T.faint}`, background: "transparent", color: T.sub, fontSize: 10.5, fontWeight: 700, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
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
                    style={{ padding: "10px 12px", marginBottom: 5, borderRadius: 12, background: isCurrent ? T.tileHi2 : T.tileHi, border: isCurrent ? `1.5px solid ${color}` : "1.5px solid transparent", cursor: isCurrent ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
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

// ============ WARM-UP ============

function WarmupCard({ workoutType }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState({});
  const items = WARMUPS[workoutType] || [];
  const doneCount = Object.values(done).filter(Boolean).length;
  return (
    <div style={{ ...tile({ padding: 0, marginBottom: 10 }), overflow: "hidden", ...rise(0) }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "12px 13px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(0,217,245,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Wind size={16} color={T.stand} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Warm-Up</div>
          <div style={{ fontSize: 10.5, color: T.sub, marginTop: 1 }}>~4 min · {doneCount}/{items.length} done · never skip this</div>
        </div>
        <ChevronDown size={15} color={T.dim} style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
      </div>
      {open && (
        <div style={{ padding: "0 13px 12px" }}>
          {items.map((it, i) => {
            const isDone = !!done[i];
            return (
              <div key={i} onClick={() => setDone({ ...done, [i]: !isDone })} style={{ display: "flex", gap: 9, alignItems: "center", padding: "9px 11px", marginBottom: 5, borderRadius: 12, background: isDone ? "rgba(146,232,42,0.10)" : T.tileHi, cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, border: `1.5px solid ${isDone ? T.exercise : T.faint}`, background: isDone ? T.exercise : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isDone && <Check size={11} color="#122400" strokeWidth={3.5} />}
                </div>
                <div style={{ fontSize: 11.5, color: isDone ? T.dim : T.sub, lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none" }}>{it}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ FEEL SHEET ============

function FeelSheet({ open, onPick, onSkip }) {
  const [note, setNote] = useState("");
  const opts = [
    { id: "easy", emoji: "😌", label: "Easy", desc: "Had more in the tank" },
    { id: "solid", emoji: "💪", label: "Solid", desc: "Right at the edge — perfect" },
    { id: "brutal", emoji: "🥵", label: "Brutal", desc: "Emptied everything" },
  ];
  if (!open) return null;
  return (
    <Sheet open={open} onClose={onSkip} title="How was it?">
      <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>Your rating feeds tomorrow's readiness score — be honest, not heroic.</div>
      {opts.map((o, i) => (
        <div key={o.id} onClick={() => onPick(o.id, note)} style={{ ...tileSub({ borderRadius: 16 }), padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 13, cursor: "pointer", WebkitTapHighlightColor: "transparent", ...rise(i) }}>
          <div style={{ fontSize: 28 }}>{o.emoji}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{o.label}</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 1 }}>{o.desc}</div>
          </div>
          <ChevronRight size={16} color={T.faint} style={{ marginLeft: "auto" }} />
        </div>
      ))}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (e.g., shoulder felt tight)"
        style={{ width: "100%", boxSizing: "border-box", marginTop: 6, background: "#000", border: `1px solid ${T.hairline}`, borderRadius: 12, padding: "12px 14px", color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
      <button onClick={onSkip} style={{ width: "100%", padding: 12, marginTop: 10, background: "none", border: "none", color: T.dim, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}>
        SKIP RATING
      </button>
    </Sheet>
  );
}

// ============ WORKOUT VIEW ============

function WorkoutView({ data, workoutType, onBack, onSave }) {
  const workout = WORKOUTS[workoutType];
  const bs = useMemo(() => blockStatus(data), [data.block?.startDate]);
  const sugCtx = useMemo(() => ({ adjustments: data.adjustments || {}, deload: bs.deloadActive }), [bs.deloadActive, data.adjustments]);
  const [expandedId, setExpandedId] = useState(workout.exercises[0].id);
  const [session, setSession] = useState(() => {
    if (data.currentSession && data.currentSession.workoutType === workoutType) return data.currentSession;
    return { workoutType, startedAt: new Date().toISOString(), exercises: {}, swaps: {} };
  });
  const [timer, setTimer] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [showFeel, setShowFeel] = useState(false);

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

  const finalize = (feel, note) => {
    const completed = { ...session, date: todayStr(), completedAt: new Date().toISOString(), ...(feel ? { feel } : {}), ...(note ? { note } : {}) };
    setShowFeel(false);
    onSave(completed, true);
  };

  return (
    <div style={{ minHeight: "100vh", color: T.text, paddingBottom: 130 }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        padding: "12px 14px 10px", paddingTop: "calc(12px + env(safe-area-inset-top))",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: workout.color, fontWeight: 800 }}>{workout.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 1 }}>{workout.icon} {workout.name}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: workout.color }}>{doneSets}<span style={{ fontSize: 11, color: T.dim }}>/{totalSets}</span></div>
            <div style={{ fontSize: 8, color: T.dim, letterSpacing: 1 }}>{vol > 0 ? `${Math.round(vol)} KG VOL` : "SETS"}</div>
          </div>
        </div>
        <div style={{ marginTop: 9, height: 4, background: T.tileHi, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: workout.color, transition: "width 0.3s" }} />
        </div>
      </div>

      <div style={{ padding: 14 }}>
        {bs.deloadActive && (
          <div style={{ ...tile({ padding: "11px 14px", marginBottom: 10 }), border: `1.5px solid ${T.stand}`, fontSize: 11.5, color: T.sub, lineHeight: 1.5, ...rise(0) }}>
            <b style={{ color: T.stand }}>DELOAD WEEK.</b> Every lift targets ~60% load. Crisp reps, long rests, leave 4+ in the tank. This is how the next block gets heavier.
          </div>
        )}
        <WarmupCard workoutType={workoutType} />
        {slots.map(({ slot, active }, i) => (
          <ExerciseCard key={slot.id} idx={i + 1} slotExercise={slot} activeExercise={active}
            sessionData={session.exercises[active.id]} history={data.history}
            isExpanded={expandedId === slot.id} onToggle={() => setExpandedId(expandedId === slot.id ? null : slot.id)}
            onUpdate={(d) => {
              const prevDone = session.exercises[active.id]?.sets?.filter((x) => x.done).length || 0;
              const newDone = d.sets?.filter((x) => x.done).length || 0;
              updateExercise(active.id, d, newDone > prevDone ? active.restSec : null);
            }}
            onSwap={(altId) => handleSwap(slot.id, altId)} color={workout.color} sugCtx={sugCtx} />
        ))}

        {doneSets > 0 && (
          <button onClick={() => setShowFeel(true)} style={{ width: "100%", padding: 16, marginTop: 12, borderRadius: 16, border: "none", background: workout.color, color: onColor(workout.color), fontSize: 13, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
            FINISH · {doneSets} SETS · {Math.round(vol)} KG
          </button>
        )}
      </div>

      {timer && remaining > 0 && (
        <div style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(20px + env(safe-area-inset-bottom))", zIndex: 50,
          background: "rgba(44,44,46,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: 999, padding: "11px 17px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", gap: 12, minWidth: 210,
        }}>
          <Timer size={16} color={workout.color} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text, fontVariantNumeric: "tabular-nums" }}>
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(remaining / timer.total) * 100}%`, background: workout.color, transition: "width 0.3s linear" }} />
            </div>
          </div>
          <button onClick={() => setTimer(null)} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>
            <SkipForward size={14} /> SKIP
          </button>
        </div>
      )}

      <FeelSheet open={showFeel} onPick={(feel, note) => finalize(feel, note)} onSkip={() => finalize(null, null)} />
    </div>
  );
}

// ============ TODAY — decluttered, Apple Fitness style ============

function TodayView({ data, banner, onDismissBanner, onStartWorkout, onLogCardio, onLogWeight, onOpenSettings, onOpenAwards, onOpenPhotos, onOpenCheckpoint, onFinishSetup }) {
  const r = useMemo(() => readiness(data), [data.history.length, data.cardio.length]);
  const rec = useMemo(() => briefing(data), [data.history.length, data.cardio.length, data.rotationIndex, data.block?.startDate, data.block?.number]);
  const weeklyTarget = data.profile?.daysPerWeek ?? 4;
  const report = useMemo(() => weeklyReport(data), [data.history.length, data.cardio.length]);
  const streak = calcStreak(data.history, data.cardio);
  const aws = useMemo(() => achievements(data), [data.history.length, data.cardio.length]);
  const earned = aws.filter((a) => a.earned).length;
  const coachLine = COACH_LINES[Math.floor(Date.now() / 86400000) % COACH_LINES.length];
  const volPct = report.lastVolume > 0 ? Math.min(1, report.volume / report.lastVolume) : (report.volume > 0 ? 1 : 0);
  let block = 0;

  return (
    <div style={{ padding: "0 14px" }}>
      <div style={{ padding: "20px 2px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", ...rise(block++) }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase()}</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 1, letterSpacing: -0.9 }}>Today</div>
        </div>
        <button onClick={onOpenSettings} style={{ ...tileSub({ borderRadius: 17 }), width: 36, height: 36, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: T.sub, cursor: "pointer" }}><SettingsIcon size={17} /></button>
      </div>

      {banner && (
        <div style={{ ...tile({ padding: "12px 14px", marginBottom: 12 }), display: "flex", alignItems: "center", gap: 10, ...rise(block++) }}>
          <Trophy size={18} color={T.exercise} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 12, color: T.text, lineHeight: 1.45 }}>{banner}</div>
          <button onClick={onDismissBanner} style={{ background: "none", border: "none", color: T.dim, cursor: "pointer" }}><X size={15} /></button>
        </div>
      )}

      {data.profile?.skipped && (
        <div onClick={onFinishSetup} style={{ ...tile({ padding: "12px 14px", marginBottom: 10 }), display: "flex", alignItems: "center", gap: 10, cursor: "pointer", ...rise(block++) }}>
          <User size={17} color={T.exercise} />
          <div style={{ flex: 1, fontSize: 12, color: T.sub }}>Finish coach setup — 2 min, unlocks personalised blocks</div>
          <ChevronRight size={14} color={T.faint} />
        </div>
      )}

      {/* COACH HERO */}
      <div onClick={() => rec.mode === "checkpoint" ? onOpenCheckpoint() : rec.workout && onStartWorkout(rec.workout.id)}
        style={{ ...tile({ padding: 18, marginBottom: 10 }), cursor: rec.workout || rec.mode === "checkpoint" ? "pointer" : "default", position: "relative", overflow: "hidden", WebkitTapHighlightColor: "transparent", border: rec.mode === "checkpoint" ? `1.5px solid ${T.exercise}` : "1.5px solid transparent", ...rise(block++) }}>
        {rec.workout && <div style={{ position: "absolute", top: -14, right: -8, fontSize: 88, opacity: 0.10 }}>{rec.workout.icon}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Label color={rec.mode === "checkpoint" ? T.exercise : rec.workout ? rec.workout.color : T.stand}>
            {rec.mode === "checkpoint" ? "CHECKPOINT DUE" : rec.mode === "train" ? "TODAY'S TRAINING" : rec.mode === "urgent" ? "OVERDUE" : rec.mode === "cardio" ? "COACH CALL" : "TODAY"}
          </Label>
          {rec.block && rec.mode !== "checkpoint" && (
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, color: rec.block.deloadActive ? T.stand : T.dim, background: T.tileHi, padding: "3px 8px", borderRadius: 7 }}>
              BLOCK {rec.block.number} · WK {rec.block.week}/{rec.block.weeks}{rec.block.deloadActive ? " · DELOAD" : ""}
            </div>
          )}
        </div>
        <div style={{ fontSize: 23, fontWeight: 800, marginTop: 6, letterSpacing: -0.5 }}>{rec.title}</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 4, lineHeight: 1.5 }}>{rec.sub}</div>
        <div style={{ marginTop: 10 }}>
          {rec.lines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 7, marginBottom: 4, alignItems: "flex-start" }}>
              <div style={{ width: 4, height: 4, borderRadius: 2, background: T.exercise, marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.5 }}>{l}</div>
            </div>
          ))}
        </div>
        {rec.mode === "checkpoint" && (
          <button style={{ marginTop: 14, padding: "13px 22px", background: T.exercise, color: "#122400", border: "none", borderRadius: 13, fontSize: 12, fontWeight: 800, letterSpacing: 1.6, cursor: "pointer", fontFamily: "inherit" }}>
            RUN CHECKPOINT →
          </button>
        )}
        {rec.workout && rec.mode !== "checkpoint" && (
          <button style={{ marginTop: 14, padding: "13px 22px", background: rec.workout.color, color: onColor(rec.workout.color), border: "none", borderRadius: 13, fontSize: 12, fontWeight: 800, letterSpacing: 1.6, cursor: "pointer", fontFamily: "inherit" }}>
            START {rec.workout.label} →
          </button>
        )}
        {rec.mode === "cardio" && (
          <button onClick={(e) => { e.stopPropagation(); onLogCardio(); }} style={{ marginTop: 14, padding: "13px 22px", background: T.stand, color: onColor(T.stand), border: "none", borderRadius: 13, fontSize: 12, fontWeight: 800, letterSpacing: 1.6, cursor: "pointer", fontFamily: "inherit" }}>
            LOG CARDIO →
          </button>
        )}
        <div style={{ marginTop: 13, fontSize: 11, color: T.dim, fontStyle: "italic", lineHeight: 1.5 }}>"{coachLine}"</div>
      </div>

      {/* ACTIVITY RINGS */}
      <div style={{ ...tile({ marginBottom: 10, padding: 18 }), display: "flex", gap: 18, alignItems: "center", ...rise(block++) }}>
        <TripleRings size={148} rings={[
          { pct: report.sessions / weeklyTarget, colors: RING.move },
          { pct: Math.min(1, report.cardioMin / 90), colors: RING.exercise },
          { pct: volPct, colors: RING.stand },
        ]} />
        <div style={{ flex: 1 }}>
          {[
            { c: T.move, label: "Lifts", val: `${report.sessions}/${weeklyTarget}` },
            { c: T.exercise, label: "Cardio", val: `${report.cardioMin}/90`, unit: "MIN" },
            { c: T.stand, label: "Volume", val: report.volDelta != null ? `${report.volDelta > 0 ? "+" : ""}${report.volDelta}%` : `${(report.volume / 1000).toFixed(1)}k`, unit: report.volDelta != null ? "VS LAST WK" : "KG" },
          ].map((row, i) => (
            <div key={i} style={{ marginBottom: i < 2 ? 11 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: row.c }}>{row.label}</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: T.text, letterSpacing: -0.4, lineHeight: 1.1 }}>
                {row.val}<span style={{ fontSize: 10, color: T.dim, fontWeight: 700, marginLeft: 3 }}>{row.unit || ""}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute" }} />
      </div>

      {/* READINESS */}
      <div style={{ ...tile({ marginBottom: 10, padding: 16 }), display: "flex", gap: 14, alignItems: "center", ...rise(block++) }}>
        <Ring size={96} stroke={10} pct={r.score / 100} colors={BAND_GRAD[r.band]} id="readiness">
          <div style={{ fontSize: 27, fontWeight: 800, color: T.text, lineHeight: 1, letterSpacing: -1 }}>{r.score}</div>
          <div style={{ fontSize: 8, letterSpacing: 1.2, color: BAND_GRAD[r.band][0], fontWeight: 800, marginTop: 2 }}>{r.label.toUpperCase()}</div>
        </Ring>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>READINESS</Label>
          <div style={{ marginTop: 6 }}>
            {r.factors.slice(0, 2).map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "flex-start" }}>
                <div style={{ width: 5, height: 5, borderRadius: 3, background: f.good ? T.exercise : T.yellow, marginTop: 4.5, flexShrink: 0 }} />
                <div style={{ fontSize: 10.5, color: T.sub, lineHeight: 1.4 }}>{f.text}</div>
              </div>
            ))}
          </div>
          {streak > 0 && <div style={{ fontSize: 10.5, color: T.dim, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><Flame size={11} color={T.move} />{streak}-day streak</div>}
        </div>
      </div>

      {/* QUICK ROW: cardio / body / awards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12, ...rise(block++) }}>
        {[
          { icon: <Activity size={17} color={T.exercise} />, label: "Cardio", onClick: onLogCardio },
          { icon: <Scale size={17} color={T.stand} />, label: "Body", onClick: onLogWeight },
          { icon: <Camera size={17} color={T.purple} />, label: "Photos", onClick: onOpenPhotos },
          { icon: <Trophy size={17} color={T.yellow} />, label: `${earned}/${aws.length}`, onClick: onOpenAwards },
        ].map((b, i) => (
          <div key={i} onClick={b.onClick} style={{ ...tile({ padding: "13px 8px", borderRadius: 16 }), display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
            {b.icon}
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.sub }}>{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ AWARDS SHEET ============

function AwardsSheet({ open, onClose, data }) {
  const aws = useMemo(() => achievements(data), [open, data.history.length, data.cardio.length]);
  const earned = aws.filter((a) => a.earned).length;
  return (
    <Sheet open={open} onClose={onClose} title={`Awards · ${earned}/${aws.length}`}>
      {aws.map((a, i) => (
        <div key={a.id} style={{ ...tileSub({ borderRadius: 16 }), padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, opacity: a.earned ? 1 : 0.72, ...rise(i) }}>
          <div style={{
            width: 46, height: 46, borderRadius: 23, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: a.earned ? "rgba(255,214,10,0.16)" : T.tileHi2,
            border: a.earned ? `1.5px solid ${T.yellow}` : "1.5px solid transparent",
            filter: a.earned ? "none" : "saturate(0.15)",
          }}>{a.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: a.earned ? T.text : T.sub }}>{a.name} {a.earned && "✓"}</div>
            <div style={{ fontSize: 10.5, color: T.dim, marginTop: 1 }}>{a.desc}</div>
            {!a.earned && (
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 4, background: "#000", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (a.cur / a.target) * 100)}%`, background: T.exercise, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 9, color: T.faint, marginTop: 3 }}>{a.cur.toLocaleString()} / {a.target.toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </Sheet>
  );
}

// ============ TRAIN ============

function TrainView({ data, onStartWorkout }) {
  return (
    <div style={{ padding: "0 14px" }}>
      <div style={{ padding: "20px 2px 14px", ...rise(0) }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.9 }}>Train</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Push → Legs → Pull → Sculptor</div>
      </div>
      {ROTATION.map((wt, i) => {
        const w = WORKOUTS[wt];
        const isNext = i === data.rotationIndex;
        const lastOfType = [...data.history].reverse().find((s) => s.workoutType === wt);
        return (
          <div key={wt} onClick={() => onStartWorkout(wt)} style={{
            ...tile({ padding: 17, marginBottom: 10 }),
            border: isNext ? `1.5px solid ${w.color}` : "1.5px solid transparent",
            cursor: "pointer", position: "relative", overflow: "hidden", WebkitTapHighlightColor: "transparent", ...rise(i + 1),
          }}>
            <div style={{ position: "absolute", top: -12, right: -8, fontSize: 70, opacity: 0.10 }}>{w.icon}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Label color={w.color}>{w.label}</Label>
              {isNext && <div style={{ fontSize: 8, letterSpacing: 1, background: w.color, color: onColor(w.color), padding: "3px 8px", borderRadius: 7, fontWeight: 800 }}>UP NEXT</div>}
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, marginTop: 5 }}>{w.icon} {w.name}</div>
            <div style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>
              {w.exercises.length} exercises · {lastOfType ? `last done ${daysAgo(lastOfType.date)}` : "not yet done"}
            </div>
          </div>
        );
      })}
      <div style={{ ...tile({ marginTop: 4, marginBottom: 8 }), ...rise(5) }}>
        <Label color={T.purple}>THE TWO RULES</Label>
        <div style={{ display: "flex", gap: 9, margin: "10px 0 8px" }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: T.move, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, color: "#fff" }}>1</div>
          <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.45 }}>Log every set. Beat last session by 1 rep or 2.5 kg.</div>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: T.yellow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0, color: "#2B2103" }}>2</div>
          <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.45 }}>4 protein meals daily. No junk between meals. Period.</div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: T.dim, lineHeight: 1.6, padding: "4px 4px 8px", ...rise(6) }}>
        Finishing any workout advances the rotation. Cardio never advances it.
      </div>
    </div>
  );
}

// ============ INSIGHTS ============

function Heatmap({ cells }) {
  const levels = ["#151517", "rgba(0,217,245,0.40)", "rgba(146,232,42,0.30)", "rgba(146,232,42,0.60)", "#92E82A"];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return (
    <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {week.map((c, di) => (
            <div key={di} title={c.date} style={{ width: 13, height: 13, borderRadius: 4, background: levels[c.level] }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const tooltipStyle = { background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, fontSize: 11 };

function InsightsView({ data }) {
  const report = useMemo(() => weeklyReport(data), [data.history.length, data.cardio.length]);
  const stalls = useMemo(() => stalledLifts(data.history), [data.history.length]);
  const balance = useMemo(() => muscleBalance(data.history), [data.history.length]);
  const cells = useMemo(() => heatmapData(data), [data.history.length, data.cardio.length]);
  const acwr = useMemo(() => calcACWR(data.history), [data.history.length]);
  const bw = useMemo(() => bodyweightTrend(data.bodyWeight), [data.bodyWeight.length]);
  const waist = useMemo(() => waistTrend(data.bodyWeight), [data.bodyWeight.length]);

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
  let block = 0;

  return (
    <div style={{ padding: "0 14px" }}>
      <div style={{ padding: "20px 2px 14px", ...rise(block++) }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.9 }}>Insights</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>What the data says. No feelings, just numbers.</div>
      </div>

      <div style={{ ...tile({ marginBottom: 10 }), ...rise(block++) }}>
        <Label>THIS WEEK VS LAST</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{report.sessions}<span style={{ fontSize: 12, color: T.dim }}> vs {report.lastSessions}</span></div>
            <div style={{ fontSize: 9, color: T.dim, letterSpacing: 0.8, marginTop: 2, fontWeight: 700 }}>SESSIONS</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: report.volDelta > 0 ? T.exercise : report.volDelta < 0 ? T.move : T.text }}>
              {(report.volume / 1000).toFixed(1)}k
              {report.volDelta != null && <span style={{ fontSize: 11 }}> {report.volDelta > 0 ? "▲" : report.volDelta < 0 ? "▼" : ""}{Math.abs(report.volDelta)}%</span>}
            </div>
            <div style={{ fontSize: 9, color: T.dim, letterSpacing: 0.8, marginTop: 2, fontWeight: 700 }}>VOLUME KG</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: report.prCount > 0 ? T.exercise : T.text }}>{report.prCount} <span style={{ fontSize: 14 }}>🏆</span></div>
            <div style={{ fontSize: 9, color: T.dim, letterSpacing: 0.8, marginTop: 2, fontWeight: 700 }}>PRs</div>
          </div>
        </div>
        {acwr.ratio != null && (
          <div style={{ marginTop: 12, ...tileSub({ padding: "9px 11px", borderRadius: 12 }), fontSize: 10.5, color: T.sub, lineHeight: 1.5 }}>
            <b style={{ color: acwr.ratio > 1.5 ? T.move : acwr.ratio > 1.3 ? T.yellow : acwr.ratio < 0.8 ? T.yellow : T.exercise }}>ACWR {acwr.ratio.toFixed(2)}</b>
            {" — "}{acwr.ratio > 1.5 ? "load spiking, injury-risk zone. Ease off." : acwr.ratio > 1.3 ? "ramping fast. Watch recovery." : acwr.ratio < 0.8 ? "below baseline. Volume slipping." : "in the ideal 0.8–1.3 progression zone."}
          </div>
        )}
      </div>

      <div style={{ ...tile({ marginBottom: 10 }), ...rise(block++) }}>
        <Label>LAST 12 WEEKS</Label>
        <div style={{ marginTop: 10 }}><Heatmap cells={cells} /></div>
        <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 9, color: T.dim, alignItems: "center" }}>
          <span>Less</span>
          {["#151517", "rgba(0,217,245,0.40)", "rgba(146,232,42,0.30)", "rgba(146,232,42,0.60)", "#92E82A"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: c }} />)}
          <span>More</span>
          <span style={{ marginLeft: "auto" }}>blue = cardio only</span>
        </div>
      </div>

      <div style={{ ...tile({ marginBottom: 10 }), ...rise(block++) }}>
        <Label>VOLUME TREND · 8 WEEKS</Label>
        <div style={{ width: "100%", height: 120, marginTop: 8 }}>
          <ResponsiveContainer>
            <BarChart data={volTrend} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
              <XAxis dataKey="week" stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
              <YAxis stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.sub }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]} fill={T.move} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...tile({ marginBottom: 10 }), ...rise(block++) }}>
        <Label>BIG-3 STRENGTH · EST. 1RM</Label>
        {hasE1RM ? (
          <>
            <div style={{ width: "100%", height: 150, marginTop: 8 }}>
              <ResponsiveContainer>
                <LineChart data={e1rmSeries} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
                  <XAxis dataKey="date" stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <YAxis stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.sub }} />
                  <Line type="monotone" dataKey="barbell_bench_press" name="Bench" stroke={T.move} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="barbell_back_squat" name="Squat" stroke={T.orange} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="trap_bar_deadlift" name="Deadlift" stroke={T.exercise} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 9.5, color: T.dim }}>
              <span><span style={{ color: T.move }}>●</span> Bench</span>
              <span><span style={{ color: T.orange }}>●</span> Squat</span>
              <span><span style={{ color: T.exercise }}>●</span> Deadlift</span>
            </div>
          </>
        ) : (
          <div style={{ padding: "14px 4px 4px", fontSize: 11.5, color: T.dim, lineHeight: 1.6 }}>
            Log 2+ sessions of Bench, Squat, or Deadlift to unlock your strength curve — estimated 1RM from your best set.
          </div>
        )}
      </div>

      <div style={{ ...tile({ marginBottom: 10 }), ...rise(block++) }}>
        <Label>MUSCLE BALANCE · 28 DAYS</Label>
        <div style={{ marginTop: 10 }}>
          {Object.entries(totalByType).map(([type, vol]) => {
            const w = WORKOUTS[type];
            return (
              <div key={type} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                  <span style={{ color: T.sub, fontWeight: 700 }}>{w.icon} {w.label}</span>
                  <span style={{ color: T.dim }}>{Math.round(vol).toLocaleString()} kg</span>
                </div>
                <div style={{ height: 8, background: T.tileHi, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(vol / maxType) * 100}%`, background: w.color, borderRadius: 4, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>
        {balance.flag && (
          <div style={{ marginTop: 10, padding: "9px 11px", background: "rgba(255,214,10,0.10)", borderRadius: 12, fontSize: 10.5, color: "#FFE985", lineHeight: 1.5 }}>
            ⚠️ {balance.flag}
          </div>
        )}
      </div>

      {stalls.length > 0 && (
        <div style={{ ...tile({ marginBottom: 10 }), ...rise(block++) }}>
          <Label color={T.move}>STALLED LIFTS — ACTION NEEDED</Label>
          <div style={{ marginTop: 6 }}>
            {stalls.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.hairline}` }}>
                <AlertCircle size={15} color={T.move} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: T.sub, marginTop: 1 }}>{s.sessions} sessions stuck at {s.weight}kg — fight for +1 rep or deload 10%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...tile({ marginBottom: 8 }), ...rise(block++) }}>
        <Label>BODYWEIGHT → {BODYWEIGHT_TARGET} KG</Label>
        {bw && bw.series.length >= 2 ? (
          <>
            {bw.ratePerWeek != null && (
              <div style={{ fontSize: 11.5, color: T.sub, margin: "8px 0 2px", lineHeight: 1.5 }}>
                {bw.ratePerWeek < -0.05
                  ? <>Losing <b style={{ color: T.exercise }}>{Math.abs(bw.ratePerWeek)} kg/week</b>{bw.etaWeeks ? <> — on track for <b style={{ color: T.text }}>{BODYWEIGHT_TARGET} kg in ~{bw.etaWeeks} wks</b></> : null}</>
                  : bw.ratePerWeek > 0.05 ? <>Trending <b style={{ color: T.yellow }}>up {bw.ratePerWeek} kg/wk</b> — audit the snacks</>
                  : <>Flat — tighten the deficit</>}
              </div>
            )}
            <div style={{ width: "100%", height: 140, marginTop: 6 }}>
              <ResponsiveContainer>
                <LineChart data={bw.series.map((p) => ({ ...p, d: fmtDate(p.date) }))} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                  <XAxis dataKey="d" stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.sub }} />
                  <ReferenceLine y={BODYWEIGHT_TARGET} stroke={T.exercise} strokeDasharray="5 4" />
                  <Line type="monotone" dataKey="kg" stroke={T.faint} strokeWidth={1.5} dot={{ r: 2, fill: T.faint }} name="Daily" />
                  <Line type="monotone" dataKey="ma" stroke={T.stand} strokeWidth={2.5} dot={false} name="7-day avg" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>
              <span style={{ color: T.stand }}>—</span> 7-day avg (trust this) · <span style={{ color: T.faint }}>—</span> daily · <span style={{ color: T.exercise }}>- -</span> target
            </div>
            {waist && (
              <div style={{ marginTop: 10, ...tileSub({ padding: "9px 12px", borderRadius: 12 }), fontSize: 11, color: T.sub }}>
                📏 Waist <b style={{ color: T.text }}>{waist.latest} cm</b>
                {waist.count > 1 && <> · <b style={{ color: waist.delta <= 0 ? T.exercise : T.yellow }}>{waist.delta > 0 ? "+" : ""}{waist.delta} cm</b> / 30d — lower-ab fat leaves here first</>}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: "12px 4px 4px", fontSize: 11.5, color: T.dim, lineHeight: 1.6 }}>
            Log weight (+ optional waist) from Today for the trend and a projected date to hit {BODYWEIGHT_TARGET} kg.
          </div>
        )}
      </div>
    </div>
  );
}

// ============ HISTORY ============

function HistoryView({ data, onSelectExercise, onSelectSession }) {
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
      <div style={{ padding: "20px 2px 14px", ...rise(0) }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.9 }}>History</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{data.history.length} workouts · {data.cardio.length} cardio</div>
      </div>

      <SectionTitle style={rise(1)}>Sessions</SectionTitle>
      {recent.length === 0 ? (
        <div style={{ ...tile({ textAlign: "center", marginBottom: 16 }), color: T.dim, fontSize: 12, ...rise(2) }}>No workouts yet. Everything you log lives here forever.</div>
      ) : recent.map((s, i) => {
        const w = WORKOUTS[s.workoutType]; if (!w) return null;
        const sets = sessionSets(s), vol = Math.round(sessionVolume(s));
        const dur = s.startedAt && s.completedAt ? Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 60000) : null;
        return (
          <div key={s.id || i} onClick={() => onSelectSession(s)} style={{ ...tile({ padding: "11px 13px", borderRadius: 16, marginBottom: 6 }), display: "flex", alignItems: "center", gap: 10, cursor: "pointer", WebkitTapHighlightColor: "transparent", ...rise(Math.min(i + 2, 9)) }}>
            <div style={{ fontSize: 19 }}>{w.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                {w.name}
                {s.feel && <span style={{ fontSize: 12 }}>{FEEL[s.feel]}</span>}
                {s.prs?.length > 0 && <span style={{ fontSize: 10 }}>🏆×{s.prs.length}</span>}
              </div>
              <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                {fmtDate(s.date)} · {sets} sets · {vol > 0 ? `${vol}kg` : ""}{dur && dur > 0 && dur < 180 ? ` · ${dur}min` : ""}
              </div>
            </div>
            <div style={{ width: 4, height: 26, background: w.color, borderRadius: 2, flexShrink: 0 }} />
            <ChevronRight size={13} color={T.faint} style={{ flexShrink: 0 }} />
          </div>
        );
      })}

      {recentCardio.length > 0 && (
        <>
          <SectionTitle>Cardio</SectionTitle>
          {recentCardio.map((c, i) => {
            const ct = CARDIO_TYPES.find((x) => x.id === c.type);
            return (
              <div key={i} style={{ ...tile({ padding: "11px 13px", borderRadius: 16, marginBottom: 6 }), display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 17 }}>{ct?.icon || "🏃"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{ct?.name || c.type}</div>
                  <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{fmtDate(c.date)} · {c.minutes} min</div>
                </div>
                <div style={{ width: 4, height: 26, background: T.exercise, borderRadius: 2 }} />
              </div>
            );
          })}
        </>
      )}

      <SectionTitle>Exercises</SectionTitle>
      {allExercises.length === 0 ? (
        <div style={{ ...tile({ textAlign: "center" }), color: T.dim, fontSize: 12 }}>Complete a workout to unlock per-exercise trends.</div>
      ) : allExercises.map((ex) => {
        const lw = ex.lastSession.sets.filter((s) => s.weight)[0]?.weight;
        return (
          <div key={ex.id} onClick={() => onSelectExercise(ex.id)} style={{ ...tile({ padding: "11px 13px", borderRadius: 16, marginBottom: 6 }), cursor: "pointer", display: "flex", alignItems: "center", gap: 10, WebkitTapHighlightColor: "transparent" }}>
            <div style={{ width: 3, height: 26, background: ex.color, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
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

// ============ SESSION SHEET ============

function SessionSheet({ session, onClose }) {
  if (!session) return null;
  const w = WORKOUTS[session.workoutType];
  const vol = Math.round(sessionVolume(session));
  const sets = sessionSets(session);
  const dur = session.startedAt && session.completedAt ? Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000) : null;
  return (
    <Sheet open={!!session} onClose={onClose} title={`${w?.icon || ""} ${w?.name || "Session"}`}>
      <div style={{ fontSize: 11, color: T.dim, marginTop: -10, marginBottom: 14 }}>{fmtDate(session.date)} {session.feel && `· felt ${session.feel} ${FEEL[session.feel]}`}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 14 }}>
        {[["SETS", sets], ["VOLUME", `${vol}kg`], ["TIME", dur && dur < 180 ? `${dur}min` : "—"]].map(([l, v]) => (
          <div key={l} style={{ ...tileSub({ borderRadius: 14 }), padding: "10px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: w?.color || T.text }}>{v}</div>
            <div style={{ fontSize: 8, letterSpacing: 1.4, color: T.dim, marginTop: 2, fontWeight: 700 }}>{l}</div>
          </div>
        ))}
      </div>
      {session.prs?.length > 0 && (
        <div style={{ ...tileSub({ borderRadius: 14 }), background: "rgba(146,232,42,0.10)", padding: "10px 12px", marginBottom: 14, fontSize: 11.5, color: "#DBF7B8" }}>
          🏆 {session.prs.map((p) => `${p.name} ${p.weight}kg`).join(" · ")}
        </div>
      )}
      {session.note && (
        <div style={{ ...tileSub({ borderRadius: 14 }), padding: "10px 12px", marginBottom: 14, fontSize: 11.5, color: T.sub, fontStyle: "italic" }}>"{session.note}"</div>
      )}
      {Object.entries(session.exercises || {}).map(([exId, exData]) => {
        const ex = CATALOG[exId];
        const done = (exData.sets || []).filter((s) => s.reps);
        if (!done.length) return null;
        return (
          <div key={exId} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: T.text }}>{ex?.name || exId}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {done.map((x, j) => (
                <div key={j} style={{ padding: "4px 9px", background: "#000", borderRadius: 8, fontSize: 10.5, color: T.sub }}>
                  {x.weight ? `${x.weight}×` : ""}{x.reps}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}

// ============ EXERCISE DETAIL ============

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
  const bestE = chartData.length ? Math.max(...chartData.map((c) => c.e1rm || 0)) : 0;

  return (
    <div style={{ minHeight: "100vh", color: T.text, paddingBottom: 40 }}>
      <div style={{ padding: "12px 14px", paddingTop: "calc(12px + env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: ex.color, fontWeight: 800 }}>{ex.label}{ex.isAlt ? " · ALTERNATE" : ""}</div>
          <div style={{ fontSize: 15, fontWeight: 800, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 12, ...rise(0) }}>
          {[["BEST WT", `${pr}`, "kg"], ["EST 1RM", `${Math.round(bestE)}`, "kg"], ["SESSIONS", `${past.length}`, ""]].map(([l, v, u]) => (
            <div key={l} style={tile({ padding: "11px 9px", borderRadius: 16 })}>
              <div style={{ fontSize: 8, letterSpacing: 1.5, color: T.dim, fontWeight: 700 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: ex.color, marginTop: 3 }}>{v}<span style={{ fontSize: 10, color: T.dim }}>{u}</span></div>
            </div>
          ))}
        </div>

        {chartData.length > 1 && (
          <div style={{ ...tile({ marginBottom: 12 }), ...rise(1) }}>
            <Label>PROGRESSION</Label>
            <div style={{ width: "100%", height: 150, marginTop: 8 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -26 }}>
                  <XAxis dataKey="date" stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <YAxis stroke="none" fontSize={9} tick={{ fill: T.dim }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.sub }} />
                  <Line type="monotone" dataKey="weight" name="Top set" stroke={ex.color} strokeWidth={2.5} dot={{ fill: ex.color, r: 3 }} />
                  <Line type="monotone" dataKey="e1rm" name="Est 1RM" stroke={T.faint} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 9.5, color: T.dim, marginTop: 4 }}><span style={{ color: ex.color }}>—</span> top-set weight · <span>- -</span> estimated 1RM</div>
          </div>
        )}

        <SectionTitle>All sessions</SectionTitle>
        {past.length === 0 ? (
          <div style={{ ...tile({ textAlign: "center" }), color: T.dim, fontSize: 12 }}>No data yet for this movement.</div>
        ) : past.slice().reverse().map((s, i) => (
          <div key={i} style={{ ...tile({ padding: "10px 12px", borderRadius: 16, marginBottom: 6 }), ...rise(Math.min(i + 2, 9)) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>{fmtDate(s.date)}</div>
              <div style={{ fontSize: 9, color: T.dim }}>{daysAgo(s.date)}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {s.sets.filter((x) => x.reps).map((x, j) => (
                <div key={j} style={{ padding: "3px 8px", background: T.tileHi, borderRadius: 7, fontSize: 10.5, color: T.sub }}>
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


// ============ PHOTO IMG (async from IndexedDB) ============

function PhotoImg({ id, style }) {
  const [src, setSrc] = useState(null);
  useEffect(() => { let ok = true; getPhoto(id).then((d) => ok && setSrc(d)); return () => { ok = false; }; }, [id]);
  if (!src) return <div style={{ ...style, background: T.tileHi, display: "flex", alignItems: "center", justifyContent: "center", color: T.faint, fontSize: 10 }}>…</div>;
  return <img src={src} style={{ ...style, objectFit: "cover" }} alt="" />;
}

// ============ PHOTO CAPTURE ROW (3 angles) ============

const ANGLES = ["front", "side", "back"];

function PhotoCaptureRow({ shots, onShot }) {
  const refs = { front: useRef(null), side: useRef(null), back: useRef(null) };
  const handle = async (angle, file) => {
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      const id = `p_${Date.now()}_${angle}`;
      await savePhoto(id, dataUrl);
      onShot(angle, id);
    } catch (e) { console.error("photo save failed", e); }
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      {ANGLES.map((a) => (
        <div key={a}>
          <input ref={refs[a]} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={(e) => { handle(a, e.target.files?.[0]); e.target.value = ""; }} />
          <div onClick={() => refs[a].current?.click()} style={{ ...tileSub({ borderRadius: 14 }), aspectRatio: "3/4", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, position: "relative" }}>
            {shots[a] ? (
              <PhotoImg id={shots[a]} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            ) : (
              <>
                <Camera size={19} color={T.dim} />
                <div style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 1 }}>{a}</div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ ONBOARDING ============

function Chip({ active, children, onClick, color = T.exercise }) {
  return (
    <div onClick={onClick} style={{ padding: "10px 14px", borderRadius: 13, background: active ? "rgba(146,232,42,0.14)" : T.tileHi, border: active ? `1.5px solid ${color}` : "1.5px solid transparent", color: active ? color : T.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
      {children}
    </div>
  );
}

function OnboardingFlow({ initial, onDone, onSkip }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ age: initial?.age || "", heightCm: initial?.heightCm || "", weightKg: "", waist: "", goal: "Lean & Dense (ARK)", daysPerWeek: 4, sessionCap: 45, sleepHours: 6.5, injuries: ["Arm (history)"], stress: "High", note: "" });
  const [shots, setShots] = useState({});
  const set = (k, v) => setF({ ...f, [k]: v });
  const num = (v) => (v === "" ? "" : parseFloat(v) || "");

  const inputS = { width: "100%", boxSizing: "border-box", background: "#000", border: `1px solid ${T.hairline}`, borderRadius: 13, padding: "13px 14px", color: T.text, fontSize: 16, fontWeight: 700, fontFamily: "inherit", outline: "none" };
  const steps = ["Basics", "Training", "Health", "Photos"];

  const finish = () => {
    const photoIds = Object.entries(shots).map(([angle, id]) => ({ id, angle, date: todayStr(), tag: "baseline" }));
    onDone({
      profile: { age: num(f.age) || null, heightCm: num(f.heightCm) || null, goal: f.goal, daysPerWeek: f.daysPerWeek, sessionCap: f.sessionCap, sleepHours: f.sleepHours, injuries: f.injuries.filter((x) => x !== "None"), stress: f.stress, note: f.note, createdAt: new Date().toISOString() },
      weightKg: num(f.weightKg) || null, waist: num(f.waist) || null, photoIds,
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: T.text, padding: "0 16px", paddingTop: "calc(20px + env(safe-area-inset-top))", paddingBottom: 40, maxWidth: 500, margin: "0 auto" }}>
      <div style={{ ...rise(0) }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.exercise }}>YOUR COACH · SETUP</div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, marginTop: 3 }}>{step === 0 ? "Let's build your engine." : steps[step - 1]}</div>
      </div>

      {step === 0 && (
        <div style={{ ...rise(1) }}>
          <div style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.65, margin: "14px 0 20px" }}>
            Two minutes of honest answers and I'll personalise the ARK plan around your body, schedule and injury history — then run it in 4-week blocks: build, deload, checkpoint, adapt. You confirm every decision I propose.
          </div>
          <button onClick={() => setStep(1)} style={{ width: "100%", padding: 16, borderRadius: 15, border: "none", background: T.exercise, color: "#122400", fontSize: 13, fontWeight: 800, letterSpacing: 1.8, cursor: "pointer", fontFamily: "inherit" }}>START SETUP →</button>
          <button onClick={onSkip} style={{ width: "100%", padding: 13, marginTop: 8, background: "none", border: "none", color: T.dim, fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" }}>SKIP FOR NOW</button>
        </div>
      )}

      {step === 1 && (
        <div style={{ ...rise(1), marginTop: 14 }}>
          <Label>AGE</Label>
          <input style={{ ...inputS, margin: "8px 0 14px" }} type="number" inputMode="numeric" value={f.age} onChange={(e) => set("age", e.target.value)} placeholder="30" />
          <Label>HEIGHT · CM</Label>
          <input style={{ ...inputS, margin: "8px 0 14px" }} type="number" inputMode="numeric" value={f.heightCm} onChange={(e) => set("heightCm", e.target.value)} placeholder="180" />
          <Label>CURRENT WEIGHT · KG</Label>
          <input style={{ ...inputS, margin: "8px 0 14px" }} type="number" inputMode="decimal" value={f.weightKg} onChange={(e) => set("weightKg", e.target.value)} placeholder="88.0" />
          <Label>WAIST AT NAVEL · CM (OPTIONAL)</Label>
          <input style={{ ...inputS, margin: "8px 0 4px" }} type="number" inputMode="decimal" value={f.waist} onChange={(e) => set("waist", e.target.value)} placeholder="94" />
        </div>
      )}

      {step === 2 && (
        <div style={{ ...rise(1), marginTop: 14 }}>
          <Label>GOAL</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 16px" }}>
            {["Lean & Dense (ARK)", "Recomp", "Strength First"].map((g) => <Chip key={g} active={f.goal === g} onClick={() => set("goal", g)}>{g}</Chip>)}
          </div>
          <Label>LIFTING DAYS / WEEK</Label>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
            {[3, 4, 5].map((d) => <Chip key={d} active={f.daysPerWeek === d} onClick={() => set("daysPerWeek", d)}>{d} days</Chip>)}
          </div>
          <Label>SESSION CAP · MIN</Label>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
            {[30, 45, 60].map((d) => <Chip key={d} active={f.sessionCap === d} onClick={() => set("sessionCap", d)}>{d}</Chip>)}
          </div>
          <Label>TYPICAL SLEEP · HOURS</Label>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 4px", flexWrap: "wrap" }}>
            {[6, 6.5, 7, 7.5, 8].map((h) => <Chip key={h} active={f.sleepHours === h} onClick={() => set("sleepHours", h)}>{h}h</Chip>)}
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ ...rise(1), marginTop: 14 }}>
          <Label>INJURY HISTORY (I'LL FLAG RISKY LIFTS)</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 16px" }}>
            {["Arm (history)", "Shoulder", "Knee", "Lower back", "None"].map((inj) => (
              <Chip key={inj} active={f.injuries.includes(inj)} color={T.yellow} onClick={() => {
                if (inj === "None") set("injuries", ["None"]);
                else set("injuries", f.injuries.includes(inj) ? f.injuries.filter((x) => x !== inj) : [...f.injuries.filter((x) => x !== "None"), inj]);
              }}>{inj}</Chip>
            ))}
          </div>
          <Label>LIFE STRESS</Label>
          <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
            {["Low", "Medium", "High"].map((s) => <Chip key={s} active={f.stress === s} onClick={() => set("stress", s)}>{s}</Chip>)}
          </div>
          <Label>ANYTHING ELSE I SHOULD KNOW (OPTIONAL)</Label>
          <input style={{ ...inputS, margin: "8px 0 4px", fontWeight: 500, fontSize: 13 }} value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g., gym dumbbells jump 15→20kg" />
        </div>
      )}

      {step === 4 && (
        <div style={{ ...rise(1), marginTop: 14 }}>
          <div style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.6, marginBottom: 14 }}>
            Baseline photos — relaxed, same light you'll use every time. These stay on this device only. Every 4 weeks I'll ask for a new set and you can bring them to Claude for the visual assessment.
          </div>
          <PhotoCaptureRow shots={shots} onShot={(a, id) => setShots({ ...shots, [a]: id })} />
          <div style={{ fontSize: 10.5, color: T.dim, marginTop: 10 }}>Optional — you can add these later from the Photos section.</div>
        </div>
      )}

      {step > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: 15, borderRadius: 14, border: "none", background: T.tileHi, color: T.sub, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>BACK</button>
          <button onClick={() => (step === 4 ? finish() : setStep(step + 1))} style={{ flex: 2, padding: 15, borderRadius: 14, border: "none", background: T.exercise, color: "#122400", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>
            {step === 4 ? "FINISH — START BLOCK 1" : "NEXT →"}
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 18 }}>
        {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? T.exercise : T.tileHi2, transition: "width 0.25s" }} />)}
      </div>
    </div>
  );
}

// ============ CHECKPOINT FLOW ============

function CheckpointFlow({ data, onBack, onConfirm }) {
  const summary = useMemo(() => computeCheckpointSummary(data), []);
  const [step, setStep] = useState(0);
  const [kg, setKg] = useState(data.bodyWeight[data.bodyWeight.length - 1]?.kg || 85);
  const [waist, setWaist] = useState("");
  const [shots, setShots] = useState({});
  const [props, setProps] = useState(summary.proposals);
  const [copied, setCopied] = useState(false);
  const bs = summary.block;

  const inputS = { width: "100%", boxSizing: "border-box", background: "#000", border: `1px solid ${T.hairline}`, borderRadius: 13, padding: 13, color: T.text, fontSize: 24, fontWeight: 800, fontFamily: "inherit", textAlign: "center", outline: "none" };

  const doConfirm = () => {
    const photoIds = Object.entries(shots).map(([angle, id]) => ({ id, angle, date: todayStr(), tag: `block${bs.number}` }));
    onConfirm({
      kg: kg > 30 && kg < 200 ? Math.round(kg * 10) / 10 : null,
      waist: parseFloat(waist) > 40 ? Math.round(parseFloat(waist) * 10) / 10 : null,
      photoIds,
      acceptedDeloads: props.filter((p) => p.type === "deload_lift" && p.on),
      summary,
    });
  };

  return (
    <div style={{ minHeight: "100vh", color: T.text, paddingBottom: 60 }}>
      <div style={{ padding: "12px 14px", paddingTop: "calc(12px + env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: T.exercise, fontWeight: 800 }}>CHECKPOINT</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Block {bs.number} Review</div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {step === 0 && (
          <div style={rise(0)}>
            <SectionTitle>Weigh-in</SectionTitle>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>Morning weight + waist. The block gets judged on evidence, not vibes.</div>
            <Label>WEIGHT · KG</Label>
            <input style={{ ...inputS, margin: "8px 0 14px" }} type="number" inputMode="decimal" value={kg} onChange={(e) => setKg(parseFloat(e.target.value) || 0)} />
            <Label>WAIST · CM (OPTIONAL)</Label>
            <input style={{ ...inputS, margin: "8px 0 20px", fontSize: 18 }} type="number" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="—" />
            <button onClick={() => setStep(1)} style={{ width: "100%", padding: 15, borderRadius: 14, border: "none", background: T.exercise, color: "#122400", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>NEXT: PHOTOS →</button>
          </div>
        )}

        {step === 1 && (
          <div style={rise(0)}>
            <SectionTitle>Progress photos</SectionTitle>
            <div style={{ fontSize: 12, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>Same light, same pose as last time. These are the truth-tellers.</div>
            <PhotoCaptureRow shots={shots} onShot={(a, id) => setShots({ ...shots, [a]: id })} />
            <button onClick={() => setStep(2)} style={{ width: "100%", padding: 15, marginTop: 18, borderRadius: 14, border: "none", background: T.exercise, color: "#122400", fontSize: 12, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>
              {Object.keys(shots).length ? "NEXT: THE VERDICT →" : "SKIP PHOTOS →"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={rise(0)}>
              <SectionTitle>Block {bs.number} — the evidence</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 10 }}>
                {[["SESSIONS", summary.sessions, "/16"], ["VOLUME", `${(summary.volume / 1000).toFixed(1)}k`, "KG"], ["PRs", summary.prs, "🏆"]].map(([l, v, u]) => (
                  <div key={l} style={tile({ padding: "11px 9px", borderRadius: 16 })}>
                    <div style={{ fontSize: 8, letterSpacing: 1.4, color: T.dim, fontWeight: 700 }}>{l}</div>
                    <div style={{ fontSize: 19, fontWeight: 800, marginTop: 3 }}>{v}<span style={{ fontSize: 10, color: T.dim }}>{u}</span></div>
                  </div>
                ))}
              </div>
              {summary.strength.length > 0 && (
                <div style={{ ...tile({ marginBottom: 10 }) }}>
                  <Label>STRENGTH MOVED</Label>
                  {summary.strength.map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 8 }}>
                      <span style={{ color: T.sub }}>{s.name}</span>
                      <b style={{ color: s.delta > 0 ? T.exercise : s.delta < 0 ? T.move : T.text }}>{s.delta > 0 ? "+" : ""}{s.delta}kg e1RM</b>
                    </div>
                  ))}
                </div>
              )}
              {summary.weightDelta != null && (
                <div style={{ ...tile({ marginBottom: 10, padding: "12px 14px" }), fontSize: 12, color: T.sub }}>
                  Bodyweight (7-day avg): <b style={{ color: summary.weightDelta < -0.2 ? T.exercise : T.yellow }}>{summary.weightDelta > 0 ? "+" : ""}{summary.weightDelta} kg</b> across the block
                </div>
              )}
            </div>

            <div style={rise(1)}>
              <SectionTitle>My proposals — you decide</SectionTitle>
              {props.length === 0 && <div style={{ ...tile(), fontSize: 12, color: T.sub }}>Clean block. No corrections — we go again, heavier.</div>}
              {props.map((p, i) => (
                <div key={p.id} onClick={() => setProps(props.map((x) => x.id === p.id ? { ...x, on: !x.on } : x))} style={{ ...tile({ padding: "12px 14px", marginBottom: 8 }), display: "flex", gap: 11, alignItems: "flex-start", cursor: "pointer", opacity: p.on ? 1 : 0.5 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, border: `1.5px solid ${p.on ? T.exercise : T.faint}`, background: p.on ? T.exercise : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    {p.on && <Check size={12} color="#122400" strokeWidth={3.5} />}
                  </div>
                  <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{p.text}</div>
                </div>
              ))}
            </div>

            <div style={{ ...tile({ marginTop: 14, marginBottom: 14, padding: "13px 14px" }), ...rise(2) }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.stand, display: "flex", alignItems: "center", gap: 6 }}><Copy size={13} /> Visual assessment (via Claude)</div>
              <div style={{ fontSize: 11, color: T.sub, lineHeight: 1.55, margin: "6px 0 10px" }}>
                I can't judge photos myself — Claude can. Copy the summary below, paste it in your Claude chat, attach today's photos, and bring the verdict back.
              </div>
              <button onClick={() => { navigator.clipboard?.writeText(claudeHandoffText(data, summary)).then(() => setCopied(true)); }} style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: copied ? T.exercise : T.tileHi, color: copied ? "#122400" : T.text, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? "✓ COPIED — PASTE IN CLAUDE" : "COPY SUMMARY FOR CLAUDE"}
              </button>
            </div>

            <button onClick={doConfirm} style={{ width: "100%", padding: 16, borderRadius: 15, border: "none", background: T.exercise, color: "#122400", fontSize: 13, fontWeight: 800, letterSpacing: 1.8, cursor: "pointer", fontFamily: "inherit", ...rise(3) }}>
              CONFIRM — START BLOCK {bs.number + 1} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ PHOTOS VIEW ============

function PhotosView({ data, onBack, onAddPhotos }) {
  const [shots, setShots] = useState({});
  const [compare, setCompare] = useState({ a: null, b: null });
  const byDate = useMemo(() => {
    const g = {};
    for (const p of data.photos) { (g[p.date] = g[p.date] || []).push(p); }
    return Object.entries(g).sort(([a], [b]) => new Date(b) - new Date(a));
  }, [data.photos.length]);
  const dates = byDate.map(([d]) => d);

  const saveSet = () => {
    const metas = Object.entries(shots).map(([angle, id]) => ({ id, angle, date: todayStr(), tag: "manual" }));
    if (metas.length) { onAddPhotos(metas); setShots({}); }
  };

  return (
    <div style={{ minHeight: "100vh", color: T.text, paddingBottom: 60 }}>
      <div style={{ padding: "12px 14px", paddingTop: "calc(12px + env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Progress Photos</div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={rise(0)}>
          <SectionTitle>New set — today</SectionTitle>
          <PhotoCaptureRow shots={shots} onShot={(a, id) => setShots({ ...shots, [a]: id })} />
          {Object.keys(shots).length > 0 && (
            <button onClick={saveSet} style={{ width: "100%", padding: 13, marginTop: 10, borderRadius: 13, border: "none", background: T.exercise, color: "#122400", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>SAVE TODAY'S SET</button>
          )}
        </div>

        {dates.length >= 2 && (
          <div style={{ marginTop: 20, ...rise(1) }}>
            <SectionTitle>Compare</SectionTitle>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {dates.slice(0, 6).map((d) => (
                <Chip key={d} active={compare.a === d || compare.b === d} onClick={() => {
                  if (compare.a === d) setCompare({ ...compare, a: null });
                  else if (compare.b === d) setCompare({ ...compare, b: null });
                  else if (!compare.a) setCompare({ ...compare, a: d });
                  else setCompare({ ...compare, b: d });
                }}>{fmtDate(d)}</Chip>
              ))}
            </div>
            {compare.a && compare.b && ANGLES.map((angle) => {
              const pa = data.photos.find((p) => p.date === compare.a && p.angle === angle);
              const pb = data.photos.find((p) => p.date === compare.b && p.angle === angle);
              if (!pa && !pb) return null;
              return (
                <div key={angle} style={{ marginBottom: 12 }}>
                  <Label>{angle.toUpperCase()}</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                    {[pa, pb].map((p, i) => p
                      ? <PhotoImg key={i} id={p.id} style={{ width: "100%", aspectRatio: "3/4", borderRadius: 14 }} />
                      : <div key={i} style={{ ...tileSub({ borderRadius: 14 }), aspectRatio: "3/4", display: "flex", alignItems: "center", justifyContent: "center", color: T.faint, fontSize: 10 }}>no photo</div>)}
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.55, marginTop: 4 }}>
              Want a real verdict? Attach both sets in your Claude chat — body-fat change, weak points, plan adjustments.
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <SectionTitle>All sets</SectionTitle>
          {byDate.length === 0 && <div style={{ ...tile(), fontSize: 12, color: T.sub }}>No photos yet. The mirror lies day-to-day — monthly photos don't.</div>}
          {byDate.map(([d, ps], gi) => (
            <div key={d} style={{ ...tile({ padding: 12, marginBottom: 10 }), ...rise(Math.min(gi + 2, 8)) }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8 }}>{fmtDate(d)} · {ps[0]?.tag === "baseline" ? "Baseline" : ps[0]?.tag?.startsWith("block") ? `Checkpoint ${ps[0].tag.replace("block", "B")}` : "Manual"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {ANGLES.map((a) => {
                  const p = ps.find((x) => x.angle === a);
                  return p ? <PhotoImg key={a} id={p.id} style={{ width: "100%", aspectRatio: "3/4", borderRadius: 12 }} /> : <div key={a} style={{ ...tileSub({ borderRadius: 12 }), aspectRatio: "3/4" }} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ MODALS ============

function CardioSheet({ open, onClose, onSave }) {
  const [type, setType] = useState(CARDIO_TYPES[0].id);
  const [minutes, setMinutes] = useState(25);
  return (
    <Sheet open={open} onClose={onClose} title="Log Cardio">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {CARDIO_TYPES.map((c) => (
          <div key={c.id} onClick={() => { setType(c.id); setMinutes(c.defaultMin); }} style={{ padding: "14px 12px", borderRadius: 16, background: type === c.id ? "rgba(146,232,42,0.14)" : T.tileHi, border: type === c.id ? `1.5px solid ${T.exercise}` : "1.5px solid transparent", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 21 }}>{c.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: type === c.id ? T.exercise : T.text }}>{c.name}</div>
          </div>
        ))}
      </div>
      <Label>DURATION · MIN</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 16px" }}>
        <button onClick={() => setMinutes(Math.max(5, minutes - 5))} style={{ ...tileSub({ borderRadius: 13 }), border: "none", width: 46, height: 46, color: T.text, cursor: "pointer", fontSize: 18 }}>−</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 30, fontWeight: 800 }}>{minutes}</div>
        <button onClick={() => setMinutes(minutes + 5)} style={{ ...tileSub({ borderRadius: 13 }), border: "none", width: 46, height: 46, color: T.text, cursor: "pointer", fontSize: 18 }}>+</button>
      </div>
      <button onClick={() => { onSave({ type, minutes, date: todayStr() }); onClose(); }} style={{ width: "100%", padding: 15, borderRadius: 14, border: "none", background: T.exercise, color: "#122400", fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit" }}>
        SAVE CARDIO
      </button>
    </Sheet>
  );
}

function WeightSheet({ open, onClose, onSave, lastEntry }) {
  const [kg, setKg] = useState(lastEntry?.kg || 85);
  const [waist, setWaist] = useState("");
  useEffect(() => { if (open) { setKg(lastEntry?.kg || 85); setWaist(""); } }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Log Body">
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>Morning, after bathroom, before food — same conditions daily. The 7-day average does the rest.</div>
      <Label>WEIGHT · KG</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 14px" }}>
        <button onClick={() => setKg(Math.round((kg - 0.1) * 10) / 10)} style={{ ...tileSub({ borderRadius: 13 }), border: "none", width: 46, height: 46, color: T.text, cursor: "pointer", fontSize: 18 }}>−</button>
        <input type="number" inputMode="decimal" value={kg} onChange={(e) => setKg(parseFloat(e.target.value) || 0)}
          style={{ flex: 1, background: "#000", border: `1px solid ${T.hairline}`, borderRadius: 13, padding: 12, color: T.text, fontSize: 27, fontWeight: 800, fontFamily: "inherit", textAlign: "center", outline: "none" }} />
        <button onClick={() => setKg(Math.round((kg + 0.1) * 10) / 10)} style={{ ...tileSub({ borderRadius: 13 }), border: "none", width: 46, height: 46, color: T.text, cursor: "pointer", fontSize: 18 }}>+</button>
      </div>
      <Label>WAIST AT NAVEL · CM — OPTIONAL</Label>
      <input type="number" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="e.g., 94 — best lower-ab fat tracker"
        style={{ width: "100%", boxSizing: "border-box", background: "#000", border: `1px solid ${T.hairline}`, borderRadius: 13, padding: "13px 14px", color: T.text, fontSize: 15, fontWeight: 600, fontFamily: "inherit", outline: "none", margin: "8px 0 16px" }} />
      <button onClick={() => {
        if (kg > 30 && kg < 200) {
          const entry = { kg: Math.round(kg * 10) / 10, date: todayStr() };
          const wv = parseFloat(waist);
          if (wv > 40 && wv < 200) entry.waist = Math.round(wv * 10) / 10;
          onSave(entry); onClose();
        }
      }} style={{ width: "100%", padding: 15, borderRadius: 14, border: "none", background: T.stand, color: "#002229", fontSize: 12, fontWeight: 800, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit" }}>
        SAVE
      </button>
    </Sheet>
  );
}

function SettingsSheet({ open, onClose, data, onImport, onToggleTimer, onReset, onRedoSetup }) {
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
    } catch { /* clipboard below */ }
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

  const btn = { width: "100%", padding: 13, borderRadius: 14, background: T.tileHi, border: "none", color: T.text, fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 };

  return (
    <Sheet open={open} onClose={onClose} title="Settings & Data">
      <Label>YOUR DATA</Label>
      <div style={{ fontSize: 11, color: T.sub, margin: "8px 0 12px", lineHeight: 1.55 }}>
        {data.history.length} workouts · {data.bodyWeight.length} weigh-ins · {data.cardio.length} cardio.
        Lives in this browser. <b style={{ color: T.text }}>Moving device or URL?</b> Export here → Import there.
      </div>

      <button onClick={doExport} style={btn}><Download size={15} /> EXPORT BACKUP (JSON)</button>

      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => doImport(r.result); r.readAsText(f); } e.target.value = ""; }} />
      <button onClick={() => fileRef.current?.click()} style={btn}><Upload size={15} /> IMPORT FROM FILE</button>

      <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="…or paste backup JSON here"
        style={{ width: "100%", height: 64, background: "#000", border: `1px solid ${T.hairline}`, borderRadius: 12, padding: 10, color: T.text, fontSize: 10.5, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
      {importText.trim() && (
        <button onClick={() => doImport(importText)} style={{ ...btn, background: T.exercise, color: "#122400", marginTop: 6 }}>
          IMPORT PASTED DATA
        </button>
      )}

      {msg && <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 12, fontSize: 11, lineHeight: 1.45, background: msg.ok ? "rgba(146,232,42,0.12)" : "rgba(250,17,79,0.12)", color: msg.ok ? "#DBF7B8" : "#FFB4C4" }}>{msg.text}</div>}

      <div style={{ height: 1, background: T.hairline, margin: "16px 0" }} />

      <div onClick={onToggleTimer} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0 16px", cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Rest timer</div>
          <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>Auto-starts after each logged set</div>
        </div>
        <div style={{ width: 46, height: 27, borderRadius: 14, background: data.settings?.restTimer !== false ? T.exercise : T.tileHi2, position: "relative", transition: "background 0.2s" }}>
          <div style={{ position: "absolute", top: 2, left: data.settings?.restTimer !== false ? 21 : 2, width: 23, height: 23, borderRadius: 12, background: "#fff", transition: "left 0.2s", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }} />
        </div>
      </div>

      <button onClick={onRedoSetup} style={{ ...btn, marginBottom: 12 }}><User size={15} /> REDO COACH SETUP</button>
      <div style={{ fontSize: 10, color: T.faint, lineHeight: 1.5, marginBottom: 12 }}>Note: progress photos live in this browser's IndexedDB and are not included in the JSON backup.</div>
      <button onClick={onReset} style={{ width: "100%", padding: 12, borderRadius: 14, border: "none", background: "rgba(250,17,79,0.12)", color: "#FF7B9C", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>
        RESET ALL DATA
      </button>
      <div style={{ fontSize: 9.5, color: T.faint, textAlign: "center", marginTop: 14 }}>ARK Fitness v4 · Built for Ayush</div>
    </Sheet>
  );
}

// ============ TAB BAR ============

function Dock({ tab, setTab }) {
  const items = [
    { id: "today", icon: Home, label: "Today" },
    { id: "train", icon: Dumbbell, label: "Train" },
    { id: "insights", icon: BarChart3, label: "Insights" },
    { id: "history", icon: HistoryIcon, label: "History" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: "calc(10px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 24px)", maxWidth: 476, zIndex: 40,
      background: "rgba(28,28,30,0.88)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderRadius: 28, padding: "6px 8px", boxShadow: "0 14px 44px rgba(0,0,0,0.6)",
      display: "flex",
    }}>
      {items.map((it) => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{ flex: 1, padding: "9px 0 7px", background: active ? "rgba(146,232,42,0.14)" : "none", borderRadius: 20, border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}>
            <Icon size={20} color={active ? T.exercise : T.dim} strokeWidth={active ? 2.4 : 2} />
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3, color: active ? T.exercise : T.dim }}>{it.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ============ APP ============

export default function App() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("today");
  const [screen, setScreen] = useState(null);
  const [banner, setBanner] = useState(null);
  const [showCardio, setShowCardio] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAwards, setShowAwards] = useState(false);
  const [viewSession, setViewSession] = useState(null);

  useEffect(() => { setData(loadData()); }, []);
  const persist = useCallback((d) => { setData(d); saveData(d); }, []);

  if (!data) return (
    <Shell>
      <div style={{ minHeight: "100vh", color: T.dim, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 3 }}>LOADING…</div>
      </div>
    </Shell>
  );

  const handleSaveSession = (session, isComplete) => {
    if (isComplete) {
      const prs = detectPRs(session, data.history);
      const completed = { ...session, id: `s_${Date.now()}`, prs };
      const idx = ROTATION.indexOf(session.workoutType);
      // consume any coach adjustments for exercises performed this session
      const adj = { ...(data.adjustments || {}) };
      for (const exId of Object.keys(completed.exercises || {})) delete adj[exId];
      persist({ ...data, adjustments: adj, currentSession: null, history: [...data.history, completed], rotationIndex: (idx + 1) % ROTATION.length });
      const vol = Math.round(sessionVolume(completed));
      setBanner(prs.length > 0
        ? `Session banked — ${sessionSets(completed)} sets, ${vol} kg. ${prs.length} PR${prs.length > 1 ? "s" : ""}: ${prs.map((p) => `${p.name} ${p.weight}kg`).join(", ")} 🏆`
        : `Session banked — ${sessionSets(completed)} sets, ${vol} kg total volume. Beat it next time.`);
      setScreen(null); setTab("today");
    } else {
      persist({ ...data, currentSession: session });
    }
  };

  // Onboarding gate: no profile yet → coach setup first
  if (!data.profile) {
    return (
      <Shell>
        <OnboardingFlow
          onSkip={() => persist({ ...data, profile: { skipped: true, createdAt: new Date().toISOString() } })}
          onDone={({ profile, weightKg, waist, photoIds }) => {
            const bw = weightKg ? [...data.bodyWeight.filter((x) => x.date !== todayStr()), { date: todayStr(), kg: weightKg, ...(waist ? { waist } : {}) }] : data.bodyWeight;
            persist({
              ...data, profile,
              bodyWeight: bw,
              photos: [...data.photos, ...photoIds],
              block: { number: 1, startDate: todayStr(), lengthWeeks: 4 },
              coachLog: [...data.coachLog, { date: todayStr(), type: "init", text: "Coach initialised — Block 1 begins." }],
            });
          }} />
      </Shell>
    );
  }

  if (screen?.type === "photos") {
    return (
      <Shell>
        <PhotosView data={data} onBack={() => setScreen(null)}
          onAddPhotos={(metas) => persist({ ...data, photos: [...data.photos, ...metas] })} />
      </Shell>
    );
  }
  if (screen?.type === "checkpoint") {
    return (
      <Shell>
        <CheckpointFlow data={data} onBack={() => setScreen(null)}
          onConfirm={({ kg, waist, photoIds, acceptedDeloads, summary }) => {
            const adj = { ...(data.adjustments || {}) };
            for (const p of acceptedDeloads) adj[p.exId] = { weight: p.weight, reason: `Checkpoint reset → ${p.weight}kg. Rebuild past the stall.` };
            const bw = kg ? [...data.bodyWeight.filter((x) => x.date !== todayStr()), { date: todayStr(), kg, ...(waist ? { waist } : {}) }] : data.bodyWeight;
            const nextNum = (data.block?.number || 1) + 1;
            persist({
              ...data,
              bodyWeight: bw,
              photos: [...data.photos, ...photoIds],
              adjustments: adj,
              checkpoints: [...data.checkpoints, { date: todayStr(), block: summary.block.number, sessions: summary.sessions, volume: summary.volume, prs: summary.prs, weightDelta: summary.weightDelta, accepted: acceptedDeloads.map((p) => p.exId) }],
              coachLog: [...data.coachLog, { date: todayStr(), type: "checkpoint", text: `Block ${summary.block.number} closed: ${summary.sessions} sessions, ${summary.prs} PRs. Block ${nextNum} begins.` }],
              block: { number: nextNum, startDate: todayStr(), lengthWeeks: 4 },
            });
            setScreen(null); setTab("today");
            setBanner(`Block ${summary.block.number} closed. Block ${nextNum} starts now — first session sets the tone. 🏁`);
          }} />
      </Shell>
    );
  }

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
      <div style={{ minHeight: "100vh", color: T.text, paddingBottom: 104, paddingTop: "env(safe-area-inset-top)" }}>
        {tab === "today" && (
          <TodayView data={data} banner={banner} onDismissBanner={() => setBanner(null)}
            onStartWorkout={(wt) => setScreen({ type: "workout", workoutType: wt })}
            onLogCardio={() => setShowCardio(true)} onLogWeight={() => setShowWeight(true)}
            onOpenSettings={() => setShowSettings(true)} onOpenAwards={() => setShowAwards(true)}
            onOpenPhotos={() => setScreen({ type: "photos" })} onOpenCheckpoint={() => setScreen({ type: "checkpoint" })}
            onFinishSetup={() => persist({ ...data, profile: null })} />
        )}
        {tab === "train" && <TrainView data={data} onStartWorkout={(wt) => setScreen({ type: "workout", workoutType: wt })} />}
        {tab === "insights" && <InsightsView data={data} />}
        {tab === "history" && <HistoryView data={data} onSelectExercise={(id) => setScreen({ type: "exercise", id })} onSelectSession={(s) => setViewSession(s)} />}
      </div>

      <Dock tab={tab} setTab={setTab} />

      <CardioSheet open={showCardio} onClose={() => setShowCardio(false)} onSave={(c) => persist({ ...data, cardio: [...data.cardio, c] })} />
      <WeightSheet open={showWeight} onClose={() => setShowWeight(false)} lastEntry={data.bodyWeight[data.bodyWeight.length - 1]}
        onSave={(w) => persist({ ...data, bodyWeight: [...data.bodyWeight.filter((x) => x.date !== w.date), w] })} />
      <SettingsSheet open={showSettings} onClose={() => setShowSettings(false)} data={data}
        onRedoSetup={() => { setShowSettings(false); persist({ ...data, profile: null }); }}
        onImport={(d) => persist(d)}
        onToggleTimer={() => persist({ ...data, settings: { ...data.settings, restTimer: data.settings?.restTimer === false } })}
        onReset={() => { if (confirm("Delete ALL workout history, weigh-ins and cardio? This cannot be undone.") && confirm("Really sure? Export a backup first if in doubt.")) { localStorage.removeItem(STORAGE_KEY); location.reload(); } }} />
      <AwardsSheet open={showAwards} onClose={() => setShowAwards(false)} data={data} />
      <SessionSheet session={viewSession} onClose={() => setViewSession(null)} />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Segoe UI", sans-serif', minHeight: "100vh", background: "#000" }}>
      <div style={{ position: "relative", maxWidth: 500, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
