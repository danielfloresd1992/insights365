import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ApiUser } from '@/ajax/user.ajax'

/*  LA SESIÓN: quién está viendo el portal
 *
 *  Guarda al usuario con sesión abierta y en qué punto está la sesión: sin comprobar todavía (al abrir la página),
 *  abierta o cerrada. La sesión de verdad vive en la cookie de la API; esto es lo que el portal sabe de ella.
 */

// SessionUser = «el usuario con sesión abierta», lo que el portal usa de él
export type SessionUser = {
  id: string
  name: string
  email: string | null
  admin: boolean
  // franchises = «las franquicias del dueño, si la API las da»; null mientras la API no ligue usuarios y franquicias
  franchises: string[] | null
}

// SessionStatus = «sin comprobar» al abrir la página, y luego «abierta» o «cerrada»
export type SessionStatus = 'unknown' | 'signedIn' | 'signedOut'

type SessionState = {
  status: SessionStatus
  user: SessionUser | null
}

const initialState: SessionState = {
  status: 'unknown',
  user: null,
}

// toSessionUser = «el usuario de la API, reducido a lo que el portal usa»
export function toSessionUser(apiUser: ApiUser): SessionUser {
  const fullName = [apiUser.name, apiUser.surName].filter(Boolean).join(' ').trim()
  return {
    id: apiUser._id,
    name: fullName || apiUser.email || 'Usuario',
    email: apiUser.email ?? null,
    admin: Boolean(apiUser.admin),
    franchises: Array.isArray(apiUser.franchises) ? apiUser.franchises.map(String) : null,
  }
}

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    // signedIn = «abrió sesión, o la API confirmó que la tenía»
    signedIn: (state, action: PayloadAction<SessionUser>) => {
      state.status = 'signedIn'
      state.user = action.payload
    },
    // signedOut = «cerró sesión, o la API dijo que no había»
    signedOut: (state) => {
      state.status = 'signedOut'
      state.user = null
    },
  },
})

export const { signedIn, signedOut } = sessionSlice.actions
