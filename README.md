# insights365

El portal web del **cliente**: la analítica de todos sus restaurantes en un solo sitio. El servicio en mesa, la
cocina, las novedades, la disponibilidad de las cámaras, y cómo evoluciona todo día a día.

Es el cuarto frontend del sistema Jarvis365, junto a sus hermanos de la misma carpeta:

| Proyecto | Para quién |
|---|---|
| **Jarvis-express365** | el operador de monitoreo: reporta las novedades y lleva Mesas |
| **Client365** | la gerencia: configura, supervisa y liquida |
| **reportes365** | los informes diario, de franquicia y semanal |
| **insights365** | el cliente: ve y compara sus restaurantes |

Todos leen la misma API, **api_jarvis365**.

## Stack

- **Vite 8** + **React 19** + **TypeScript 7**
- **Tailwind CSS 4**, como plugin de Vite: se configura en `src/index.css` (`@theme`), sin `tailwind.config`
- **Redux Toolkit** + **react-redux** para el estado global (`src/store`)
- **React Router 8**, en modo datos (`createBrowserRouter`, en `src/app/router.tsx`)
- **axios**, con una sola instancia en `src/libs/http.ts`
- **Oxlint** de linter

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # comprueba los tipos (tsc -b) y compila a dist/
npm run lint      # oxlint
npm run preview   # sirve lo compilado
```

Antes de arrancar, copia `.env.example` a `.env` y pon la dirección de la API en `VITE_API_URL`.

## Estructura

```
src/
├── main.tsx          el arranque: Provider de Redux y RouterProvider
├── index.css         Tailwind y los colores del portal (@theme)
├── env.d.ts          los tipos de las variables VITE_
├── app/router.tsx    las rutas
├── layouts/          el marco de las páginas
├── routes/           una carpeta por pantalla:
│   └── home/           home.controller.tsx  →  hook/ (la lógica)  +  assets/ (lo que se ve)
├── store/            Redux Toolkit: index.ts, hooks.ts y slices/
└── libs/             lo que no es interfaz: http.ts y, después, las peticiones a la API
```

El alias `@` apunta a `src/`.

## Convenciones

Son las mismas de los proyectos hermanos:

- **Cada pantalla empieza en un `<nombre>.controller.tsx`.** Llama a los hooks y reparte lo que devuelven; la lógica va en `hook/` y cada pieza visible en `assets/`, que solo pinta.
- **Identificadores en inglés, comentarios en español** («`name = «lo que significa»`»).
- **Sin nombres de una sola letra**, tampoco en los callbacks.
- **Commits en español.**
