import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, SkipForward, SkipBack, X, Check, Clock, Flame } from 'lucide-react'
import { useStore, activeProfile } from '../lib/store.jsx'
import { useT } from '../lib/i18n.js'
import { EX } from '../data/exercises.js'
import { buildSession } from '../lib/plan.js'
import { beep, speak, stopSpeaking, keepAwake } from '../lib/media.js'
import Figure from '../components/Figure.jsx'

export function Amount({ step }) {
  const { t } = useT()
  if (step.type === 'reps') return <>{step.amount} {t('times')}</>
  return step.amount >= 120 ? <>{Math.round(step.amount / 60)} {t('min')}</> : <>{step.amount} {t('sec')}</>
}

// Preview of a session, then the guided player.
export default function Session({ tpl, index, onBack, onFinish }) {
  const { state } = useStore()
  const { t, L } = useT()
  const profile = activeProfile(state)
  const session = useMemo(() => buildSession(tpl, index, profile), [tpl, index, profile])
  const [playing, setPlaying] = useState(false)

  if (playing) return <Player session={session} onExit={() => setPlaying(false)} onFinish={onFinish} />

  const sections = ['warm', 'main', 'cool'].map((sec) => [sec, session.steps.filter((s) => s.section === sec && (s.round || 1) === 1)]).filter(([, l]) => l.length)
  const rounds = session.steps.find((s) => s.section === 'main')?.rounds || 1
  return (
    <div className="screen plain">
      <div className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label={t('back')}><ArrowLeft size={20} /></button>
        <div className="grow">
          {tpl.sessions && <div className="muted small">{L(tpl.name)} · {t('weekDay', { w: session.week, d: session.day })}</div>}
          <h2>{L(session.title)}</h2>
        </div>
      </div>
      <div className="row wrap">
        <span className="chip plain"><Clock size={13} /> {session.minutes} {t('min')}</span>
        <span className="chip plain"><Flame size={13} /> ~{session.kcal} {t('kcal')}</span>
        {rounds > 1 && <span className="chip plain">{t('roundsN', { n: rounds })}</span>}
        {session.forTime && <span className="chip"><Clock size={13} /> {t('forTime')}</span>}
      </div>
      {session.forTime && <p className="note">{t('warmFirst')}</p>}
      {sections.map(([sec, steps]) => (
        <div className="card" key={sec}>
          <h3 className="muted">{t(sec)}{sec === 'main' && rounds > 1 ? ` · ${t('roundsN', { n: rounds })}` : ''}</h3>
          <div className="list">
            {steps.map((s, n) => (
              <div className="li" key={n}>
                <div className="figbox"><Figure pose={EX[s.ex].pose} size={52} /></div>
                <div className="grow"><b>{L(EX[s.ex].name)}</b><div className="muted small"><Amount step={s} /></div></div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="muted small center">{t('stopNote')}</p>
      <div style={{ position: 'sticky', bottom: 12 }}>
        <button className="btn" onClick={() => { beep(660, 80); setPlaying(true) }}><Play size={20} /> {t('start')}</button>
      </div>
    </div>
  )
}

function Player({ session, onExit, onFinish }) {
  const { state } = useStore()
  const { t, L, lang } = useT()
  const { voice, sound } = state.settings
  const steps = session.steps
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState('ready') // ready | work | rest
  const [left, setLeft] = useState(5)
  const [paused, setPaused] = useState(false)
  const [asking, setAsking] = useState(false)
  const elapsed = useRef(0)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const step = steps[i]
  const ex = EX[step.ex]
  const timed = phase !== 'work' || step.type === 'time'
  const upcoming = phase === 'work' ? steps[i + 1] : phase === 'rest' ? steps[i + 1] : steps[i]

  const say = (text) => { if (voice) speak(text, lang) }
  const announce = (s) => {
    const e = EX[s.ex]
    const amt = s.type === 'reps' ? `${s.amount} ${t('times')}` : s.amount >= 120 ? `${Math.round(s.amount / 60)} ${t('min')}` : `${s.amount} ${t('sec')}`
    say(`${L(e.name)}. ${amt}.`)
  }
  const startWork = (n) => {
    setI(n); setPhase('work'); setLeft(steps[n].type === 'time' ? steps[n].amount : 0)
    announce(steps[n])
  }
  const advance = () => {
    if (phase === 'ready') return startWork(i)
    if (phase === 'work') {
      if (i >= steps.length - 1) { stopSpeaking(); return onFinish({ seconds: elapsed.current, session }) }
      if (step.rest > 0) {
        setPhase('rest'); setLeft(step.rest)
        say(`${t('rest')}. ${t('next')}: ${L(EX[steps[i + 1].ex].name)}`)
        return
      }
      return startWork(i + 1)
    }
    startWork(i + 1)
  }
  const prev = () => { if (i > 0 || phase !== 'ready') startWork(Math.max(0, phase === 'work' ? i - 1 : i)) }

  useEffect(() => {
    let lock
    keepAwake().then((l) => { lock = l })
    say(`${t('getReady')}. ${L(EX[steps[0].ex].name)}`)
    return () => { lock?.release?.(); stopSpeaking() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (paused || asking) return
    const id = setInterval(() => {
      if (phaseRef.current !== 'ready') elapsed.current += 1
      setLeft((l) => l - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [paused, asking])

  useEffect(() => {
    if (!timed) return
    if (left <= 0) advance()
    else if (left <= 3 && sound) beep(left === 1 ? 1100 : 800, 110)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left])

  const mainRound = step.section === 'main' && step.rounds > 1 ? ` · ${t('roundN', { n: step.round, t: step.rounds })}` : ''
  return (
    <div className={`player ${phase === 'rest' ? 'rest' : ''}`}>
      <div className="player-in">
        <div className="row">
          <button className="iconbtn" onClick={() => setAsking(true)} aria-label={t('close')}><X size={20} /></button>
          <div className="grow">
            <div className="segs">{steps.map((_, n) => <i key={n} className={n < i || (n === i && phase !== 'ready') ? 'on' : ''} />)}</div>
            <div className="muted small" style={{ marginTop: 4 }}>{t(step.section)}{mainRound} · {i + 1}/{steps.length}</div>
          </div>
          {session.forTime && <span className="chip" style={{ fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}><Clock size={15} /> {fmt(elapsed.current)}</span>}
        </div>

        <div className="stage">
          {phase === 'work' ? (
            <>
              <div className="figbox" style={{ borderRadius: 28 }}><Figure pose={ex.pose} animate={!paused} size={210} /></div>
              <h1>{L(ex.name)}</h1>
              <p className="muted" style={{ maxWidth: 360 }}>{L(ex.cue)}</p>
              <div className="count">
                {step.type === 'time' ? <>{left >= 60 ? fmt(left) : left}</> : <>{step.amount}<small>{t('times')}</small></>}
              </div>
            </>
          ) : (
            <>
              <h2 className="muted">{phase === 'ready' ? t('getReady') : t('rest')}</h2>
              <div className="count">{left}</div>
              {upcoming && (
                <div className="card row" style={{ textAlign: 'left', width: '100%', marginTop: 12 }}>
                  <div className="figbox"><Figure pose={EX[upcoming.ex].pose} size={72} /></div>
                  <div className="grow">
                    <div className="muted small">{t('nextUp')}</div>
                    <b>{L(EX[upcoming.ex].name)}</b>
                    <div className="muted small"><Amount step={upcoming} /></div>
                  </div>
                </div>
              )}
              {phase === 'rest' && <button className="btn sm ghost" onClick={() => setLeft((l) => l + 15)}>{t('more15')}</button>}
            </>
          )}
          {paused && <span className="chip">{t('paused')}</span>}
        </div>

        <div className="controls">
          <button className="iconbtn" onClick={prev} aria-label={t('back')}><SkipBack size={20} /></button>
          {phase === 'work' && step.type === 'reps' ? (
            <button className="btn ok" onClick={advance}><Check size={20} /> {t('done')}</button>
          ) : phase === 'work' ? (
            <button className="btn ghost" onClick={() => setPaused(!paused)}>{paused ? <><Play size={20} /> {t('resume')}</> : <><Pause size={20} /> {t('pause')}</>}</button>
          ) : (
            <button className="btn" onClick={advance}>{phase === 'ready' ? t('start') : t('skip')}</button>
          )}
          <button className="iconbtn" onClick={advance} aria-label={t('skip')}><SkipForward size={20} /></button>
        </div>
      </div>

      {asking && (
        <div className="sheet-bg">
          <div className="sheet">
            <h2>{t('quit')}</h2>
            <p className="muted">{t('quitSub')}</p>
            <button className="btn" onClick={() => setAsking(false)}>{t('keepGoing')}</button>
            <button className="btn ghost" onClick={() => { stopSpeaking(); onExit() }}>{t('endIt')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(s) {
  s = Math.max(0, s)
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`
}
