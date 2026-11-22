import { useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { checkResetToken, resetPassword, type ResetCheck } from '@/ajax/user.ajax'
import { meetsAllRules } from './passwordRules'

/*  CREAR LA CONTRASEÑA NUEVA CON EL ENLACE DEL CORREO
 *
 *  Al abrir, le pregunta a la API si el enlace sigue valiendo, para no hacer escribir una contraseña en balde: si
 *  vale, enseña de qué cuenta es (el nombre y el correo tapado) y pide la contraseña dos veces; si caducó, se usó o
 *  no es de la API, lo dice y ofrece pedir otro. La contraseña tiene que cumplir las reglas (passwordRules) antes de
 *  enviarse; la API las vuelve a mirar y, si la rechaza, el enlace sigue sirviendo. Al cambiarla avisa con `onDone`.
 */

// ResetStatus = «en qué está la pantalla: comprobando el enlace, con el formulario, con un enlace que no vale, sin
// enlace en la dirección, o sin poder hablar con la API»
export type ResetStatus = 'checking' | 'ready' | 'invalid' | 'missing' | 'unreachable'

// ResetErrors = «los errores: los de un campo van bajo ese campo, el resto en un aviso»
export type ResetErrors = { password?: string; confirmation?: string; form?: string }

const statusOf = (error: unknown) => (isAxiosError(error) ? error.response?.status : undefined)

export function useResetPassword(token: string | null, onDone: () => void) {
  const [status, setStatus] = useState<ResetStatus>(token ? 'checking' : 'missing')
  const [account, setAccount] = useState<ResetCheck | null>(null)
  // checkFailure = «por qué no se pudo comprobar el enlace, cuando la culpa no es del enlace»
  const [checkFailure, setCheckFailure] = useState('')
  // checkRound = «cuántas veces se ha pedido comprobar el enlace; subirlo lo vuelve a comprobar»
  const [checkRound, setCheckRound] = useState(0)

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const togglePasswordVisible = () => setPasswordVisible(visible => !visible)
  const [errors, setErrors] = useState<ResetErrors>({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    checkResetToken(token)
      .then(found => {
        if (cancelled) return
        setAccount(found)
        setStatus('ready')
      })
      .catch(error => {
        if (cancelled) return
        const code = statusOf(error)
        if (code === 410 || code === 400) {
          setStatus('invalid')
          return
        }
        setCheckFailure(
          code === 429
            ? 'Hubo demasiados intentos desde esta conexión. Prueba de nuevo en 15 minutos.'
            : 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
        )
        setStatus('unreachable')
      })
    return () => {
      cancelled = true
    }
  }, [token, checkRound])

  // retryCheck = «vuelve a preguntar si el enlace vale, después de un fallo de conexión»
  const retryCheck = () => {
    setStatus('checking')
    setCheckRound(round => round + 1)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    const found: ResetErrors = {}
    if (!meetsAllRules(password)) found.password = 'Todavía no cumple todas las reglas de abajo.'
    if (!confirmation) found.confirmation = 'Repite la contraseña.'
    else if (confirmation !== password) found.confirmation = 'No coincide con la de arriba.'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setPending(true)
    try {
      await resetPassword(token, password)
      onDone()
    } catch (error) {
      const code = statusOf(error)
      if (code === 410) setStatus('invalid')
      else if (code === 400) setErrors({ password: 'Esa contraseña no cumple las reglas de seguridad. Revisa la lista de abajo.' })
      else if (code === 429) setErrors({ form: 'Hubo demasiados intentos desde esta conexión. Prueba de nuevo en 15 minutos.' })
      else setErrors({ form: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' })
    } finally {
      setPending(false)
    }
  }

  return {
    status,
    account,
    checkFailure,
    retryCheck,
    password,
    setPassword,
    confirmation,
    setConfirmation,
    passwordVisible,
    togglePasswordVisible,
    errors,
    pending,
    submit,
  }
}
