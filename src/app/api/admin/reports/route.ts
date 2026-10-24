import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { REPORT_STATUSES, deleteReport, listReports, setReportStatus, type ReportStatus } from '@/lib/reports'

// GET    /api/admin/reports                       -> the reports, newest first
// POST   /api/admin/reports { id, status }        -> mark open / looking / resolved
// DELETE /api/admin/reports?id=<id>               -> remove one
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ reports: await listReports(200) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const b = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown }
  if (typeof b.id !== 'string' || !/^[0-9a-f]{10}$/.test(b.id) || !REPORT_STATUSES.includes(b.status as ReportStatus)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  return NextResponse.json({ ok: await setReportStatus(b.id, b.status as ReportStatus) })
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied
  const id = request.nextUrl.searchParams.get('id') ?? ''
  if (!/^[0-9a-f]{10}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  return NextResponse.json({ ok: await deleteReport(id) })
}
