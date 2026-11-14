import { EX } from '../data/exercises.js'

const LEVEL_F = { beginner: 0.75, inter: 1, advanced: 1.3 }

// Swap a move the person should not do for its easier alternative.
export function substitute(id, profile) {
  const limits = profile.limits || []
  for (let n = 0; n < 4 && id; n++) {
    const e = EX[id]
    if (!e) return null
    const bad =
      e.avoid.some((a) => limits.includes(a)) ||
      (e.floor && limits.includes('floor')) ||
      (e.impact === 'high' && (limits.includes('knee') || limits.includes('impact')))
    if (!bad) return id
    id = e.alt
  }
  return null
}

function amount(e, factor) {
  const v = e.base * Math.min(2.4, Math.max(0.5, factor))
  if (e.type === 'time') return Math.max(10, Math.round(v / 5) * 5)
  return Math.max(e.base <= 4 ? 2 : 4, Math.round(v))
}

export function stepSeconds(s) {
  return s.type === 'time' ? s.amount : s.amount * EX[s.ex].spr
}

// Build a playable session from a journey/quick template for this person.
export function buildSession(tpl, index, profile) {
  const perWeek = daysPerWeek(tpl, profile)
  const week = Math.floor(index / perWeek)
  const s = tpl.sessions ? tpl.sessions[index % tpl.sessions.length] : tpl
  const factor = tpl.fixed ? 1 : (LEVEL_F[profile.level] || 1) * (1 + (tpl.ramp ?? 0.05) * week) * (profile.difficulty || 1)
  const steps = []
  const add = (item, section, f, rest, round, rounds) => {
    const [id, fixedAmount] = Array.isArray(item) ? item : [item]
    const sid = substitute(id, profile)
    if (!sid) return
    const prev = steps[steps.length - 1]
    if (prev && prev.ex === sid && prev.section === section && prev.round === round) return
    const e = EX[sid]
    steps.push({ ex: sid, type: e.type, amount: fixedAmount && sid === id ? fixedAmount : fixedAmount ? amount(e, fixedAmount / EX[id].base) : amount(e, f), section, rest, round, rounds })
  }
  for (const id of tpl.warm || []) add(id, 'warm', 1, 5)
  const rounds = tpl.rounds || 1
  for (let r = 1; r <= rounds; r++) for (const id of s.items) add(id, 'main', factor, tpl.rest ?? 20, r, rounds)
  for (const id of tpl.cool || []) add(id, 'cool', 1, 5)
  if (steps.length) steps[steps.length - 1].rest = 0

  const kg = profile.kg || (profile.age === 'kid' ? 30 : 65)
  let seconds = 5
  let kcal = 0
  for (const st of steps) {
    const sec = stepSeconds(st)
    seconds += sec + st.rest
    kcal += (sec / 60) * EX[st.ex].met * 3.5 * kg / 200
  }
  return {
    title: s.name, forTime: !!tpl.fixed, week: week + 1, day: (index % perWeek) + 1, steps,
    minutes: Math.max(1, Math.round(seconds / 60)), kcal: Math.round(kcal), kcalPerSec: kcal / Math.max(1, seconds),
  }
}

// The coach plans each week around the number of days the person chose.
export function daysPerWeek(tpl, profile) {
  if (!tpl.sessions) return 1
  return Math.min(6, Math.max(2, profile?.days || tpl.perWeek || 3))
}
export const totalSessions = (j, profile) => j.weeks * daysPerWeek(j, profile)
