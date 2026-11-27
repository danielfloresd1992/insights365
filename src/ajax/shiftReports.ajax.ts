import { http } from '@/libs/http'
import type { ShiftName } from './documents.ajax'

/*  LOS INFORMES POR TURNO CONTRA LA API (api_jarvis365, colección `documents`)
 *
 *  Los informes diarios que arma el equipo de monitoreo en reportes365: uno por local, día y turno.
 *  - GET /insights/documents?establishment=<id>&from=AAAA-MM-DD&to=AAAA-MM-DD → la lista de esos días, sin páginas
 *    (hasta 93 días). La API solo deja ver los de un local de quien entra (403 si no).
 *  - GET /document/:id?populate=pages → un informe con sus páginas, para pintarlo.
 */

// ShiftDocumentSummary = «un informe de la lista»: su día, su turno y cuántas páginas tiene
export type ShiftDocumentSummary = { _id: string; date: string; shift: ShiftName; pages: number; createdAt: string | null }

// ReportPage = «una página del informe»: su tipo dice qué es y `data` lo que guarda (ver routes/shiftReports/reportPages)
export type ReportPage = { _id: string; type: string; data: unknown }

// ShiftDocument = «un informe entero», con sus páginas en el orden en que se guardaron
export type ShiftDocument = {
  _id: string
  date: string
  shift: ShiftName
  establishmentName: string | null
  establishmentId: string | null
  pages: ReportPage[]
}

// getShiftDocuments = «los informes de un local entre esas fechas», del más nuevo al más viejo
export async function getShiftDocuments(establishmentId: string, from: string, to: string, signal?: AbortSignal): Promise<ShiftDocumentSummary[]> {
  const response = await http.get<{ documents?: ShiftDocumentSummary[] }>('/insights/documents', { params: { establishment: establishmentId, from, to }, signal })
  return Array.isArray(response.data?.documents) ? response.data.documents : []
}

// getShiftDocument = «un informe con sus páginas»; las que no llegaron pobladas (un id suelto) se quitan
export async function getShiftDocument(id: string, signal?: AbortSignal): Promise<ShiftDocument> {
  const response = await http.get<Record<string, unknown>>(`/document/${id}`, { params: { populate: 'pages' }, signal })
  const raw = response.data ?? {}
  const pages = Array.isArray(raw.pages) ? raw.pages : []
  return {
    _id: String(raw._id ?? id),
    date: String(raw.date ?? ''),
    shift: (raw.shift as ShiftName) ?? 'all',
    establishmentName: typeof raw.establishmentName === 'string' ? raw.establishmentName : null,
    establishmentId: raw.establishmentId ? String(raw.establishmentId) : null,
    pages: pages
      .filter((page): page is Record<string, unknown> => Boolean(page) && typeof page === 'object')
      .map(page => ({ _id: String(page._id ?? ''), type: String(page.type ?? ''), data: page.data ?? null })),
  }
}
