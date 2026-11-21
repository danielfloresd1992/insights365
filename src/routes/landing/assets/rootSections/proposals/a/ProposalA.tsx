import ReportBento from './ReportBento'
import SheetsFan from './SheetsFan'
import LiveWall from './LiveWall'

/*  PROPUESTA A · LA SEMANA EN CIFRAS
 *
 *  Lo que sigue a las tarjetas, contado con los datos: primero el informe semanal en un mosaico de gráficas y tablas
 *  con las cifras reales de la semana de ejemplo (y, arriba, cómo llega cada cifra); luego las hojas del PDF que se
 *  abren en abanico mientras se hace scroll, y al final el muro de alertas en marcha. Solo pinta.
 */
export default function ProposalA() {
  return (
    <>
      <ReportBento />
      <SheetsFan />
      <LiveWall />
    </>
  )
}
