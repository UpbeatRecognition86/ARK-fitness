# Kasrat — fitness for every Indian family

A guided home-workout app for the Indian mass market: multi-week **journeys**, no equipment,
Hindi + English, several family members on one phone. It lives in this folder and is independent
of the personal ARK tracker in the repo root.

## What is in it

- **12 journeys** for five age groups (5–12, 13–17, 18–39, 40–59, 60+): first steps, walking,
  Surya Namaskar, fat loss, dand-baithak strength, 40+, chair-based seniors, kids, teens, women's
  strength, desk workers, wedding prep
- **Adaptive sessions** — volume scales with week, level, age and "too easy / too hard" feedback;
  moves are swapped automatically for knee, back, shoulder pain or difficulty getting on the floor
- **Guided player** — animated figure, timers, rest screens, spoken coaching in Hindi or English
- **Family profiles**, streaks, points and ranks, badges, weight log, BMI with Indian cut-offs,
  water tracker, WhatsApp sharing
- **Freemium paywall** — 3 free journeys, week 1 of every other journey free, Plus at ₹99/month,
  ₹599/year, ₹999/year family
- Installable PWA that works offline; all data stays on the phone

## Run

```bash
cd kasrat
npm install
npm run dev      # http://localhost:5174
npm run build
```

The repo's GitHub Pages workflow also builds this app and serves it at `/kasrat/` once merged to `main`.

## Where things are

| What | File |
| --- | --- |
| Name, prices, payment mode | `src/config.js` |
| Exercises (names, cues, swaps) | `src/data/exercises.js` |
| Journeys and quick workouts | `src/data/journeys.js` |
| Session generator and progression | `src/lib/plan.js` |
| All UI text, both languages | `src/lib/i18n.js` |
| Stick-figure poses | `src/components/Figure.jsx` |

## Before charging real money

Payments run in **demo mode**: the Plus button unlocks on the device and charges nothing.
To go live you still need:

1. **Accounts + backend** (e.g. Firebase or Supabase) with phone-OTP login, so purchases and
   history survive a phone change.
2. **Razorpay subscriptions** (UPI AutoPay) with server-side order creation and signature
   verification — see `src/lib/payments.js`. Play Store distribution requires Google Play Billing
   for digital subscriptions instead.
3. **Play Store build** — wrap this PWA with Capacitor or a Trusted Web Activity.
4. **Legal** — privacy policy and terms; verifiable parental consent for under-18 profiles under
   the DPDP Act once any data leaves the device.
5. **Content review** — have a certified trainer or physiotherapist review the senior, kids and
   pain-related programs, and replace the stick figures with filmed demonstrations.
