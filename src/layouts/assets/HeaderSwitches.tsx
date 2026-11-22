import { useTranslation } from 'react-i18next'
import { MoonIcon, SunIcon } from '@/components/PortalIcons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { themeChanged, type Theme } from '@/store/slices/preferences.slice'
import { GROUP_LABEL, ICON_BUTTON, SEGMENT_TRACK, segmentButton } from './headerStyles'

/*  LOS SELECTORES DEL HEADER: el idioma y el tema
 *
 *  Dos opciones cada uno, en un carril; la elegida se marca (aria-pressed). Compactos en la barra, con su rótulo
 *  solo para lectores de pantalla; anchos (`wide`) en el menú del móvil, con su rótulo a la vista y el texto entero.
 *  El idioma lo cambia i18next (y lo recuerda); el tema, las preferencias del store.
 */

const LANGUAGE_OPTIONS = [
  { id: 'es', short: 'ES', long: 'Español' },
  { id: 'en', short: 'EN', long: 'English' },
] as const

export function LanguageSwitch({ wide = false }: { wide?: boolean }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  return (
    <fieldset className='m-0 min-w-0 border-0 p-0'>
      <legend className={wide ? GROUP_LABEL : 'sr-only'}>{t('portal.language')}</legend>
      <div className={SEGMENT_TRACK}>
        {LANGUAGE_OPTIONS.map(option => (
          <button
            key={option.id}
            type='button'
            lang={option.id}
            title={option.long}
            aria-pressed={current === option.id}
            onClick={() => void i18n.changeLanguage(option.id)}
            className={segmentButton(current === option.id, wide)}
          >
            {wide ? option.long : option.short}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function ThemeSwitch({ wide = false }: { wide?: boolean }) {
  const { t } = useTranslation()
  const theme = useAppSelector(state => state.preferences.theme)
  const dispatch = useAppDispatch()
  const options: { id: Theme; label: string; short: string; Icon: typeof SunIcon }[] = [
    { id: 'light', label: t('portal.light'), short: t('portal.lightShort'), Icon: SunIcon },
    { id: 'dark', label: t('portal.dark'), short: t('portal.darkShort'), Icon: MoonIcon },
  ]
  return (
    <fieldset className='m-0 min-w-0 border-0 p-0'>
      <legend className={wide ? GROUP_LABEL : 'sr-only'}>{t('portal.theme')}</legend>
      <div className={SEGMENT_TRACK}>
        {options.map(({ id, label, short, Icon }) => (
          <button
            key={id}
            type='button'
            title={label}
            aria-label={wide ? undefined : label}
            aria-pressed={theme === id}
            onClick={() => dispatch(themeChanged(id))}
            className={segmentButton(theme === id, wide)}
          >
            <Icon size={wide ? 16 : 18} />
            {wide && short}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

// ThemeToggle = «el botón del tema en la barra del móvil: un solo toque cambia de claro a oscuro y al revés»
export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useAppSelector(state => state.preferences.theme)
  const dispatch = useAppDispatch()
  const label = theme === 'dark' ? t('portal.toLight') : t('portal.toDark')
  return (
    <button type='button' aria-label={label} title={label} onClick={() => dispatch(themeChanged(theme === 'dark' ? 'light' : 'dark'))} className={ICON_BUTTON}>
      {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  )
}
