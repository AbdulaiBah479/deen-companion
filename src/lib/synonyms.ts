// Query-time synonyms for common concepts, so a search for "kindness" also finds verses that say
// "do good" or "mercy". Keys and values are plain English words; they are normalised (stemmed, American spelling)
// by the tokenizer when loaded. Synonyms only help ranking/recall; a document still has to match the
// original query terms (directly or through a synonym) to be returned.

const GROUPS: string[][] = [
  ['kindness', 'kind', 'good', 'goodness', 'mercy', 'compassion', 'gentle', 'gentleness', 'benevolent'],
  ['patience', 'patient', 'persevere', 'perseverance', 'endure', 'steadfast', 'constant'],
  ['hardship', 'trial', 'affliction', 'difficulty', 'distress', 'calamity', 'adversity', 'tribulation'],
  ['charity', 'alms', 'zakah', 'sadaqah', 'spend', 'give', 'generous', 'generosity'],
  ['prayer', 'pray', 'salah', 'salat', 'worship', 'prostrate'],
  ['fasting', 'fast', 'siyam', 'ramadan'],
  ['parents', 'parent', 'mother', 'father', 'mothers', 'fathers'],
  ['forgiveness', 'forgive', 'pardon', 'repent', 'repentance', 'mercy'],
  ['honesty', 'honest', 'truthful', 'truth', 'sincere', 'trustworthy', 'trust'],
  ['justice', 'just', 'fair', 'equity', 'injustice', 'oppression', 'wrong'],
  ['anger', 'angry', 'wrath', 'rage', 'temper'],
  ['gratitude', 'grateful', 'thank', 'thanks', 'thankful', 'shukr'],
  ['death', 'die', 'dying', 'grave', 'hereafter'],
  ['paradise', 'jannah', 'garden', 'gardens', 'heaven'],
  ['hell', 'fire', 'hellfire', 'jahannam', 'punishment'],
  ['poor', 'poverty', 'needy', 'destitute', 'beggar'],
  ['orphan', 'orphans', 'fatherless'],
  ['marriage', 'marry', 'spouse', 'wife', 'wives', 'husband', 'wedlock'],
  ['women', 'woman', 'female', 'daughter', 'sister'],
  ['children', 'child', 'son', 'sons', 'offspring', 'baby'],
  ['knowledge', 'learn', 'learning', 'scholar', 'teach', 'understanding', 'wisdom'],
  ['wealth', 'money', 'riches', 'property', 'provision', 'sustenance'],
  ['interest', 'usury', 'riba'],
  ['pride', 'arrogance', 'arrogant', 'boast', 'haughty', 'humble', 'humility'],
  ['neighbor', 'neighbour', 'neighbors', 'neighbours'],
  ['friend', 'friends', 'companion', 'brotherhood', 'brother'],
  ['anxiety', 'worry', 'fear', 'grief', 'sorrow', 'sadness', 'depression', 'despair'],
  ['hope', 'optimism', 'despair', 'relief', 'ease'],
  ['guidance', 'guide', 'guided', 'straight', 'path'],
  ['sin', 'sins', 'wrongdoing', 'transgress', 'disobedience'],
  ['prophet', 'messenger', 'apostle'],
  ['pilgrimage', 'hajj', 'umrah', 'kaaba', 'makkah'],
  ['sleep', 'sleeping', 'dream', 'night', 'rest'],
  ['food', 'eat', 'eating', 'drink', 'halal', 'lawful'],
  ['dress', 'clothing', 'modesty', 'cover', 'hijab', 'garment'],
  ['lie', 'lying', 'falsehood', 'deceive', 'deceit', 'cheat'],
  ['backbite', 'backbiting', 'gossip', 'slander', 'speech', 'tongue'],
  ['health', 'sick', 'sickness', 'illness', 'disease', 'cure', 'heal'],
  ['travel', 'journey', 'traveler', 'traveller'],
  ['education', 'school', 'study', 'read', 'reading', 'write', 'pen'],
  ['work', 'earn', 'livelihood', 'labor', 'business', 'trade'],
  ['animals', 'animal', 'cattle', 'creature', 'bird', 'birds'],
  ['environment', 'earth', 'nature', 'creation', 'tree', 'trees', 'water'],
  ['unity', 'unite', 'together', 'community', 'ummah', 'congregation'],
]

export function buildSynonymIndex(normalize: (w: string) => string): Map<string, string[]> {
  const index = new Map<string, Set<string>>()
  for (const group of GROUPS) {
    const norm = [...new Set(group.map(normalize).filter(Boolean))]
    for (const w of norm) {
      if (!index.has(w)) index.set(w, new Set())
      for (const other of norm) if (other !== w) index.get(w)!.add(other)
    }
  }
  return new Map([...index].map(([k, v]) => [k, [...v]]))
}
