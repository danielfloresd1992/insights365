import { useEffect, useRef } from 'react'
import { REPORT_SHEETS, SHEET_FONTS, SHEET_HEIGHT, SHEET_WIDTH } from '../coverReport/reportSheets'

/*  UNA HOJA DEL INFORME, DIBUJADA EN UN LIENZO
 *
 *  La misma hoja que la portada C pone en su abanico (reportSheets), pero en plano: un <canvas> que se ve como la
 *  página del PDF. Se dibuja ya y otra vez cuando llega su letra. Solo pinta.
 *
 *  @param sheetName  el nombre de la hoja en REPORT_SHEETS («Tabla de métrica», «Demoras por día»…)
 *  @param label      lo que dice la hoja, para quien no la ve
 */
type SheetCanvasProps = {
  sheetName: string
  label: string
}

// SCALE = «a cuántos píxeles por píxel de hoja se dibuja, para que se lea nítida en pantallas densas»
const SCALE = 1.5

export default function SheetCanvas({ sheetName, label }: SheetCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const sheet = REPORT_SHEETS.find(entry => entry.name === sheetName)
    if (!canvas || !sheet) return
    let cancelled = false
    const paint = () => {
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(SCALE, 0, 0, SCALE, 0, 0)
      sheet.draw(context)
    }
    paint()
    void Promise.all(SHEET_FONTS.map(sheetFont => document.fonts.load(sheetFont))).then(() => {
      if (!cancelled) paint()
    })
    return () => {
      cancelled = true
    }
  }, [sheetName])

  return <canvas ref={canvasRef} width={SHEET_WIDTH * SCALE} height={SHEET_HEIGHT * SCALE} role='img' aria-label={label} />
}
