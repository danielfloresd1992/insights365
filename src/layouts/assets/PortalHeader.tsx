import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useMatch } from 'react-router'
import { CloseIcon, MenuIcon, SignOutIcon, SpeakerIcon } from '@/components/PortalIcons'
import { useAppSelector } from '@/store/hooks'
import { useDismiss } from '../hook/useDismiss'
import { LanguageSwitch, ThemeSwitch, ThemeToggle } from './HeaderSwitches'
import { ICON_BUTTON, LIVE_DOT, OUTLINE_BUTTON } from './headerStyles'
import VoicePanel from './VoicePanel'

/*  LA BARRA DEL PORTAL (con sesión), fija arriba
 *
 *  Siempre a la vista: fija en lo alto, translúcida y con desenfoque, para que el contenido pase por debajo. La marca,
 *  las pestañas (Panel en vivo y Reporte semanal e intersemanal) y, a la derecha, el idioma, el tema, la voz de las
 *  alertas, quién está dentro y salir.
 *  En el móvil (por debajo de md) quedan la marca, el tema y un botón de menú que despliega lo demás.
 *  Mide 64 px en el móvil y 72 en escritorio: el marco del portal deja ese hueco arriba.
 *  Su contenido va con el mismo tope de ancho que la página de debajo: 1288 px, salvo en el panel en vivo, que usa
 *  toda la pantalla (livePanel.controller).
 *
 *  @param userName   el nombre de quien tiene la sesión
 *  @param onSignOut  qué hacer al pulsar «Cerrar sesión»
 *  @param signingOut si la salida está en curso
 */
type PortalHeaderProps = {
  userName: string
  onSignOut: () => void
  signingOut: boolean
}

// MARK_BARS = «las tres barras del símbolo»
const MARK_BARS = [
  { height: 9, color: '#29c50c' },
  { height: 14, color: '#d9a441' },
  { height: 19, color: '#b5763b' },
]

// initialsOf = «las iniciales del nombre, para el círculo del usuario»
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('')
}

const navClasses = ({ isActive }: { isActive: boolean }) =>
  `landing-link inline-flex h-full items-center whitespace-nowrap px-0.5 text-sm font-semibold ${
    isActive ? 'text-portal-ink shadow-[inset_0_-2px_0_#29c50c]' : 'text-portal-muted hover:text-portal-ink'
  }`

