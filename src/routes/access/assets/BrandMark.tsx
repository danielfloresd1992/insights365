/*  EL SÍMBOLO DE insights365: tres barras que suben, en verde, ocre y cobre. Solo pinta. */

// MARK_BARS = «las tres barras del símbolo»
const MARK_BARS = [
  { height: 9, color: '#29c50c' },
  { height: 14, color: '#d9a441' },
  { height: 19, color: '#b5763b' },
]

export default function BrandMark() {
  return (
    <span aria-hidden='true' className='flex h-5 items-end gap-[3px]'>
      {MARK_BARS.map(bar => (
        <span key={bar.height} className='w-[5px] rounded-[2px]' style={{ height: bar.height, background: bar.color }} />
      ))}
    </span>
  )
}
