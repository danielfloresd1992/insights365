/*  LAS REGLAS DE UNA CONTRASEÑA NUEVA
 *
 *  Las mismas que comprueba la API (validateSecurityPass en api_jarvis365): ocho caracteres o más, mayúsculas y
 *  minúsculas, un número, uno de sus caracteres especiales y ningún espacio. Aquí solo sirven para enseñarlas
 *  mientras se escribe; quien decide es la API, y si cambia allí hay que cambiarlas aquí.
 */

// SPECIAL_CHARACTERS = «los caracteres especiales que la API acepta, tal cual los lista»
export const SPECIAL_CHARACTERS = '- + _ ! @ # $ % ^ & * . , ?'

// PasswordRule = «una regla: qué se le enseña a la persona y si la contraseña la cumple»
export type PasswordRule = { id: string; label: string; test: (password: string) => boolean }

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: '8 caracteres o más', test: password => password.length > 7 },
  { id: 'cases', label: 'Mayúsculas y minúsculas', test: password => /[A-Z]/.test(password) && /[a-z]/.test(password) },
  { id: 'digit', label: 'Un número', test: password => /\d/.test(password) },
  { id: 'special', label: `Un carácter especial: ${SPECIAL_CHARACTERS}`, test: password => /[-+_!@#$%^&*.,?]/.test(password) },
  { id: 'spaces', label: 'Sin espacios', test: password => password.length > 0 && !password.includes(' ') },
]

// meetsAllRules = «si la contraseña cumple todas las reglas»
export const meetsAllRules = (password: string) => PASSWORD_RULES.every(rule => rule.test(password))
