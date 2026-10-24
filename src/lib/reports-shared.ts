// Shared by the report page (browser) and the server: no server-only imports here.

export const REPORT_CATEGORIES = [
  { id: 'content', label: 'A mistake in the Quran, hadith, translation or lesson', urgent: true },
  { id: 'prayer', label: 'A wrong prayer time or qibla direction', urgent: true },
  { id: 'bug', label: 'Something is broken or not working', urgent: false },
  { id: 'abuse', label: 'Inappropriate or harmful content', urgent: true },
  { id: 'idea', label: 'An idea or suggestion', urgent: false },
  { id: 'other', label: 'Something else', urgent: false },
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['id']
export const REPORT_STATUSES = ['open', 'looking', 'resolved'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export type Report = { id: string; at: number; category: ReportCategory; message: string; page: string; ref?: string; contact?: string; status: ReportStatus }

export const isUrgent = (c: ReportCategory) => REPORT_CATEGORIES.find((x) => x.id === c)?.urgent ?? false
