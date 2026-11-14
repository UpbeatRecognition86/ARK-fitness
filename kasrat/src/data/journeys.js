// Journeys: multi-week guided programs. Each cycles through its session templates,
// and the generator (lib/plan.js) scales volume by week, level, age and feedback.
// ages: kid (5–12), teen (13–17), adult (18–39), mid (40–59), senior (60+)
const WARM = ['march', 'arm_circles', 'torso_twist']
const COOL = ['forward_fold', 'child_pose', 'breathing']

export const JOURNEYS = [
  {
    id: 'shuruaat', emoji: '🌱', color: '#2F9E44', premium: false, weeks: 4, perWeek: 3, level: 1, rounds: 2, rest: 20,
    ages: ['adult', 'mid', 'teen'],
    name: { en: 'Shuruaat — First Steps', hi: 'शुरुआत — पहला क़दम' },
    tag: { en: 'Never exercised? Start here.', hi: 'कभी कसरत नहीं की? यहीं से शुरू करें।' },
    about: { en: 'A gentle 4-week start. Short sessions build the habit and teach the basic moves — squat, push, bridge and plank.', hi: '4 हफ़्तों की आसान शुरुआत। छोटे सेशन आदत बनाते हैं और बुनियादी कसरतें सिखाते हैं — बैठक, पुश-अप, ब्रिज और प्लैंक।' },
    warm: WARM, cool: COOL,
    sessions: [
      { name: { en: 'Full Body A', hi: 'पूरा शरीर A' }, items: ['squat', 'wall_pushup', 'glute_bridge', 'knee_to_elbow', 'plank'] },
      { name: { en: 'Full Body B', hi: 'पूरा शरीर B' }, items: ['chair_sit_stand', 'knee_pushup', 'bird_dog', 'step_jacks', 'calf_raise'] },
      { name: { en: 'Full Body C', hi: 'पूरा शरीर C' }, items: ['lunge', 'wall_pushup', 'superman', 'march', 'crunch'] },
    ],
  },
  {
    id: 'walkfit', emoji: '🚶', color: '#1971C2', premium: false, weeks: 6, perWeek: 4, level: 1, rounds: 1, rest: 15, ramp: 0.3,
    ages: ['adult', 'mid', 'senior'],
    name: { en: 'Walk to Fit', hi: 'चलो, फ़िट हो जाएँ' },
    tag: { en: 'Walking plan that grows week by week.', hi: 'हर हफ़्ते बढ़ने वाला पैदल चलने का प्लान।' },
    about: { en: 'Brisk walking is the easiest way to get moving. Walks get longer each week, with simple leg strength in between.', hi: 'तेज़ चलना फ़िट होने का सबसे आसान तरीक़ा है। हर हफ़्ते सैर लंबी होती है, बीच में पैरों की आसान कसरत।' },
    warm: ['march', 'ankle_circles'], cool: ['tadasana', 'breathing'],
    sessions: [
      { name: { en: 'Walk + Legs', hi: 'सैर + पैर' }, items: ['brisk_walk', 'chair_sit_stand', 'brisk_walk', 'calf_raise'] },
      { name: { en: 'Steady Walk', hi: 'लगातार सैर' }, items: ['brisk_walk', 'side_leg_raise', 'brisk_walk'] },
      { name: { en: 'Walk + Balance', hi: 'सैर + संतुलन' }, items: ['brisk_walk', 'single_leg_stand', 'brisk_walk', 'knee_to_elbow'] },
    ],
  },
  {
    id: 'surya', emoji: '🌞', color: '#F08C00', premium: false, weeks: 4, perWeek: 4, level: 1, rounds: 2, rest: 15, ramp: 0.3,
    ages: ['adult', 'mid', 'teen', 'senior'],
    name: { en: 'Surya Shakti', hi: 'सूर्य शक्ति' },
    tag: { en: 'Build up to 12 Surya Namaskars.', hi: '12 सूर्य नमस्कार तक पहुँचें।' },
    about: { en: 'A yoga journey built around Surya Namaskar, with balance poses and calm breathing. Great for mornings.', hi: 'सूर्य नमस्कार पर आधारित योग यात्रा — साथ में संतुलन के आसन और शांत साँस। सुबह के लिए बढ़िया।' },
    warm: ['arm_circles', 'side_bend', 'tadasana'], cool: ['child_pose', 'butterfly', 'breathing', 'shavasana'],
    sessions: [
      { name: { en: 'Sun Flow', hi: 'सूर्य प्रवाह' }, items: ['surya_namaskar', 'vrikshasana', 'cobra'] },
      { name: { en: 'Strength Flow', hi: 'शक्ति प्रवाह' }, items: ['surya_namaskar', 'downdog', 'plank'] },
    ],
  },
  {
    id: 'fatloss', emoji: '🔥', color: '#E03131', premium: true, weeks: 8, perWeek: 4, level: 2, rounds: 3, rest: 20,
    ages: ['adult', 'mid', 'teen'],
    name: { en: 'Fat se Fit', hi: 'फ़ैट से फ़िट' },
    tag: { en: '8 weeks of calorie-burning circuits.', hi: '8 हफ़्ते के कैलोरी जलाने वाले सर्किट।' },
    about: { en: 'Cardio and strength circuits that keep your heart rate up. Four sessions a week, each around 20–30 minutes.', hi: 'कार्डियो और ताक़त के सर्किट जो दिल की धड़कन तेज़ रखते हैं। हफ़्ते में चार सेशन, हर एक लगभग 20–30 मिनट।' },
    warm: WARM, cool: COOL,
    sessions: [
      { name: { en: 'Cardio Burn', hi: 'कार्डियो बर्न' }, items: ['jumping_jacks', 'squat', 'high_knees', 'mountain_climbers', 'shadow_boxing'] },
      { name: { en: 'Strength Circuit', hi: 'ताक़त सर्किट' }, items: ['squat', 'pushup', 'lunge', 'glute_bridge', 'plank'] },
      { name: { en: 'Dance & Sweat', hi: 'नाचो और पसीना बहाओ' }, items: ['bhangra', 'step_jacks', 'skipping', 'knee_to_elbow', 'squat_thrust'] },
    ],
  },
  {
    id: 'desi', emoji: '💪', color: '#9C36B5', premium: true, weeks: 8, perWeek: 4, level: 2, rounds: 3, rest: 30,
    ages: ['adult', 'teen', 'mid'],
    name: { en: 'Desi Taqat', hi: 'देसी ताक़त' },
    tag: { en: 'Akhada-style strength: dand and baithak.', hi: 'अखाड़े वाली ताक़त: दंड और बैठक।' },
    about: { en: 'Old-school pehlwan training with modern progression. Dand, baithak and core work make you strong without a gym.', hi: 'पुराने पहलवानों की कसरत, नए तरीक़े से। दंड, बैठक और पेट की कसरत — बिना जिम के ताक़त।' },
    warm: WARM, cool: ['cobra', 'child_pose', 'breathing'],
    sessions: [
      { name: { en: 'Dand–Baithak', hi: 'दंड-बैठक' }, items: ['pushup', 'squat', 'plank', 'superman'] },
      { name: { en: 'Akhada Day', hi: 'अखाड़ा दिन' }, items: ['hindu_squat', 'hindu_pushup', 'lunge', 'leg_raise'] },
      { name: { en: 'Power Day', hi: 'पावर दिन' }, items: ['jump_squat', 'pushup', 'wall_sit', 'mountain_climbers', 'crunch'] },
    ],
  },
  {
    id: 'active40', emoji: '🧘', color: '#0C8599', premium: true, weeks: 8, perWeek: 3, level: 1, rounds: 2, rest: 25,
    ages: ['mid', 'senior'],
    name: { en: 'Active 40+', hi: 'एक्टिव 40+' },
    tag: { en: 'Joint-friendly strength for busy lives.', hi: 'व्यस्त ज़िंदगी के लिए जोड़ों पर आसान कसरत।' },
    about: { en: 'Low-impact strength, balance and mobility for the 40s and 50s. Easy on the knees and back, serious about results.', hi: '40 और 50 की उम्र के लिए कम झटके वाली ताक़त, संतुलन और लचीलापन। घुटनों और पीठ पर आसान, नतीजों में दमदार।' },
    warm: ['march', 'arm_circles', 'side_bend'], cool: ['cat_cow', 'child_pose', 'breathing'],
    sessions: [
      { name: { en: 'Strong Base', hi: 'मज़बूत नींव' }, items: ['chair_sit_stand', 'wall_pushup', 'glute_bridge', 'bird_dog', 'knee_to_elbow'] },
      { name: { en: 'Move & Tone', hi: 'चलो और कसो' }, items: ['step_jacks', 'squat', 'knee_pushup', 'side_leg_raise', 'plank'] },
      { name: { en: 'Steady & Stable', hi: 'स्थिर और संतुलित' }, items: ['march', 'calf_raise', 'superman', 'wall_sit', 'vrikshasana'] },
    ],
  },
  {
    id: 'golden', emoji: '🪷', color: '#C2255C', premium: true, weeks: 6, perWeek: 3, level: 1, rounds: 2, rest: 30,
    ages: ['senior'],
    name: { en: 'Golden Years', hi: 'सुनहरे साल' },
    tag: { en: 'Chair-based strength and balance for 60+.', hi: '60+ के लिए कुर्सी पर ताक़त और संतुलन।' },
    about: { en: 'Safe, seated and supported exercises that keep legs strong and balance steady — to stay independent for longer.', hi: 'सुरक्षित, बैठकर और सहारे से होने वाली कसरतें जो पैर मज़बूत और संतुलन पक्का रखती हैं — ताकि आप आत्मनिर्भर बने रहें।' },
    warm: ['seated_march', 'ankle_circles'], cool: ['tadasana', 'breathing'],
    sessions: [
      { name: { en: 'Chair Strength', hi: 'कुर्सी ताक़त' }, items: ['seated_march', 'seated_arm_raise', 'chair_sit_stand', 'seated_leg_ext', 'calf_raise'] },
      { name: { en: 'Steady Feet', hi: 'मज़बूत क़दम' }, items: ['march', 'wall_pushup', 'side_leg_raise', 'single_leg_stand', 'seated_leg_ext'] },
    ],
  },
  {
    id: 'kids', emoji: '🐯', color: '#F76707', premium: true, weeks: 4, perWeek: 3, level: 1, rounds: 2, rest: 20,
    ages: ['kid'],
    name: { en: 'Chhota Champ', hi: 'छोटा चैंप' },
    tag: { en: 'Animal moves and games for ages 5–12.', hi: '5–12 साल के बच्चों के लिए जानवरों वाली कसरत और खेल।' },
    about: { en: 'Fitness that feels like play: frog jumps, bear walks, langdi and bhangra. Short, fun and screen-light.', hi: 'कसरत जो खेल जैसी लगे: मेंढक कूद, भालू चाल, लंगड़ी और भांगड़ा। छोटी, मज़ेदार और कम स्क्रीन वाली।' },
    warm: ['march', 'arm_circles'], cool: ['butterfly', 'breathing'],
    sessions: [
      { name: { en: 'Jungle Party', hi: 'जंगल पार्टी' }, items: ['frog_jumps', 'bear_crawl', 'star_jumps', 'langdi', 'bhangra'] },
      { name: { en: 'Super Hero', hi: 'सुपर हीरो' }, items: ['shadow_boxing', 'squat', 'high_knees', 'superman', 'vrikshasana'] },
    ],
  },
  {
    id: 'teen', emoji: '⚡', color: '#3B5BDB', premium: true, weeks: 6, perWeek: 4, level: 2, rounds: 3, rest: 25,
    ages: ['teen'],
    name: { en: 'Teen Athlete', hi: 'टीन एथलीट' },
    tag: { en: 'Speed, strength and stamina for 13–17.', hi: '13–17 के लिए रफ़्तार, ताक़त और दम।' },
    about: { en: 'Bodyweight training for sport and confidence. Builds strength safely during growing years — no weights needed.', hi: 'खेल और आत्मविश्वास के लिए बॉडीवेट ट्रेनिंग। बढ़ती उम्र में सुरक्षित तरीक़े से ताक़त — बिना वज़न के।' },
    warm: WARM, cool: COOL,
    sessions: [
      { name: { en: 'Power', hi: 'पावर' }, items: ['jump_squat', 'pushup', 'mountain_climbers', 'plank', 'high_knees'] },
      { name: { en: 'Engine', hi: 'इंजन' }, items: ['lunge', 'knee_pushup', 'superman', 'skipping', 'leg_raise'] },
    ],
  },
  {
    id: 'shakti', emoji: '🌺', color: '#D6336C', premium: true, weeks: 8, perWeek: 4, level: 1, rounds: 3, rest: 20,
    ages: ['adult', 'mid', 'teen'],
    name: { en: 'Shakti — Strength for Women', hi: 'शक्ति — महिलाओं के लिए ताक़त' },
    tag: { en: 'Tone and strengthen at home in 20 minutes.', hi: 'घर पर 20 मिनट में ताक़त और कसाव।' },
    about: { en: 'Lower body, core and upper-body strength you can do in a small room — in a salwar or a saree, no equipment.', hi: 'पैर, पेट और ऊपरी शरीर की ताक़त जो छोटे कमरे में हो जाए — सलवार हो या साड़ी, कोई सामान नहीं चाहिए।' },
    warm: WARM, cool: ['cat_cow', 'child_pose', 'breathing'],
    sessions: [
      { name: { en: 'Legs & Hips', hi: 'पैर और कूल्हे' }, items: ['squat', 'glute_bridge', 'side_leg_raise', 'lunge', 'calf_raise'] },
      { name: { en: 'Arms & Core', hi: 'बाज़ू और पेट' }, items: ['knee_pushup', 'superman', 'bird_dog', 'plank', 'knee_to_elbow'] },
      { name: { en: 'Cardio Tone', hi: 'कार्डियो टोन' }, items: ['bhangra', 'step_jacks', 'squat', 'crunch', 'wall_sit'] },
    ],
  },
  {
    id: 'desk', emoji: '💺', color: '#5F3DC4', premium: true, weeks: 4, perWeek: 5, level: 1, rounds: 2, rest: 10,
    ages: ['adult', 'mid'],
    name: { en: 'Desk Detox', hi: 'डेस्क डिटॉक्स' },
    tag: { en: 'Short daily fixes for a stiff back.', hi: 'अकड़ी पीठ के लिए रोज़ की छोटी कसरत।' },
    about: { en: 'For people who sit all day. Short daily sessions open the chest, wake up the hips and strengthen posture muscles.', hi: 'दिनभर बैठने वालों के लिए। रोज़ के छोटे सेशन सीना खोलते हैं, कूल्हे जगाते हैं और पोस्चर मज़बूत करते हैं।' },
    warm: ['arm_circles', 'side_bend'], cool: ['tadasana', 'breathing'],
    sessions: [
      { name: { en: 'Back Reset', hi: 'पीठ रीसेट' }, items: ['cat_cow', 'cobra', 'bird_dog', 'chair_sit_stand'] },
      { name: { en: 'Posture Fix', hi: 'पोस्चर सुधार' }, items: ['wall_pushup', 'superman', 'torso_twist', 'glute_bridge'] },
    ],
  },
  {
    id: 'shaadi', emoji: '🎉', color: '#E8590C', premium: true, weeks: 6, perWeek: 5, level: 2, rounds: 3, rest: 20,
    ages: ['adult'],
    name: { en: 'Shaadi Ready', hi: 'शादी रेडी' },
    tag: { en: '6 weeks to look and feel your best.', hi: '6 हफ़्तों में सबसे अच्छे दिखें और महसूस करें।' },
    about: { en: 'A wedding on the calendar? This high-energy 6-week plan mixes dance cardio, strength and core, five days a week.', hi: 'शादी आने वाली है? यह जोशीला 6 हफ़्ते का प्लान डांस कार्डियो, ताक़त और पेट की कसरत मिलाता है — हफ़्ते में पाँच दिन।' },
    warm: WARM, cool: COOL,
    sessions: [
      { name: { en: 'Sangeet Cardio', hi: 'संगीत कार्डियो' }, items: ['bhangra', 'squat', 'pushup', 'mountain_climbers', 'plank'] },
      { name: { en: 'Sculpt', hi: 'कसाव' }, items: ['jumping_jacks', 'lunge', 'glute_bridge', 'shadow_boxing', 'crunch'] },
      { name: { en: 'Full Power', hi: 'फ़ुल पावर' }, items: ['skipping', 'jump_squat', 'superman', 'high_knees', 'leg_raise'] },
    ],
  },
]

