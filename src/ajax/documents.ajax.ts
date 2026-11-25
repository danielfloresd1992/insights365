import { isAxiosError } from 'axios'
import { http } from '@/libs/http'

/*  LOS INFORMES DIARIOS CONTRA LA API (api_jarvis365, colección `documents`)
 *
 *  El reporte semanal se arma con los informes diarios de un local: uno por turno y día. La API no tiene un endpoint
 *  de semana, así que se piden como hace reportes365 (lib/fetching/documents.js, getWeekByDays), turno a turno:
 *  - GET /document/isExists/data?establishmentName=&shift=&date=&type=complete-shift → { result: { _id } | null }
 *  - GET /document/:id?populate=pages → el informe con sus páginas
 *  Son hasta 28 peticiones por local y semana, de a POOL a la vez. Un turno que falla o no existe no tumba la semana:
 *  queda anotado en `detalle`, para que el reporte diga qué turnos le faltaron.
 */

// ShiftName = «el turno de un informe»: diurno, nocturno, o único cuando el local entrega uno al día
export type ShiftName = 'day' | 'night' | 'all'

// ShiftTrace = «qué pasó al pedir un turno»; el calendario del semanal lo usa para explicar lo que falta
export type ShiftTrace = { date: string; shift: ShiftName; estado: 'encontrado' | 'sin-documento' | 'sin-paginas' | 'error'; motivo: string | null }

export type WeekDocuments = { documents: unknown[]; detalle: ShiftTrace[] }

// POOL = «cuántas peticiones van a la vez»: más castiga a la API sin ganar nada (lo mismo que en reportes365)
const POOL = 6

const DOCUMENT_TYPE = 'complete-shift'

// findDocumentId = «el id del informe de ese local, día y turno, o null si no se entregó»
async function findDocumentId(establishmentName: string, date: string, shift: ShiftName, signal?: AbortSignal): Promise<string | null> {
  const response = await http.get<{ result: { _id: string } | null }>('/document/isExists/data', {
    params: { establishmentName, shift, date, type: DOCUMENT_TYPE },
    signal,
  })
  return response.data?.result?._id ?? null
}

// getWeekDocuments = «los informes de un local en esos días y turnos, con el rastro de cada petición»
export async function getWeekDocuments(establishmentName: string, dates: string[], shifts: ShiftName[], signal?: AbortSignal): Promise<WeekDocuments> {
  const pending = dates.flatMap(date => shifts.map(shift => ({ date, shift })))
  const documents: unknown[] = []
  const detalle: ShiftTrace[] = []

  const one = async ({ date, shift }: { date: string; shift: ShiftName }) => {
    try {
      const id = await findDocumentId(establishmentName, date, shift, signal)
      if (!id) {
        detalle.push({ date, shift, estado: 'sin-documento', motivo: null })
        return
      }
      const response = await http.get<unknown>(`/document/${id}`, { params: { populate: 'pages' }, signal })
      if (response.data) {
        documents.push(response.data)
        detalle.push({ date, shift, estado: 'encontrado', motivo: null })
      } else {
        detalle.push({ date, shift, estado: 'sin-paginas', motivo: null })
      }
    } catch (error) {
      // Una sesión cerrada o una petición cancelada no son «un turno que falta»: paran toda la carga
      if (signal?.aborted || (isAxiosError(error) && error.response?.status === 401)) throw error
      const status = isAxiosError(error) ? error.response?.status : undefined
      detalle.push({ date, shift, estado: 'error', motivo: status ? `HTTP ${status}` : 'sin conexión' })
    }
  }

  let next = 0
  const worker = async (): Promise<void> => {
    while (next < pending.length) await one(pending[next++])
  }
  await Promise.all(Array.from({ length: Math.min(POOL, pending.length) }, worker))
  return { documents, detalle }
}
