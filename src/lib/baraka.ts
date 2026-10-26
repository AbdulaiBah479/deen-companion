// Habits that bring baraka (blessing, increase and goodness that Allah places in time, wealth, food, family and effort).
// Baraka comes only from Allah. These are the means the Quran and the Prophet ﷺ pointed to, not charms or guarantees. Every hadith
// is from Sahih al-Bukhari or Sahih Muslim and is checked against the bundled text by tests/rituals.test.mts.
import type { HadithPin } from './rituals'

export type Habit = {
  id: string
  title: string
  area: 'Time and the day' | 'Food' | 'Money and work' | 'Home and family' | 'The heart'
  why: string
  how: string
  quran?: string[]
  hadith?: HadithPin[]
}

export const AREAS: Habit['area'][] = ['Time and the day', 'Food', 'Money and work', 'Home and family', 'The heart']

export const HABITS: Habit[] = [
  { id: 'suhoor', title: 'Take suhoor', area: 'Time and the day', why: 'The Prophet ﷺ said there is blessing in the pre-dawn meal.', how: 'Even a date or a sip of water before Fajr counts when you fast.', hadith: [{ book: 'bukhari', number: 1923, must: 'blessing' }] },
  { id: 'duha', title: 'Pray Duha and begin the day with charity', area: 'Time and the day', why: 'Each joint in the body owes a charity every morning; two rak‘ahs of Duha cover it.', how: 'After sunrise, pray two rak‘ahs. A kind word, a smile or a small gift is also charity.', hadith: [{ book: 'bukhari', number: 1981, must: 'Duha' }, { book: 'bukhari', number: 2989, must: 'joint' }] },
  { id: 'last-third', title: 'Ask in the last third of the night', area: 'Time and the day', why: 'Allah descends to the nearest heaven and asks who is calling on Him so that He may answer.', how: 'Wake a little before Fajr, pray two rak‘ahs, and ask for what you need for this world and the next.', hadith: [{ book: 'bukhari', number: 1145, must: 'third' }, { book: 'muslim', number: 1770, must: 'hour' }] },
  { id: 'friday-hour', title: 'Seek the hour of answer on Friday', area: 'Time and the day', why: 'There is an hour on Friday in which a Muslim who asks Allah for good is given it.', how: 'Make much dua on Friday. Scholars mention two likely times: from when the imam sits until the prayer ends, and the last hour before sunset.', hadith: [{ book: 'bukhari', number: 935, must: 'hour' }] },
  { id: 'bismillah-eat', title: 'Say Bismillah and eat with your right hand', area: 'Food', why: 'Remembering Allah at the start of a meal keeps the shaytan from sharing it and puts blessing in it.', how: 'Say “Bismillah”, eat with your right hand, and eat from what is in front of you.', hadith: [{ book: 'muslim', number: 5265, must: 'right hand' }] },
  { id: 'share-food', title: 'Share your food', area: 'Food', why: 'The Prophet ﷺ said that food for one is enough for two, and food for two is enough for four.', how: 'Invite a neighbour or a guest to a simple meal; share rather than waste.', hadith: [{ book: 'muslim', number: 5371, must: 'suffices' }] },
  { id: 'honest-trade', title: 'Be truthful and clear in buying and selling', area: 'Money and work', why: 'The Prophet ﷺ said that if the buyer and seller speak the truth and make things clear, their deal is blessed; if they hide and lie, its blessing is wiped out.', how: 'Describe your goods and prices honestly, give fair weight, and tell the buyer about any fault.', quran: ['83:1-3'], hadith: [{ book: 'bukhari', number: 2079, must: 'truth' }] },
  { id: 'charity', title: 'Give in charity, even a little', area: 'Money and work', why: 'Charity does not decrease wealth; Allah increases the one who gives.', how: 'Give something regularly, even a small amount, and give quietly when you can.', quran: ['2:261', '34:39'], hadith: [{ book: 'muslim', number: 6592, must: 'decrease' }] },
  { id: 'halal-work', title: 'Earn your living honestly', area: 'Money and work', why: 'The best food a person eats is what they earn by their own work.', how: 'Work with excellence, avoid anything that is haram, and be content with what is lawful.', quran: ['62:10'], hadith: [{ book: 'bukhari', number: 2072, must: 'hands' }] },
  { id: 'kin', title: 'Keep ties with your relatives', area: 'Home and family', why: 'The Prophet ﷺ said that whoever wants his provision to increase and his life to be extended should keep the ties of kinship.', how: 'Call, visit, forgive, and give a little to your relatives, even if they cut you off.', hadith: [{ book: 'bukhari', number: 5986, must: 'kin' }] },
  { id: 'dhikr-home', title: 'Make your home a place of remembrance', area: 'Home and family', why: 'A house where Allah is remembered is like the living, and one where He is not is like the dead.', how: 'Keep a daily time for dhikr and Quran at home; let your children hear it.', hadith: [{ book: 'bukhari', number: 6407, must: 'dead' }] },
  { id: 'baqarah', title: 'Recite Surat al-Baqarah in your home', area: 'Home and family', why: 'The shaytan runs away from a house in which Surat al-Baqarah is recited, and the Prophet ﷺ told us not to make our homes like graves.', how: 'Recite it, or play it, in your home, and pray some of your voluntary prayers at home.', hadith: [{ book: 'muslim', number: 1824, must: 'Satan' }] },
  { id: 'taqwa', title: 'Be conscious of Allah (taqwa)', area: 'The heart', why: 'Allah promises a way out and provision from where a person does not expect to those who fear Him.', how: 'Keep your obligations, guard your tongue and eyes, and turn back quickly when you slip.', quran: ['65:2-3', '7:96'] },
  { id: 'istighfar', title: 'Ask forgiveness often', area: 'The heart', why: 'Nuh عليه السلام told his people that seeking forgiveness brings rain, wealth and children.', how: 'Say “Astaghfirullah” throughout the day, and make it your habit after every prayer.', quran: ['71:10-12', '11:52'] },
  { id: 'gratitude', title: 'Be grateful', area: 'The heart', why: 'Allah promised to increase those who are thankful.', how: 'Name your blessings each night, thank people who help you, and use what Allah gave you well.', quran: ['14:7'] },
  { id: 'salawat', title: 'Send blessings on the Prophet ﷺ', area: 'The heart', why: 'Whoever sends blessings on him, Allah sends blessings on them.', how: 'Say “Allahumma salli ‘ala Muhammad” often, especially on Fridays and when you hear the adhan.', quran: ['33:56'], hadith: [{ book: 'muslim', number: 849, must: 'blessing' }] },
  { id: 'contentment', title: 'Be content (qana‘ah)', area: 'The heart', why: 'The Prophet ﷺ said that true wealth is not having many possessions, but feeling sufficiency in the soul.', how: 'Thank Allah for what you have; look at those with less than you, not more.', hadith: [{ book: 'bukhari', number: 6446, must: 'sufficiency' }] },
  { id: 'trust', title: 'Trust Allah while working', area: 'The heart', why: 'Whoever puts his trust in Allah, He is enough for him.', how: 'Take the means (work, plan, ask advice), then leave the result to Allah.', quran: ['65:3', '3:159'] },
]
