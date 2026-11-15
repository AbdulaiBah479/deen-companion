// The whole catalogue of courses on the Learn page: the original four (letters, Quran words, tajweed, foundations) and the Academy courses.
import { PATHS, STATIC_LESSONS, buildLetterLessons, type Lesson, type PathMeta } from './learn-content'
import { ACADEMY_LESSONS, ACADEMY_PATHS, type Audience, type CourseInfo } from './academy-content'

export type Course = PathMeta & { info: CourseInfo }
export type { Audience }

const ORIGINAL: Record<string, CourseInfo> = {
  letters: { audience: 'everyone', level: 'Beginner', minutes: 120, learn: ['Recognise all 28 letters', 'Know each letter’s sound', 'See how letters join in a word'] },
  words: { audience: 'everyone', level: 'Beginner', minutes: 200, learn: ['The most frequent words of the Quran', 'How they sound', 'Recognise them in verses'] },
  tajweed: { audience: 'everyone', level: 'Intermediate', minutes: 90, learn: ['The core rules of correct recitation', 'Noon sākinah and mīm sākinah', 'Madd and stopping'] },
  basics: { audience: 'everyone', level: 'Beginner', minutes: 60, learn: ['The pillars and the articles of faith', 'Wudu', 'The prayer'] },
}

export const COURSES: Course[] = [...PATHS.map((p) => ({ ...p, info: ORIGINAL[p.id] })), ...ACADEMY_PATHS]
export const courseById = (id: string) => COURSES.find((c) => c.id === id)

// Lessons that are written out in full (everything except the Arabic letters and the Quran words, which are built from data).
export const STATIC_ALL: Record<string, Lesson[]> = { ...STATIC_LESSONS, ...ACADEMY_LESSONS }

// The id of every lesson in a course, without loading anything. The Quran-words course is 40 lessons of ten words.
export function lessonIds(courseId: string): string[] {
  if (courseId === 'letters') return buildLetterLessons().map((l) => l.id)
  if (courseId === 'words') return Array.from({ length: 40 }, (_, i) => `words-${i + 1}`)
  return (STATIC_ALL[courseId] ?? []).map((l) => l.id)
}
