'use client'

import { useEffect, useState } from 'react'
import { useStored } from '@/lib/storage'

// A certificate of completion that can be printed or saved as PDF from the browser's print dialog. It is made on the device from the
// learner's own progress: it is a keepsake, not an accredited qualification, and it says so.
export default function Certificate({ course, average, lessons }: { course: string; average: number; lessons: number }) {
  const [name, setName] = useStored<string>('deen:cert-name', '')
  const [date, setDate] = useState('')
  useEffect(() => setDate(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })), [])
  useEffect(() => {
    const clear = () => document.documentElement.classList.remove('printing-cert')
    window.addEventListener('afterprint', clear)
    return () => window.removeEventListener('afterprint', clear)
  }, [])
  const print = () => {
    document.documentElement.classList.add('printing-cert')
    window.print()
  }
  const who = (typeof name === 'string' ? name : '').trim().slice(0, 60)
  return (
    <section className="mt-6 space-y-3" aria-label="Certificate" data-testid="certificate">
      <h2 className="font-bold text-[#0F766E]">🎓 You completed this course</h2>
      <label className="block text-sm">
        Name on the certificate
        <input value={typeof name === 'string' ? name : ''} onChange={(e) => setName(e.target.value.slice(0, 60))} className="mt-1 w-full rounded-xl border border-gray-300 p-2" placeholder="Your name" aria-label="Name on the certificate" />
      </label>
      <div className="cert rounded-2xl border-4 border-double border-[#D4AF37] bg-white p-6 text-center text-gray-900">
        <p className="text-xs tracking-widest text-gray-500">CERTIFICATE OF COMPLETION</p>
        <p dir="rtl" lang="ar" className="font-arabic text-2xl mt-2 text-[#0F766E]">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <p className="mt-4 text-sm">This certifies that</p>
        <p className="text-2xl font-black my-1" data-testid="cert-name">{who || '…………………'}</p>
        <p className="text-sm">has completed all {lessons} lessons of</p>
        <p className="text-xl font-bold text-[#0F766E] mt-1">{course}</p>
        <p className="text-sm mt-1">with an average score of {average}%</p>
        <p className="text-xs text-gray-500 mt-4">{date} · Deen Companion Academy</p>
        <p className="text-[10px] text-gray-400 mt-2">A personal record of study, not an accredited qualification.</p>
      </div>
      <button type="button" onClick={print} className="rounded-xl bg-[#0F766E] text-white px-4 py-2 font-semibold">Print or save as PDF</button>
    </section>
  )
}
