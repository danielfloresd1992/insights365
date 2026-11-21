import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { LOGIN_PATH } from '../landing.content'

/*  EL PIE DE LA PORTADA DE '/' (pedido del usuario: «parecido» al de Client365, src/components/Footer/Footer.jsx)
 *
 *      AMAZONAS 365           PLATAFORMAS       EMPRESA                      CONTACTO
 *      Gestión y gerencia…    insights365       Supervisión operativa        (WhatsApp) +1 303-875-7299
 *                             Jarvis365         Asistencia gerencial         SÍGUENOS
 *                             Reportes365       Reportes estratégicos        [f] [ig] [in] [x]
 *                             JarvisExpress     Detección de oportunidades
 *      ─────────────────────────────────────────────────────────────────────────────────────────────
 *      © Amazonas365. Todos los derechos reservados.                Tu herramienta los 365 días del año
 *
 *  Sobre el mismo verde suave en diagonal que el de Client365. El logo y los iconos de las redes son los de Client365
 *  (public/brand). Las letras van en las tintas de la casa, que pasan 4,5:1 sobre ese verde; al pasar, en el verde de
 *  texto. Solo pinta.
 */

// FOOTER_BACKGROUND / FOOTER_RULE = «el verde suave del pie y el de sus rayas», los de Client365
const FOOTER_BACKGROUND: CSSProperties = { backgroundImage: 'linear-gradient(to bottom right, #eef6e4, #e3efd2, #d9e8c0)' }
const FOOTER_RULE = '#c8dbae'

// LINK = «el aspecto de un enlace del pie»: tinta suave, verde al pasar; 32 px de alto para que se pueda tocar
const LINK = 'inline-flex min-h-8 items-center text-sm text-[#564e40] transition-colors hover:text-[#177406]'

// PLATFORMS = «las plataformas de Amazonas365»: insights365 es esta (entra por el acceso); Jarvis365 va sin enlace hasta
// saber su dirección pública (en Client365 era '/auth', relativo a su propio dominio)
const PLATFORMS: { label: string; to?: string; href?: string }[] = [
  { label: 'insights365', to: LOGIN_PATH },
  { label: 'Jarvis365' },
  { label: 'Reportes365', href: 'https://jarvis365reporte.netlify.app/' },
  { label: 'JarvisExpress', href: 'https://jarvis-express.netlify.app/' },
]

// SERVICES = «lo que hace la empresa»
const SERVICES = ['Supervisión operativa', 'Asistencia gerencial', 'Reportes estratégicos', 'Detección de oportunidades']

// WHATSAPP = «el contacto», el mismo enlace de Client365
const WHATSAPP = {
  label: '+1 303-875-7299',
  href: 'https://api.whatsapp.com/send?phone=13038757299&text=%C2%A1Hello!%20I%20want%20more%20info%20about%20%40amazonas365_%20',
}

// SOCIALS = «las redes de Amazonas365», con sus iconos de Client365
const SOCIALS = [
  { name: 'Facebook', icon: '/brand/social/facebook.png', href: 'https://www.facebook.com/p/365amazonas-100083619180267/?_rdr' },
  { name: 'Instagram', icon: '/brand/social/instagram.png', href: 'https://www.instagram.com/amazonas365_/' },
  { name: 'LinkedIn', icon: '/brand/social/linkedin.png', href: 'https://www.linkedin.com/company/amazonas365/?originalSubdomain=es' },
  { name: 'X', icon: '/brand/social/x.png', href: 'https://x.com/amazonas365?lang=es' },
]

// CURRENT_YEAR = «el año del copyright», al cargar la página (fuera del render: leer la hora ahí no es puro)
const CURRENT_YEAR = new Date().getFullYear()

// COLUMN_TITLE = «el título de una columna»
const COLUMN_TITLE = 'text-sm font-bold uppercase tracking-[0.08em] text-[#2f2a1e]'

// WhatsAppIcon = «el icono de WhatsApp», en el color del texto
const WhatsAppIcon = () => (
  <svg className='h-4 w-4 shrink-0' fill='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
  </svg>
)

export default function SiteFooter() {
  return (
    <footer className='w-full border-t text-[#2f2a1e]' style={{ ...FOOTER_BACKGROUND, borderColor: FOOTER_RULE }}>
      <div className='mx-auto w-full max-w-[1288px] px-6 py-12 sm:py-14'>
        <div className='grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4'>

          <div className='space-y-4 sm:col-span-2 lg:col-span-1'>
            <img
              src='/brand/amazonas365-logo.png'
              alt='Amazonas365'
              width={180}
              height={81}
              loading='lazy'
              decoding='async'
              className='h-auto w-full max-w-[180px] object-contain'
            />
            <p className='max-w-[19rem] text-sm leading-relaxed text-[#564e40]'>
              Gestión y gerencia remota 24/7 los 365 días del año. Tu herramienta para controlar y asegurar la operación
              diaria de tu negocio.
            </p>
          </div>

          <nav aria-label='Plataformas'>
            <h2 className={COLUMN_TITLE}>Plataformas</h2>
            <ul className='mt-3 grid gap-0.5'>
              {PLATFORMS.map(platform => (
                <li key={platform.label}>
                  {platform.to ? (
                    <Link to={platform.to} className={LINK}>{platform.label}</Link>
                  ) : platform.href ? (
                    <a href={platform.href} target='_blank' rel='noreferrer' className={LINK}>{platform.label}</a>
                  ) : (
                    <span className='inline-flex min-h-8 items-center text-sm text-[#564e40]'>{platform.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={COLUMN_TITLE}>Empresa</h2>
            <ul className='mt-3 grid gap-0.5'>
              {SERVICES.map(service => (
                <li key={service} className='flex min-h-8 items-center text-sm text-[#564e40]'>{service}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={COLUMN_TITLE}>Contacto</h2>
            <a href={WHATSAPP.href} target='_blank' rel='noreferrer' className={`${LINK} mt-3 gap-2`} aria-label={`Escribir por WhatsApp al ${WHATSAPP.label}`}>
              <WhatsAppIcon />
              {WHATSAPP.label}
            </a>

            <p className='mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#2f2a1e]'>Síguenos</p>
            <ul className='mt-2 flex items-center gap-2.5'>
              {SOCIALS.map(social => (
                <li key={social.name}>
                  <a
                    href={social.href}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={`Amazonas365 en ${social.name}`}
                    className='group grid h-10 w-10 place-items-center rounded-lg border bg-white/70 transition-colors hover:border-[#1c8c08] hover:bg-[#1c8c08]'
                    style={{ borderColor: FOOTER_RULE }}
                  >
                    <img
                      src={social.icon}
                      alt=''
                      width={20}
                      height={20}
                      loading='lazy'
                      className='h-5 w-5 transition-[filter] group-hover:brightness-0 group-hover:invert'
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className='mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row' style={{ borderColor: `${FOOTER_RULE}99` }}>
          <p className='text-center text-xs text-[#564e40] sm:text-left'>
            © {CURRENT_YEAR} Amazonas365. Todos los derechos reservados.
          </p>
          <p className='text-xs text-[#564e40]'>Tu herramienta los 365 días del año</p>
        </div>
      </div>
    </footer>
  )
}
