import type { ShiftKey, WeeklyReport } from '@/libs/weekly/weeklyMetrics.js'
import type { Summary } from './weekData'

/*  LA SEMANA CONTADA (propuesta A del lienzo del semanal, elegida por el usuario)
 *
 *  Del reporte de una semana, y de la semana con que se compara, saca lo que la portada del semanal dice en palabras:
 *  - el veredicto: más o menos movimiento, más o menos demoras;
 *  - la bajada: cuántas rotaciones y qué porcentajes se movieron;
 *  - los hallazgos («para mirar primero»): dónde se juntaron las demoras, qué empeoró o mejoró, qué días no tuvieron
 *    mesas y cuántas devoluciones hubo. Como mucho cuatro, del más grave al más leve.
 *  Módulo puro: no traduce. Devuelve claves de i18n (reports.story.*, reports.find.*) con sus valores ya escritos; un
 *  valor puede ser a su vez una frase (Phrase), que la vista traduce antes de meterla.
 */

export type Phrase = { key: string; params?: Record<string, string | number | Phrase> }

export type FindingTone = 'bad' | 'warn' | 'good' | 'neutral'
export type FindingIcon = 'kitchen' | 'hall' | 'calendar' | 'returns' | 'check'
export type Finding = {
  id: string
  tone: FindingTone
  icon: FindingIcon
  area: Phrase
  title: Phrase
  text: Phrase[]
  // anchor = «la sección de la página que lo explica»; link = «cómo se dice el enlace»
  anchor?: string
  link?: Phrase
}

// StoryFormat = «cómo se escriben las cifras y los días», en el idioma de la vista
export type StoryFormat = {
  count: (value: number) => string
  pct: (value: number | null) => string
  weekday: (index: number) => string
  list: (items: string[]) => string
}

export type Story = { verdict: Phrase | null; rotations: Phrase | null; moved: Phrase[]; findings: Finding[] }

// Los umbrales de lo que se cuenta como «se movió»
// MOVED_POINTS = «lo que tiene que moverse un porcentaje para nombrarlo en la bajada y en el veredicto»
const MOVED_POINTS = 0.3
// FINDING_POINTS = «lo que tiene que empeorar o mejorar un porcentaje para ser un hallazgo»
const FINDING_POINTS = 0.5
// SIMILAR_ROTATIONS = «menos de este cambio en las rotaciones es un movimiento parecido»
const SIMILAR_ROTATIONS = 0.05
// PEAK_SHARE, PEAK_MIN = «un turno que junta al menos esta parte de las demoras de preparación, y al menos tantas»
const PEAK_SHARE = 0.5
const PEAK_MIN = 3
// WEEKEND_SHARE = «si sábado y domingo suman esta parte de unas demoras, se dice así»
const WEEKEND_SHARE = 0.6
const MAX_FINDINGS = 4

