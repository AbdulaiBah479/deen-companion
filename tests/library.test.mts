// Tests the Library catalogue and the Wikipedia text parsing.  Run: npm run test:library
import { LIBRARY, LIBRARY_CATEGORIES, entryOfTheDay, findEntry, imagesAllowed, isSafeTitle } from '../src/lib/library.ts'
import { parseExtract, stripHtml } from '../src/lib/wiki.ts'
import { getStory } from '../src/lib/stories.ts'

let fails = 0
const ok = (name: string, cond: boolean, info = '') => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : ''))
  if (!cond) fails++
}

// ───────── catalogue ─────────
ok('150+ topics', LIBRARY.length >= 150, String(LIBRARY.length))
ok('every category has entries', LIBRARY_CATEGORIES.every((c) => LIBRARY.filter((x) => x.cat === c.id).length >= 10))
ok('titles are unique (case-insensitive)', new Set(LIBRARY.map((x) => x.title.toLowerCase())).size === LIBRARY.length)
ok('every title is accepted by the API filter', LIBRARY.every((x) => isSafeTitle(x.title)), LIBRARY.filter((x) => !isSafeTitle(x.title)).map((x) => x.title).join('|'))
ok('every linked Quran story exists', LIBRARY.every((x) => !x.story || !!getStory(x.story)), LIBRARY.filter((x) => x.story && !getStory(x.story)).map((x) => x.title).join('|'))
ok('prophets carry an honorific (the Prophet ﷺ gets ﷺ)', findEntry('Muhammad')?.honorific === 'ﷺ' && findEntry('Moses in Islam')?.honorific === 'عليه السلام')
ok('companions carry رضي الله عنه / عنها', findEntry('Abu Bakr')?.honorific === 'رضي الله عنه' && findEntry('Aisha')?.honorific === 'رضي الله عنها')
ok('lookup is case-insensitive', findEntry('mecca')?.title === 'Mecca')

// Images are only for places — never for pages that may show depictions of prophets, angels or companions.
ok('images: places yes', imagesAllowed('Mecca') && imagesAllowed('Hagia Sophia'))
ok('images: prophets, companions, history, unknown pages no', !imagesAllowed('Muhammad') && !imagesAllowed('Abu Bakr') && !imagesAllowed("Isra' and Mi'raj") && !imagesAllowed('Angels in Islam') && !imagesAllowed('Random search hit'))

// ───────── title filter (this is what keeps /api/library from being an open proxy) ─────────
ok('title filter: accepts normal titles', ["Isra' and Mi'raj", 'Mosque–Cathedral of Córdoba', 'Blue Mosque, Istanbul', 'Battle of the Trench', 'Ḥajj'].every(isSafeTitle))
ok('title filter: rejects URLs, paths, scripts, pipes, empty and huge', ['', 'http://evil.com', '../../etc/passwd', '<script>', 'a|b', 'x'.repeat(121), 'a/b', 'a#b', 'a%00'].every((t) => !isSafeTitle(t)))

// ───────── daily pick ─────────
ok('entry of the day: same date → same entry', entryOfTheDay('2026-10-16').title === entryOfTheDay('2026-10-16').title)
const days = new Set(Array.from({ length: 30 }, (_, i) => entryOfTheDay(`2026-11-${String(i + 1).padStart(2, '0')}`).title))
ok('entry of the day: varies across a month', days.size >= 15, String(days.size))

// ───────── article parsing ─────────
const sample = ['Intro one.', 'Intro two.', '', '== Life ==', 'Born in a city.', '', '=== Early years ===', 'Childhood details.', '', '== Legacy ==', 'Remembered.', '', '== See also ==', 'junk', '', '=== A sub of see also ===', 'junk2', '', '== References ==', 'refs', '== External links ==', 'links'].join('\n')
const p = parseExtract(sample)
ok('parse: intro is the text before the first heading', p.intro === 'Intro one.\nIntro two.')
ok('parse: keeps real sections in order', p.sections.map((s) => s.heading).join() === 'Life,Legacy', p.sections.map((s) => s.heading).join())
ok('parse: sub-sections are folded into their parent', p.sections[0].text.includes('Early years') && p.sections[0].text.includes('Childhood details.'))
ok('parse: See also / References / External links (and their subsections) are dropped', !JSON.stringify(p).includes('junk') && !JSON.stringify(p).includes('refs') && !JSON.stringify(p).includes('links'))
ok('parse: no headings → just an intro', parseExtract('Only text.\n\nMore.').sections.length === 0 && parseExtract('Only text.\n\nMore.').intro === 'Only text.\nMore.')
ok('parse: empty input is safe', parseExtract('').intro === '' && parseExtract('').sections.length === 0)
ok('parse: sections with no text are omitted', parseExtract('Hi\n== Empty ==\n\n== Full ==\nBody').sections.length === 1)
ok('parse: Windows line endings', parseExtract('Hi\r\n== A ==\r\nBody\r\n').sections[0]?.text === 'Body')

ok('stripHtml: removes search highlighting and entities', stripHtml('The <span class="searchmatch">Battle</span> of &quot;Badr&quot; &amp; more &#039;x&#039;') === 'The Battle of "Badr" & more \'x\'')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
