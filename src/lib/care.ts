// Safety rules for the AI companion, kept as plain functions so they can be tested.
//   1. Someone who writes that they want to die or harm themselves is NOT sent to an AI model. They get a kind, fixed reply
//      that points to emergency help and to people they trust, with verses of hope.
//   2. Questions that call for a personal ruling or professional advice get a clear note to ask a qualified scholar / doctor.
//   3. After an answer, a few follow-up questions are suggested from the sources found (no AI tokens needed).

// ───────── 1. a person in distress ─────────
const CRISIS_EN =
  /\b(kill(ing)? (myself|my ?self)|end(ing)? (my|this) life|take (my|my own) life|taking my own life|suicid(e|al)|want(ed)? to die|wanna die|(don'?t|do not|dont) want to (live|be alive|exist|be here)|no (reason|point) (to|in) (live|living|going on)|better off (dead|without me)|(hurt(ing)?|harm(ing)?|cut(ting)?) (myself|my ?self)|self[- ]?harm|end it all)\b/i
// Other languages: a match is enough (there is no easy "about someone else" check), and caring too much is the safe side.
const CRISIS_OTHER = [
  /(انتحار|أنتحر|اقتل نفسي|أقتل نفسي|اقتل نفسى|أريد أن أموت|ابغى اموت|أتمنى الموت|لا أريد أن أعيش|أنهي حياتي)/,
  /(me suicider|au suicide|envie de mourir|veux mourir|mettre fin à (mes jours|ma vie)|me faire du mal)/i,
  /(suicidarme|suicidio|quiero morir|quitarme la vida|acabar con mi vida|hacerme daño)/i,
  /(bunuh diri|ingin mati|mau mati|nak mati|mengakhiri hidup)/i,
  /(intihar|ölmek istiyorum|canıma kıymak|hayatıma son)/i,
  /(خودکشی|مرنا چاہتا|مرنا چاہتی|اپنی جان)/,
  /(আত্মহত্যা|মরে যেতে চাই|নিজেকে শেষ)/,
  /(kujiua|nataka kufa|kujiumiza)/i,
  /(kashe kaina|ina so in mutu)/i,
  /(suizid|selbstmord|will sterben|mich umbringen)/i,
  /(суицид|самоубийств|покончить с собой|хочу умереть)/i,
]
// "What is the ruling on suicide?" is a question about the topic, not a cry for help — unless the person also speaks about themselves.

const ABOUT_TOPIC_EN = /\b(ruling|haram|halal|forbidden|permissible|punishment|hadith|verse|ayah|quran|islam|islamic|scholars?|fatwa|view on|what does|why do|why would|why is|people|someone|somebody|others|a person)\b/i
const PERSONAL_EN = /\b(i|i'm|im|i am|i've|ive|my|me|myself)\b/i

export function needsCare(message: string): boolean {
  const m = message.slice(0, 2000)
  if (CRISIS_OTHER.some((r) => r.test(m))) return true
  if (!CRISIS_EN.test(m)) return false
  return PERSONAL_EN.test(m) || !ABOUT_TOPIC_EN.test(m) // speaking about oneself, or not clearly a question about the topic: be caring
}

const CARE: Record<string, string> = {
  en: `I'm really sorry that you are going through this. What you feel matters, and you do not have to carry it alone.

If you might act on these thoughts, or you are in danger right now, please call your local emergency number straight away. You can also find a free, confidential crisis line for your country at findahelpline.com. And please tell someone you trust today — a family member, a friend, or an imam — and, if you can, see a doctor or a counsellor. Seeking treatment is encouraged in Islam.

You are not alone, and Allah's mercy is greater than the pain you feel. Here are a few verses that many people find comfort in:`,
  ar: `يؤسفني أنك تمرّ بهذا. ما تشعر به مهم، ولا يجب أن تحمله وحدك.

إذا كنتَ قد تؤذي نفسك، أو كنتَ في خطر الآن، فاتصل برقم الطوارئ في بلدك فورًا. ويمكنك أيضًا العثور على خط مساعدة مجاني وسري في بلدك عبر findahelpline.com. وأرجو أن تخبر اليوم شخصًا تثق به — فردًا من أسرتك أو صديقًا أو إمامًا — وأن تزور طبيبًا أو مختصًّا نفسيًّا إن استطعت. فالعلاج مشروع ومحبَّب في الإسلام.

أنت لست وحدك، ورحمة الله أوسع من ألمك. وهذه آيات يجد فيها كثيرون طمأنينة:`,
  fr: `Je suis vraiment désolé que vous traversiez cela. Ce que vous ressentez compte, et vous n'avez pas à le porter seul(e).

Si vous risquez de passer à l'acte, ou si vous êtes en danger maintenant, appelez tout de suite le numéro d'urgence de votre pays. Vous pouvez aussi trouver une ligne d'écoute gratuite et confidentielle sur findahelpline.com. Et parlez aujourd'hui à une personne de confiance — un proche, un ami ou un imam — et, si possible, consultez un médecin ou un psychologue. Se faire soigner est encouragé en islam.

Vous n'êtes pas seul(e), et la miséricorde d'Allah est plus grande que votre douleur. Voici quelques versets qui apportent du réconfort à beaucoup de personnes :`,
  es: `Lamento mucho que estés pasando por esto. Lo que sientes importa, y no tienes que llevarlo solo/a.

Si podrías hacerte daño, o estás en peligro ahora mismo, llama de inmediato al número de emergencias de tu país. También puedes encontrar una línea de ayuda gratuita y confidencial en findahelpline.com. Y por favor cuéntaselo hoy a alguien de confianza — un familiar, un amigo o un imán — y, si puedes, acude a un médico o a un psicólogo. Buscar tratamiento está recomendado en el islam.

No estás solo/a, y la misericordia de Alá es mayor que tu dolor. Aquí tienes algunos versículos que a mucha gente le dan consuelo:`,
  id: `Saya sangat menyesal kamu sedang melewati ini. Perasaanmu penting, dan kamu tidak harus menanggungnya sendirian.

Jika kamu mungkin menyakiti dirimu, atau sedang dalam bahaya sekarang, segera hubungi nomor darurat di negaramu. Kamu juga bisa menemukan layanan bantuan krisis yang gratis dan rahasia di findahelpline.com. Dan tolong ceritakan hari ini kepada orang yang kamu percaya — keluarga, teman, atau imam — dan, jika bisa, temui dokter atau konselor. Berobat dianjurkan dalam Islam.

Kamu tidak sendirian, dan rahmat Allah lebih besar daripada rasa sakitmu. Berikut beberapa ayat yang menenangkan banyak orang:`,
  tr: `Bunları yaşadığın için çok üzgünüm. Hissettiklerin önemli ve bunu yalnız taşımak zorunda değilsin.

Kendine zarar verebilecek durumdaysan ya da şu anda tehlikedeysen lütfen hemen ülkenin acil durum numarasını ara. Ülken için ücretsiz ve gizli bir yardım hattını findahelpline.com adresinde de bulabilirsin. Bugün güvendiğin birine — bir aile üyesine, arkadaşına ya da bir imama — anlat ve mümkünse bir doktora ya da psikoloğa git. İslam'da tedavi olmak teşvik edilir.

Yalnız değilsin; Allah'ın rahmeti acından daha büyüktür. İşte birçok insanın teselli bulduğu birkaç ayet:`,
}

export const careText = (lang: string) => CARE[lang] ?? CARE.en
// Which language to reply in: the one the person wrote in if it is Arabic, otherwise the app's language (when we have text for it).
export function careLang(message: string, lang?: string): string {
  if ((message.match(/[؀-ۿ]/g) ?? []).length >= 3 && !/[ٹکھہے]/.test(message)) return 'ar' // Arabic script, not Urdu
  return lang && CARE[lang] ? lang : 'en'
}
// Verses offered as comfort: don't despair of Allah's mercy; no soul is burdened beyond its capacity; with hardship comes ease.
export const CARE_VERSES: [number, number][] = [
  [39, 53],
  [2, 286],
  [94, 5],
  [94, 6],
]

// ───────── 2. questions that need a scholar or a doctor ─────────
const RULING =
  /\b(is it|are we|am i|can i|may i|should i|do i have to|must i)\b.{0,60}\b(halal|haram|permissible|allowed|forbidden|sinful|makruh|valid|invalid)\b|\b(fatwa|ruling on|verdict|talaq|divorc(e|ed|ing)|khula|inherit(ance|ed)?|will and testament|custody|mortgage|riba|interest rate|loan|insurance|abortion|ivf|surrogat|stocks?|shares|crypto(currency)?|bitcoin|forex|trading|apostasy|takfir|zakat on)\b/i
const HEALTH = /\b(medic(ation|ine|al)|dos(e|es|age)|paracetamol|ibuprofen|antibiotics?|prescri(ption|bed)|diagnos(is|ed)|pregnan(t|cy)|miscarriage|depress(ed|ion)|anxiety disorder|surgery|symptoms?|cancer|diabetes|therapy)\b/i

export const SCHOLAR_NOTE = 'ⓘ This is general educational information, not a fatwa or professional advice. For your own situation, please ask a qualified local scholar — and for anything about health, a doctor.'

export function needsScholarNote(message: string): boolean {
  return RULING.test(message) || HEALTH.test(message)
}

// Adds the note unless the answer already says something equivalent.
export function withScholarNote(message: string, answer: string): string {
  if (!needsScholarNote(message)) return answer
  if (/qualified|scholar|imam|mufti/i.test(answer.slice(-400)) && /not a fatwa|general|educational|doctor/i.test(answer.slice(-400))) return answer
  return answer.trimEnd() + '\n\n' + SCHOLAR_NOTE
}

// ───────── 3. suggested next questions ─────────
export function followUps(sources: { kind: 'quran' | 'hadith'; ref: string }[]): string[] {
  const out: string[] = []
  const q = sources.find((s) => s.kind === 'quran')
  const h = sources.find((s) => s.kind === 'hadith')
  if (q) out.push(`Explain Quran ${q.ref}`)
  if (h) out.push(`Explain this hadith: ${h.ref}`)
  if (q && !h) out.push(`What do the scholars say about Quran ${q.ref}?`)
  out.push('Explain it more simply')
  return out.slice(0, 3)
}
