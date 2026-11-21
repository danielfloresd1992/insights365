import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/*  LA RAÍZ, CON LAS MAYÚSCULAS DEL DISCO
 *
 *  Windows no distingue mayúsculas en las rutas, pero el optimizador de dependencias de Vite (Rolldown) sí. Si el
 *  servidor arranca desde una terminal que escribe la carpeta de otra forma («c:\…» en la de VS Code, o «desktop»
 *  a mano), unos módulos entran con esa ruta y otros con la real, y el mismo archivo cuenta como dos: React Router
 *  sale con su propia copia de React y la app cae con «Cannot read properties of null (reading 'useContext')».
 *  Por eso la raíz no se toma de la terminal sino del disco.
 */

// PROJECT_ROOT = «la carpeta del proyecto, escrita como la guarda el disco»
const PROJECT_ROOT = fs.realpathSync.native(import.meta.dirname)

// https://vite.dev/config/
// Tailwind v4 entra como plugin de Vite (sin tailwind.config ni postcss), y '@' apunta a src/, como en los
// proyectos hermanos (Jarvis-express365, Client365).
export default defineConfig({
  root: PROJECT_ROOT,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(PROJECT_ROOT, 'src'),
    },
  },
})
