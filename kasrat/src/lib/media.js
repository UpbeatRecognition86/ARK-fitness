// Voice coach (browser text-to-speech), beeps and screen wake lock.
let ctx = null

export function beep(freq = 880, ms = 120) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = freq
    g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + ms / 1000)
  } catch { /* audio not available */ }
}

export function speak(text, lang) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    u.rate = 0.95
    synth.speak(u)
  } catch { /* speech not available */ }
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
}

export async function keepAwake() {
  try { return await navigator.wakeLock?.request('screen') } catch { return null }
}

export function buzz(pattern) {
  try { navigator.vibrate?.(pattern) } catch { /* not supported */ }
}
