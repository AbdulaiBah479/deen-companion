// Calculators for Zakat al-Fitr, fidya and kaffarah. Each result is "number of people to feed × what one meal or one measure costs
// where you live", and the person types the local price, because prices differ everywhere. The rulings behind them are from the
// Quran and Sunnah, and the notes say where scholars differ (for example the size of the measure). Not a fatwa.

export type Result = { total: number; people: number; perPerson: number; note: string }
const cents = (n: number) => Math.round(n * 100) / 100
const pos = (n: unknown, max: number) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max ? n : null)

// Zakat al-Fitr: one sa' of staple food for every person you support, paid before the Eid prayer.
// A sa' is about 2.5 to 3 kg depending on the food and the scholarly opinion; 2.5 kg is the figure many authorities use as the minimum.
export const SA_KG = { low: 2.5, high: 3 }
export function zakatAlFitr(people: number, pricePerKg: number, kg = SA_KG.low): Result | null {
  const p = pos(people, 1000)
  const price = pos(pricePerKg, 1_000_000)
  const k = pos(kg, 10)
  if (p === null || price === null || k === null || !Number.isInteger(p) || p < 1) return null
  const perPerson = cents(price * k)
  return { total: cents(perPerson * p), people: p, perPerson, note: `${p} ${p === 1 ? 'person' : 'people'} × ${k} kg of staple food. Some scholars allow paying its value in money; others say to give the food itself. Pay before the Eid prayer.` }
}

// Fidya: for each day of fasting missed because of a lasting inability (old age, a long illness), feed one poor person.
// The amount is a day's food, commonly counted as two meals; many scholars state it as half a sa' of wheat.
export function fidya(days: number, mealCost: number, mealsPerDay = 2): Result | null {
  const d = pos(days, 10_000)
  const m = pos(mealCost, 1_000_000)
  const n = pos(mealsPerDay, 5)
  if (d === null || m === null || n === null || !Number.isInteger(d) || d < 1) return null
  const perPerson = cents(m * n)
  return { total: cents(perPerson * d), people: d, perPerson, note: `${d} ${d === 1 ? 'day' : 'days'}, one poor person fed for each. Fidya is for those who cannot fast and are not expected to be able to; others make the days up. Ask a scholar which applies to you.` }
}

// Kaffarah for a broken oath (Quran 5:89): feed ten poor people, or clothe them, or free a slave; if none is possible, fast three days.
export function kaffarahOath(mealCost: number, people = 10): Result | null {
  const m = pos(mealCost, 1_000_000)
  const p = pos(people, 100)
  if (m === null || p === null || !Number.isInteger(p) || p < 1) return null
  return { total: cents(m * p), people: p, perPerson: cents(m), note: 'Feeding ten poor people an average meal each. The other options are clothing them, or fasting three days if you cannot afford it.' }
}

// Kaffarah for deliberately breaking a Ramadan fast with intercourse: free a slave, else fast two months in a row, else feed sixty poor people.
export function kaffarahFast(mealCost: number): Result | null {
  const m = pos(mealCost, 1_000_000)
  if (m === null) return null
  return { total: cents(m * 60), people: 60, perPerson: cents(m), note: 'Feeding sixty poor people is for someone who cannot fast two months in a row. The order of the options matters, and the day itself must also be made up. Ask a scholar.' }
}
