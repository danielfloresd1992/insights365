import { DEMO_WEEK } from '../landing.content'

/*  EL CUADRO GENERAL DE LA SEMANA, como lo enseña el portal: la tabla de la hoja 2 del semanal, con su cabecera
 *  gris y los turnos que llegaron. Solo pinta. */
type SummaryCardProps = {
  className?: string
}

export default function SummaryCard({ className = '' }: SummaryCardProps) {
  return (
    <div data-ui className={`w-full max-w-[470px] rounded-2xl border border-white/10 bg-[#1d1912] p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] ${className}`}>
      <div className='flex items-baseline justify-between gap-4'>
        <p className='font-semibold text-[#f4ecdc]'>Cuadro general</p>
        <p className='font-geist-mono text-sm text-[#cfc4b1]'>
          {DEMO_WEEK.shiftsFound} de {DEMO_WEEK.shiftsExpected} turnos
        </p>
      </div>
      <p className='mt-1 text-sm text-[#cfc4b1]'>
        {DEMO_WEEK.branch} · {DEMO_WEEK.range}
      </p>
      <table className='mt-4 w-full border-collapse text-[13px]'>
        <thead>
          <tr className='bg-[#818181] text-white'>
            <th scope='col' className='rounded-l-md px-3 py-2 text-left font-semibold'>Concepto</th>
            <th scope='col' className='px-2 py-2 font-semibold'>Diurno</th>
            <th scope='col' className='px-2 py-2 font-semibold'>Nocturno</th>
            <th scope='col' className='rounded-r-md px-3 py-2 font-semibold'>Total</th>
          </tr>
        </thead>
        <tbody className='font-geist-mono'>
          {DEMO_WEEK.summary.map(row => (
            <tr key={row.label} className='border-b border-white/[0.07] last:border-0'>
              <th scope='row' className='px-3 py-2 text-left font-geist font-normal leading-snug text-[#d9cfbd]'>{row.label}</th>
              <td className='px-2 py-2 text-center tabular-nums text-[#f4ecdc]'>{row.day}</td>
              <td className='px-2 py-2 text-center tabular-nums text-[#f4ecdc]'>{row.night}</td>
              <td className='px-3 py-2 text-center font-medium tabular-nums text-[#ffb47e]'>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