type DelayId = 'pct1ra' | 'pctLimpieza' | 'pctPrep'
type DelayMetric = {
  id: DelayId
  now: number | null
  before: number | null
  count: number
  perDay: number[]
  area: 'hall' | 'kitchen'
  anchor: string
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

// delaysOf = «los porcentajes de demora que este local evalúa, con su cuenta y su reparto por día»
function delaysOf(report: WeeklyReport, before: Summary | null): DelayMetric[] {
  const shifts = report.meta.turnos
  const { aplica, cuadroGeneral: cuadro, metrica } = report
  const perDay = (pick: (index: number, shift: ShiftKey) => number) => report.porDia.map((_, index) => sum(shifts.map(shift => pick(index, shift))))
  const all: (DelayMetric & { applies: boolean })[] = [
    {
      id: 'pct1ra', applies: aplica.demora1ra, now: cuadro.porcentaje1ra.total, before: before?.pct1ra ?? null, count: cuadro.demora1ra.total,
      perDay: perDay((index, shift) => report.porDia[index][shift].demora1ra), area: 'hall', anchor: 'semanal-cuadro',
    },
    {
      id: 'pctLimpieza', applies: aplica.demoraLimpieza, now: cuadro.porcentajeLimpieza.total, before: before?.pctLimpieza ?? null, count: cuadro.demoraLimpieza.total,
      perDay: perDay((index, shift) => report.porDia[index][shift].demoraLimpieza), area: 'hall', anchor: 'semanal-cuadro',
    },
    {
      id: 'pctPrep', applies: aplica.metrica, now: metrica.porcentajeDemora, before: before?.pctPrep ?? null, count: metrica.demorasTotales,
      perDay: perDay((index, shift) => report.demorasPorDia[index][shift]), area: 'kitchen', anchor: 'semanal-plato',
    },
  ]
  return all.filter(metric => metric.applies)
}

// whereText = «dónde se juntaron unas demoras»: el fin de semana, o el día con más
function whereText(perDay: number[], format: StoryFormat): Phrase | null {
  const total = sum(perDay)
  if (total === 0) return null
  const weekend = (perDay[5] ?? 0) + (perDay[6] ?? 0)
  if (total >= PEAK_MIN && weekend / total >= WEEKEND_SHARE) return { key: 'reports.find.weekend', params: { count: weekend, total } }
  const peak = perDay.indexOf(Math.max(...perDay))
  return { key: 'reports.find.peakDay', params: { weekday: format.weekday(peak), count: perDay[peak] } }
}

export function storyOf(report: WeeklyReport, before: Summary | null, previousWeek: number | null, format: StoryFormat): Story {
  const shifts = report.meta.turnos
  const delays = delaysOf(report, before)
  const rotationsNow = report.cuadroGeneral.rotaciones.total

  /* El veredicto y la bajada: solo si hay con qué comparar */
  let verdict: Phrase | null = null
  let rotations: Phrase | null = null
  const moved: Phrase[] = []
  if (before && previousWeek !== null) {
    const change = (rotationsNow - before.rotaciones) / (before.rotaciones || 1)
    const movement = change > SIMILAR_ROTATIONS ? 'more' : change < -SIMILAR_ROTATIONS ? 'less' : 'same'
    const compared = delays.filter(metric => metric.now !== null && metric.before !== null)
    const score = compared.reduce((total, metric) => {
      const diff = (metric.now ?? 0) - (metric.before ?? 0)
      return total + (diff >= MOVED_POINTS ? 1 : diff <= -MOVED_POINTS ? -1 : 0)
    }, 0)
    const delaysWay = score > 0 ? 'worse' : score < 0 ? 'better' : 'same'
    verdict = { key: `reports.story.verdict.${movement}_${delaysWay}`, params: { week: previousWeek } }

    const diff = Math.abs(rotationsNow - before.rotaciones)
    rotations = movement === 'same' && diff === 0
      ? { key: 'reports.story.rotSame', params: { count: format.count(rotationsNow), week: previousWeek } }
      : { key: rotationsNow >= before.rotaciones ? 'reports.story.rotMore' : 'reports.story.rotLess', params: { count: format.count(rotationsNow), diff: format.count(diff) } }

    compared
      .map(metric => ({ metric, diff: Math.abs((metric.now ?? 0) - (metric.before ?? 0)) }))
      .filter(item => item.diff >= MOVED_POINTS)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 2)
      .forEach(({ metric }) => moved.push({
        key: 'reports.story.moved',
        params: { metric: { key: `reports.story.metricName.${metric.id}` }, from: format.pct(metric.before), to: format.pct(metric.now) },
      }))
  }

  /* Los hallazgos, del más grave al más leve */
  const findings: Finding[] = []

  // 1. Un turno que juntó la mayor parte de las demoras de preparación
  const prepTotal = report.metrica.demorasTotales
  if (report.aplica.metrica && prepTotal >= PEAK_MIN) {
    let peak = { index: -1, shift: shifts[0], count: 0 }
    report.demorasPorDia.forEach((day, index) => shifts.forEach(shift => {
      if (day[shift] > peak.count) peak = { index, shift, count: day[shift] }
    }))
    if (peak.count >= PEAK_MIN && peak.count / prepTotal >= PEAK_SHARE) {
      const dish = [...report.metrica.porPlato].sort((a, b) => b.total.demoras - a.total.demoras)[0]
      const rest = prepTotal - peak.count
      findings.push({
        id: 'prepPeak', tone: 'bad', icon: 'kitchen',
        area: { key: 'reports.find.area.kitchen' },
        title: { key: 'reports.find.prepPeak', params: { when: { key: `reports.find.when.${peak.shift}`, params: { weekday: format.weekday(peak.index) } }, count: peak.count, total: prepTotal } },
        text: [
          rest === 0 ? { key: 'reports.find.prepRestNone' } : { key: 'reports.find.prepRest', params: { count: rest } },
          ...(dish && dish.total.demoras > 0 ? [{ key: 'reports.find.prepDish', params: { dish: dish.dish, count: dish.total.demoras, total: prepTotal } }] : []),
        ],
        anchor: 'semanal-plato', link: { key: 'reports.find.link.dish' },
      })
    }
  }

  // 2. El porcentaje que más empeoró frente a la semana con que se compara (la preparación, si no salió ya arriba)
  if (previousWeek !== null) {
    const worse = delays
      .filter(metric => metric.now !== null && metric.before !== null && metric.now - metric.before >= FINDING_POINTS)
      .filter(metric => !(metric.id === 'pctPrep' && findings.some(finding => finding.id === 'prepPeak')))
      .sort((a, b) => ((b.now ?? 0) - (b.before ?? 0)) - ((a.now ?? 0) - (a.before ?? 0)))[0]
    if (worse) {
      const where = whereText(worse.perDay, format)
      findings.push({
        id: `worse-${worse.id}`, tone: 'bad', icon: worse.area === 'kitchen' ? 'kitchen' : 'hall',
        area: { key: `reports.find.area.${worse.area}` },
        title: { key: `reports.find.worse.${worse.id}`, params: { count: worse.count, now: format.pct(worse.now), before: format.pct(worse.before), week: previousWeek } },
        text: where ? [where] : [],
        anchor: worse.anchor, link: { key: worse.area === 'kitchen' ? 'reports.find.link.dish' : 'reports.find.link.table' },
      })
    }
  }

  // 3. Días cuyos turnos llegaron, pero sin una sola mesa
  const emptyDays = report.porDia
    .map((day, index) => ({ index, open: shifts.every(shift => day[shift].presente), rotations: sum(shifts.map(shift => day[shift].rotaciones)) }))
    .filter(day => day.open && day.rotations === 0)
  if (emptyDays.length > 0) {
    findings.push({
      id: 'emptyDays', tone: 'warn', icon: 'calendar',
      area: { key: 'reports.find.area.calendar' },
      title: { key: 'reports.find.emptyDays', params: { count: emptyDays.length, days: format.list(emptyDays.map(day => format.weekday(day.index))) } },
      text: [{ key: 'reports.find.emptyDaysText' }],
      anchor: 'semanal-dias', link: { key: 'reports.find.link.days' },
    })
  }

  // 4. Las devoluciones de la semana
  const returns = report.devoluciones.total.total
  if (report.aplica.devoluciones && returns > 0) {
    const top = report.devoluciones.porTipo.filter(row => row.visible).sort((a, b) => b.total - a.total)[0]
    findings.push({
      id: 'returns', tone: before && returns > before.devoluciones ? 'bad' : 'neutral', icon: 'returns',
      area: { key: 'reports.find.area.returns' },
      title: { key: 'reports.find.returns', params: { count: returns } },
      text: [
        ...(top ? [{ key: 'reports.find.returnsTop', params: { type: top.etiqueta, count: top.total } }] : []),
        ...(report.devoluciones.porcentaje !== null ? [{ key: 'reports.find.returnsPct', params: { pct: format.pct(report.devoluciones.porcentaje) } }] : []),
        ...(before && previousWeek !== null ? [{ key: 'reports.find.returnsBefore', params: { week: previousWeek, count: before.devoluciones } }] : []),
      ],
      anchor: 'semanal-devoluciones', link: { key: 'reports.find.link.returns' },
    })
  }

  // 5. Lo que más mejoró, para que también se vea
  if (previousWeek !== null) {
    const better = delays
      .filter(metric => metric.now !== null && metric.before !== null && metric.before - metric.now >= FINDING_POINTS)
      .sort((a, b) => ((b.before ?? 0) - (b.now ?? 0)) - ((a.before ?? 0) - (a.now ?? 0)))[0]
    if (better) {
      findings.push({
        id: `better-${better.id}`, tone: 'good', icon: 'check',
        area: { key: `reports.find.area.${better.area}` },
        title: { key: `reports.find.better.${better.id}`, params: { now: format.pct(better.now), before: format.pct(better.before), week: previousWeek } },
        text: [{ key: 'reports.find.betterText', params: { count: better.count } }],
        anchor: better.anchor, link: { key: better.area === 'kitchen' ? 'reports.find.link.dish' : 'reports.find.link.table' },
      })
    }
  }

  // Nada que destacar también se dice
  if (findings.length === 0) {
    findings.push({ id: 'calm', tone: 'good', icon: 'check', area: { key: 'reports.find.area.week' }, title: { key: 'reports.find.calm' }, text: [{ key: 'reports.find.calmText' }] })
  }

  return { verdict, rotations, moved, findings: findings.slice(0, MAX_FINDINGS) }
}