export const JMAP = Object.fromEntries(JOURNEYS.map((j) => [j.id, j]))

// One-off workouts for the Explore tab.
export const QUICK = [
  { id: 'morning5', emoji: '☀️', premium: false, rounds: 1, rest: 10, name: { en: 'Morning Energiser', hi: 'सुबह की ताज़गी' }, warm: [], cool: [], items: ['tadasana', 'arm_circles', 'march', 'squat', 'step_jacks', 'side_bend', 'breathing'] },
  { id: 'fullbody7', emoji: '🏠', premium: false, rounds: 2, rest: 15, name: { en: 'Quick Full Body', hi: 'झटपट पूरा शरीर' }, warm: ['march'], cool: [], items: ['squat', 'knee_pushup', 'knee_to_elbow', 'glute_bridge', 'plank'] },
  { id: 'chairbreak', emoji: '🪑', premium: false, rounds: 1, rest: 10, name: { en: 'Office Chair Break', hi: 'ऑफ़िस कुर्सी ब्रेक' }, warm: [], cool: [], items: ['seated_march', 'seated_arm_raise', 'ankle_circles', 'chair_sit_stand', 'side_bend', 'tadasana'] },
  { id: 'kidsparty', emoji: '🐸', premium: false, rounds: 2, rest: 15, name: { en: 'Kids Animal Party', hi: 'बच्चों की जानवर पार्टी' }, warm: [], cool: ['butterfly'], items: ['frog_jumps', 'bear_crawl', 'star_jumps', 'langdi'] },
  { id: 'surya10', emoji: '🌅', premium: true, rounds: 2, rest: 15, name: { en: 'Surya Flow', hi: 'सूर्य प्रवाह' }, warm: ['tadasana'], cool: ['shavasana'], items: ['surya_namaskar', 'vrikshasana'] },
  { id: 'kneefriendly', emoji: '🦵', premium: true, rounds: 2, rest: 20, name: { en: 'Knee-Friendly Cardio', hi: 'घुटनों पर आसान कार्डियो' }, warm: ['march'], cool: ['breathing'], items: ['step_jacks', 'shadow_boxing', 'knee_to_elbow', 'calf_raise', 'march'] },
  { id: 'core8', emoji: '🎯', premium: true, rounds: 2, rest: 15, name: { en: 'Core Blast', hi: 'पेट की कसरत' }, warm: [], cool: ['cobra'], items: ['plank', 'crunch', 'leg_raise', 'bird_dog', 'mountain_climbers'] },
  { id: 'sleep', emoji: '🌙', premium: true, rounds: 1, rest: 5, name: { en: 'Sleep Wind-Down', hi: 'नींद से पहले आराम' }, warm: [], cool: [], items: ['cat_cow', 'child_pose', 'butterfly', 'breathing', 'shavasana'] },
]
export const QMAP = Object.fromEntries(QUICK.map((q) => [q.id, q]))

// Which journey to suggest after onboarding.
export function recommend({ age, goal, level }) {
  if (age === 'kid') return 'kids'
  if (age === 'teen') return goal === 'flex' ? 'surya' : 'teen'
  if (age === 'senior') return goal === 'flex' ? 'surya' : goal === 'lose' ? 'walkfit' : 'golden'
  if (goal === 'flex') return 'surya'
  if (age === 'mid') return goal === 'lose' ? (level === 'beginner' ? 'walkfit' : 'fatloss') : 'active40'
  if (level === 'beginner') return goal === 'lose' ? 'walkfit' : 'shuruaat'
  if (goal === 'lose') return 'fatloss'
  if (goal === 'strong') return 'desi'
  return 'shuruaat'
}
