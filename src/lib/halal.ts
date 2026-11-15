// A guide to ingredients and E-numbers on food labels. It cannot know where a particular product's ingredient came from, so each
// entry says what it is and when it needs checking. Scholars and certifying bodies differ on some of these (shellac, carmine,
// alcohol in flavourings), and the entry says so rather than choosing for you. Not a fatwa: when in doubt, look for a halal
// certificate from a body you trust, or leave it.

export type Status = 'ok' | 'check' | 'avoid'
export type Item = { code: string; name: string; status: Status; note: string }

const ok = (code: string, name: string, note = 'Plant, mineral or synthetic: generally permissible.'): Item => ({ code, name, status: 'ok', note })
const check = (code: string, name: string, note: string): Item => ({ code, name, status: 'check', note })
const avoid = (code: string, name: string, note: string): Item => ({ code, name, status: 'avoid', note })

export const ITEMS: Item[] = [
  avoid('', 'Pork, lard, bacon, ham', 'Pork and everything from it is forbidden (Quran 2:173).'),
  avoid('', 'Alcohol as a drink: wine, beer, spirits, sake, mirin', 'Intoxicants are forbidden (Quran 5:90).'),
  avoid('', 'Blood and blood products', 'Flowing blood is forbidden (Quran 6:145).'),
  check('E441', 'Gelatine', 'Pork gelatine is forbidden. Beef gelatine is only permissible from an animal slaughtered the halal way. Fish gelatine and halal-certified gelatine are fine. Look for the source.'),
  check('E120', 'Carmine / cochineal (red colour)', 'Made from crushed insects. Scholars differ: some permit it, many advise avoiding it. Plant reds (E162 beetroot) are an easy substitute.'),
  check('E904', 'Shellac / confectioner’s glaze', 'A resin secreted by lac insects. Many scholars permit it; some avoid it. Used on sweets and fruit.'),
  check('E920', 'L-cysteine', 'A dough improver. It can come from hair, feathers or pig bristles, or be made without animals. Check the source.'),
  check('E471', 'Mono- and diglycerides of fatty acids', 'Made from fats that can be plant or animal (including pork). Look for “vegetable” or a halal certificate.'),
  check('E470a', 'Sodium, potassium, calcium salts of fatty acids', 'Source of the fat can be animal. Check.'),
  check('E470b', 'Magnesium salts of fatty acids', 'Source of the fat can be animal. Check.'),
  check('E472a', 'Acetic acid esters of E471', 'Follows the source of E471: plant or animal. Check.'),
  check('E472b', 'Lactic acid esters of E471', 'Follows the source of E471: plant or animal. Check.'),
  check('E472c', 'Citric acid esters of E471', 'Follows the source of E471: plant or animal. Check.'),
  check('E472e', 'DATEM (diacetyl tartaric esters of E471)', 'Follows the source of E471: plant or animal. Check.'),
  check('E475', 'Polyglycerol esters of fatty acids', 'Fat source can be animal. Check.'),
  check('E481', 'Sodium stearoyl lactylate', 'Fat source can be animal. Check.'),
  check('E482', 'Calcium stearoyl lactylate', 'Fat source can be animal. Check.'),
  check('E422', 'Glycerol / glycerine', 'Can be from plants or animal fat. Check the source.'),
  check('E430', 'Polyoxyethylene (8) stearate', 'Fat source can be animal. Check.'),
  check('E431', 'Polyoxyethylene (40) stearate', 'Fat source can be animal. Check.'),
  check('E491', 'Sorbitan monostearate', 'Fat source can be animal. Check.'),
  check('E492', 'Sorbitan tristearate', 'Fat source can be animal. Check.'),
  check('E570', 'Stearic acid', 'Can be from animal fat. Check.'),
  check('E572', 'Magnesium stearate', 'Often in tablets and supplements. Can be from animal fat. Check.'),
  avoid('E542', 'Edible bone phosphate', 'Made from animal bones. Avoid unless the bones are from a halal-slaughtered animal.'),
  check('E631', 'Disodium inosinate', 'A flavour enhancer that may come from meat or fish. Check.'),
  check('E627', 'Disodium guanylate', 'A flavour enhancer that may come from meat, fish or yeast. Check.'),
  check('E635', 'Disodium 5′-ribonucleotides', 'Mix of E627 and E631. Check.'),
  check('', 'Rennet (in cheese)', 'Animal rennet comes from calves’ stomachs; many scholars permit it only from halal-slaughtered animals. Microbial or vegetable rennet is fine. Look for “vegetarian cheese”.'),
  check('', 'Vanilla and other extracts made with alcohol', 'Alcohol used as a solvent in a tiny amount: scholars differ. Alcohol-free versions avoid the question.'),
  check('', '“Natural flavours”', 'The label does not say where they come from. They can contain alcohol or animal products. Look for a halal certificate.'),
  check('', 'Wine vinegar', 'Scholars differ on vinegar from wine; many permit it once it has fully turned to vinegar. Apple or malt vinegar is clear.'),
  check('', 'Whey and cheese made with animal rennet', 'Follows the rennet used. Check.'),
  check('', 'Pepsin', 'An enzyme often from pig stomachs. Check.'),
  check('E334', 'Tartaric acid', 'Often a by-product of winemaking. Most scholars permit it because it is chemically changed; some prefer to avoid it. Check your certifier.'),
  ok('E100', 'Curcumin (turmeric colour)'),
  ok('E101', 'Riboflavin (vitamin B2)', 'Usually made by fermentation: generally permissible.'),
  ok('E102', 'Tartrazine (yellow colour)', 'Permissible in terms of source. Some people avoid it for health reasons.'),
  ok('E160a', 'Carotenes'),
  ok('E162', 'Beetroot red'),
  ok('E200', 'Sorbic acid'),
  ok('E211', 'Sodium benzoate'),
  ok('E250', 'Sodium nitrite', 'Permissible in terms of source. Used in processed meat, which must itself be halal.'),
  ok('E260', 'Acetic acid (vinegar)', 'Permissible unless made from wine. See wine vinegar.'),
  ok('E300', 'Ascorbic acid (vitamin C)'),
  ok('E322', 'Lecithin', 'Usually from soya or sunflower. Rarely from egg or animal sources.'),
  ok('E330', 'Citric acid'),
  ok('E406', 'Agar'),
  ok('E407', 'Carrageenan'),
  ok('E412', 'Guar gum'),
  ok('E414', 'Gum arabic'),
  ok('E415', 'Xanthan gum'),
  ok('E440', 'Pectin'),
  ok('E500', 'Sodium carbonates (baking soda)'),
  ok('E501', 'Potassium carbonates'),
  ok('E509', 'Calcium chloride'),
  ok('E955', 'Sucralose', 'Permissible in terms of source.'),
]

export const STATUS_LABEL: Record<Status, string> = { ok: 'Generally permissible', check: 'Check the source', avoid: 'Avoid' }

const norm = (s: string) => s.toLowerCase().replace(/[\s\-–.,]/g, '')
// "e471", "E 471" or "471" find that code exactly; anything else matches words in the name or note ("gelatin" also finds "gelatine").
export function lookup(query: string, only?: Status): Item[] {
  const q = norm(query)
  const code = /^e?\d{3,4}[a-z]?$/.test(q) ? q.replace(/^e/, '') : ''
  return ITEMS.filter((i) => {
    if (only && i.status !== only) return false
    if (!q) return true
    if (code) return i.code !== '' && norm(i.code).replace(/^e/, '') === code
    return norm(i.name).includes(q) || norm(i.note).includes(q) || (q.length >= 5 && norm(i.name).includes(q.slice(0, -1)))
  })
}
