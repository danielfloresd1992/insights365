import { useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { requestPasswordReset } from '@/ajax/user.ajax'
import { emailProblem } from './emailShape'

/*  PEDIR EL ENLACE PARA CREAR UNA CONTRASEÑA NUEVA
 *
 *  Lleva el formulario del correo y lo que pasa después. La API contesta lo mismo exista la cuenta o no, así que al
 *  enviar no se sabe si llegará algo: se pasa a «revisa tu correo» con la dirección escrita. Desde ahí se puede pedir
 *  otro enlace cuando pase la espera (la API no manda dos a la misma cuenta en menos de un minuto) o volver a escribir
 *  el correo. Los errores se traducen: 400 es el correo mal escrito, 429 demasiados pedidos desde esta conexión, 503
 *  que la API aún no tiene el correo configurado; cualquier otro, que no se pudo hablar con el servidor.
 */

// ForgotErrors = «los errores: el del correo va bajo el campo, el resto en un aviso»
export type ForgotErrors = { email?: string; form?: string }

// RESEND_WAIT_SECONDS = «cuánto hay que esperar para pedir otro enlace: lo mismo que espera la API»
const RESEND_WAIT_SECONDS = 60

// DEFAULT_MINUTES = «lo que dura un enlace si la API no lo dice»
const DEFAULT_MINUTES = 30

export function useForgotPassword(initialEmail: string) {
  const [email, setEmail] = useState(initialEmail)
  const [errors, setErrors] = useState<ForgotErrors>({})
  const [pending, setPending] = useState(false)
  // sentTo = «a qué correo se pidió el último enlace; mientras haya uno, la pantalla dice «revisa tu correo»»
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES)
  // resendIn = «segundos que faltan para poder pedir otro enlace»
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const tick = window.setTimeout(() => setResendIn(seconds => seconds - 1), 1000)
    return () => window.clearTimeout(tick)
  }, [resendIn])

  const send = async (address: string) => {
    setPending(true)
    setErrors({})
    try {
      const answer = await requestPasswordReset(address)
      setSentTo(address)
      setMinutes(answer?.minutes || DEFAULT_MINUTES)
      setResendIn(RESEND_WAIT_SECONDS)
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status === 400) setErrors({ email: 'Revisa el correo: le falta algo.' })
      else if (status === 429) setErrors({ form: 'Se pidieron demasiados enlaces desde esta conexión. Prueba de nuevo en 15 minutos.' })
      else if (status === 503) setErrors({ form: 'El cambio de contraseña por correo todavía no está activo. Habla con tu contacto de Jarvis365.' })
      else setErrors({ form: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' })
    } finally {
      setPending(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const problem = emailProblem(email)
    if (problem) {
      setErrors({ email: problem })
      return
    }
    void send(email.trim())
  }

  // resend = «pide otro enlace al mismo correo, si ya pasó la espera»
  const resend = () => {
    if (sentTo && resendIn <= 0 && !pending) void send(sentTo)
  }

  // changeEmail = «vuelve al formulario para escribir otro correo»
  const changeEmail = () => {
    setSentTo(null)
    setErrors({})
  }

  return { email, setEmail, errors, pending, sentTo, minutes, resendIn, submit, resend, changeEmail }
}