export default function PortalHeader({ userName, onSignOut, signingOut }: PortalHeaderProps) {
  const { t } = useTranslation()
  const voiceOn = useAppSelector(state => state.preferences.voice.on)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const voiceArea = useRef<HTMLDivElement>(null)
  const voiceButton = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeVoice = useCallback(() => setVoiceOpen(false), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useDismiss(voiceOpen, closeVoice, voiceArea, voiceButton)
  useDismiss(menuOpen, closeMenu, header, menuButton)

  // fullWidth = «estamos en el panel en vivo, que va a todo el ancho»
  const fullWidth = useMatch('/en-vivo') !== null
  const initials = initialsOf(userName)
  const voiceLabel = voiceOn ? t('voice.buttonOn') : t('voice.buttonOff')

  return (
    <>
    {/* El velo bajo el menú del móvil: fuera del header, para que pulsarlo cuente como «fuera» y cierre el menú */}
    {menuOpen && <div aria-hidden='true' className='fixed inset-x-0 bottom-0 top-16 z-30 bg-[rgba(28,25,19,0.45)] md:hidden' />}
    <header
      ref={header}
      className='fixed inset-x-0 top-0 z-40 h-16 border-b border-portal-line bg-portal-bar text-portal-ink backdrop-blur-[14px] backdrop-saturate-[1.4] transition-colors md:h-[72px]'
    >
      <div className={`mx-auto flex h-full w-full ${fullWidth ? '' : 'max-w-[1288px]'} items-center gap-1 pl-4 pr-2.5 md:gap-7 md:px-6`}>
        <a
          href='#contenido'
          className='sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-3 focus:z-50 focus:rounded-full focus:bg-portal-ink focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-portal-page'
        >
          {t('portal.skipToContent')}
        </a>
        <Link to='/' className='landing-link flex h-11 items-center gap-2.5 text-[1.05rem] font-semibold tracking-[-0.02em] text-portal-ink'>
          <span aria-hidden='true' className='flex h-5 items-end gap-[3px]'>
            {MARK_BARS.map(bar => (
              <span key={bar.height} className='w-[5px] rounded-[2px]' style={{ height: bar.height, background: bar.color }} />
            ))}
          </span>
          insights365
        </Link>
        <nav aria-label={t('portal.navLabel')} className='hidden gap-7 self-stretch md:flex'>
          <NavLink to='/en-vivo' className={navClasses}>
            {t('portal.livePanel')}
          </NavLink>
          {/* Los nombres enteros no caben junto a los controles: el del semanal sale entero desde 2xl (1536 px) y el de
              por turno desde xl (1280 px); antes, «Semanal» y «Por turno» */}
          <NavLink to='/reportes-turno' className={navClasses}>
            <span className='xl:hidden'>{t('portal.shiftReportsShort')}</span>
            <span className='hidden xl:inline'>{t('portal.shiftReports')}</span>
          </NavLink>
          <NavLink to='/reportes' className={navClasses}>
            <span className='2xl:hidden'>{t('portal.weeklyReportShort')}</span>
            <span className='hidden 2xl:inline'>{t('portal.weeklyReport')}</span>
          </NavLink>
        </nav>

        {/* Escritorio: todo a la vista */}
        <div className='ml-auto hidden items-center gap-2.5 md:flex'>
          <LanguageSwitch />
          <ThemeSwitch />
          <div ref={voiceArea} className='relative'>
            <button
              ref={voiceButton}
              type='button'
              aria-expanded={voiceOpen}
              aria-controls='panel-voz'
              aria-label={voiceLabel}
              title={voiceLabel}
              onClick={() => setVoiceOpen(open => !open)}
              className={`${ICON_BUTTON} h-12 w-12 ring-1 ring-inset ring-portal-ring ${voiceOpen ? 'bg-portal-ctl' : ''}`}
            >
              <SpeakerIcon size={20} />
              {voiceOn && <span aria-hidden='true' className={`absolute right-[9px] top-[9px] ${LIVE_DOT} ring-2 ring-portal-surface`} />}
            </button>
            {voiceOpen && (
              <section
                id='panel-voz'
                aria-labelledby='panel-voz-titulo'
                className='absolute right-0 top-[60px] z-50 flex w-[380px] flex-col gap-4 rounded-2xl bg-portal-surface p-4 text-portal-ink shadow-[0_24px_48px_-20px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-portal-line'
              >
                <div>
                  <h2 id='panel-voz-titulo' className='m-0 text-[15px] font-semibold'>
                    {t('voice.title')}
                  </h2>
                  <p className='m-0 mt-1 text-[13px] leading-snug text-portal-muted'>{t('voice.intro')}</p>
                </div>
                <VoicePanel idPrefix='barra' />
              </section>
            )}
          </div>
          <span aria-hidden='true' className='mx-1.5 hidden h-7 w-px bg-portal-line lg:block' />
          <span className='hidden items-center gap-2.5 lg:flex'>
            <span aria-hidden='true' className='grid h-9 w-9 place-items-center rounded-full bg-portal-avatar text-[13px] font-semibold ring-1 ring-inset ring-portal-ring'>
              {initials}
            </span>
            <span className='whitespace-nowrap text-sm text-portal-muted'>{userName}</span>
          </span>
          <button type='button' onClick={onSignOut} disabled={signingOut} className={OUTLINE_BUTTON}>
            {signingOut ? t('portal.signingOut') : t('portal.signOut')}
            <SignOutIcon size={16} />
          </button>
        </div>

        {/* Móvil: el tema a mano y lo demás en el menú */}
        <div className='ml-auto flex items-center gap-1 md:hidden'>
          <ThemeToggle />
          <button
            ref={menuButton}
            type='button'
            aria-expanded={menuOpen}
            aria-controls='menu-movil'
            aria-label={menuOpen ? t('portal.closeMenu') : t('portal.openMenu')}
            onClick={() => setMenuOpen(open => !open)}
            className={`${ICON_BUTTON} ${menuOpen ? 'bg-portal-ctl' : ''}`}
          >
            {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            {voiceOn && !menuOpen && <span aria-hidden='true' className={`absolute right-2 top-2 ${LIVE_DOT} ring-2 ring-portal-page`} />}
          </button>
        </div>
      </div>

      {menuOpen && (
          <div
            id='menu-movil'
            className='absolute inset-x-0 top-full flex max-h-[calc(100dvh-4rem)] flex-col gap-[18px] overflow-y-auto border-b border-portal-line bg-portal-surface px-4 pb-5 pt-3 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.4)] md:hidden'
          >
            <nav aria-label={t('portal.navLabel')} className='flex flex-col gap-2'>
              <NavLink
                to='/en-vivo'
                onClick={closeMenu}
                className='flex h-[52px] items-center justify-between rounded-xl bg-portal-ctl px-4 text-base font-semibold text-portal-ink'
              >
                {t('portal.livePanel')}
                <span aria-hidden='true' className={LIVE_DOT} />
              </NavLink>
              <NavLink
                to='/reportes-turno'
                onClick={closeMenu}
                className='flex h-[52px] items-center rounded-xl bg-portal-ctl px-4 text-base font-semibold text-portal-ink'
              >
                {t('portal.shiftReports')}
              </NavLink>
              <NavLink
                to='/reportes'
                onClick={closeMenu}
                className='flex h-[52px] items-center rounded-xl bg-portal-ctl px-4 text-base font-semibold text-portal-ink'
              >
                {t('portal.weeklyReport')}
              </NavLink>
            </nav>
            <LanguageSwitch wide />
            <ThemeSwitch wide />
            <section aria-labelledby='voz-movil-titulo' className='flex flex-col gap-2.5'>
              <h2 id='voz-movil-titulo' className='m-0 text-xs font-semibold uppercase tracking-[0.08em] text-portal-muted'>
                {t('voice.title')}
              </h2>
              <VoicePanel idPrefix='movil' compact />
            </section>
            <div className='flex flex-col gap-3 border-t border-portal-line pt-4'>
              <span className='flex items-center gap-2.5'>
                <span aria-hidden='true' className='grid h-9 w-9 place-items-center rounded-full bg-portal-avatar text-[13px] font-semibold ring-1 ring-inset ring-portal-ring'>
                  {initials}
                </span>
                <span className='text-[15px] font-semibold'>{userName}</span>
              </span>
              <button type='button' onClick={onSignOut} disabled={signingOut} className={OUTLINE_BUTTON}>
                {signingOut ? t('portal.signingOut') : t('portal.signOut')}
                <SignOutIcon size={16} />
              </button>
            </div>
          </div>
      )}
    </header>
    </>
  )
}
