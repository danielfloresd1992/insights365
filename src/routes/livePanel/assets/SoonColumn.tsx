import { useTranslation } from 'react-i18next'
import { createReportScene } from '@/routes/landing/assets/coverReport/reportScene'
import { createWeekScene } from '@/routes/landing/assets/coverWeek/weekScene'
import { useAppSelector } from '@/store/hooks'
import SoonPreview from './SoonPreview'
import { createTablesSceneDark, createTablesSceneLight } from './tablesScene'

/*  LO QUE VIENE AL PANEL: tres adelantos «Próximamente», uno debajo de otro. Se carga aparte (lazy): trae three.js.
 *
 *  Cada uno ocupa un tercio del alto de la columna, con una escena de muestra de la portada:
 *  - el visor de mesas: la sala en 2.5D con alertas sobre las mesas (tablesScene, que sigue el tema del portal);
 *  - las tendencias de la semana: las barras de la semana en relieve (coverWeek);
 *  - los informes del turno: las hojas del informe semanal en abanico (coverReport).
 *
 *  @param className  el sitio que le deja el panel (alto y posición fija)
 */
export default function SoonColumn({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  const theme = useAppSelector(state => state.preferences.theme)
  const common = { badge: t('soon.badge'), sample: t('soon.sample') }

  return (
    <div className={`grid grid-rows-3 gap-4 ${className}`}>
      <SoonPreview {...common} createScene={theme === 'dark' ? createTablesSceneDark : createTablesSceneLight} title={t('soon.tablesTitle')} text={t('soon.tablesText')} />
      <SoonPreview {...common} createScene={createWeekScene} title={t('soon.weekTitle')} text={t('soon.weekText')} />
      <SoonPreview {...common} createScene={createReportScene} title={t('soon.reportsTitle')} text={t('soon.reportsText')} />
    </div>
  )
}
