import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { login } from '@/libs/session.api'
import { useAppDispatch } from '@/store/hooks'
import { signedIn, toSessionUser } from '@/store/slices/session.slice'

/*  ENTRAR CON CORREO Y CONTRASEÑA
 *
 *  Lleva el formulario: lo escrito, si se está enviando y los errores, cada uno en su campo. Los errores de la API
 *  se traducen: 404 es que no hay cuenta con ese correo, 401 que la contraseña no es, 403 que la cuenta está
 *  deshabilitada; cualquier otro, que no se pudo hablar con el servidor. Al entrar guarda el usuario en el store y
 *  avisa con `onSignedIn`. También lleva si la contraseña se ve o va tapada.
 */

// LoginErrors = «los errores del formulario: los de un campo van bajo ese campo, el resto arriba del botón»
export type LoginErrors = { email?: string; password?: string; form?: string }

// EMAIL_SHAPE = «la forma mínima de un correo: algo, arroba, algo, punto, algo»
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useLogin(onSignedIn: () => void) {
  const dispatch = useAppDispatch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [pending, setPending] = useState(false)
  // passwordVisible = «si la contraseña se enseña en claro, porque la persona pulsó el ojo»
  const [passwordVisible, setPasswordVisible] = useState(false)
  const togglePasswordVisible = () => setPasswordVisible(visible => !visible)

  const validate = (): LoginErrors => {
    const found: LoginErrors = {}
    if (!email.trim()) found.email = 'Escribe tu correo.'
    else if (!EMAIL_SHAPE.test(email.trim())) found.email = 'Revisa el correo: le falta algo.'
    if (!password) found.password = 'Escribe tu contraseña.'
    return found
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setPending(true)
    try {
      const apiUser = await login(email.trim(), password)
      dispatch(signedIn(toSessionUser(apiUser)))
      onSignedIn()
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status === 404) setErrors({ email: 'No hay ninguna cuenta con ese correo.' })
      else if (status === 401) setErrors({ password: 'La contraseña no es correcta.' })
      else if (status === 403) setErrors({ form: 'Esta cuenta está deshabilitada. Habla con tu contacto de Jarvis365.' })
      else setErrors({ form: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' })
    } finally {
      setPending(false)
    }
  }

  return { email, setEmail, password, setPassword, errors, pending, submit, passwordVisible, togglePasswordVisible }
}
