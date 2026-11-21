import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router/dom'
import { store } from '@/store'
import { router } from '@/app/router'
import './index.css'

/*  EL ARRANQUE: el estado global (Redux) por fuera y las rutas por dentro, para que toda página lea el store */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
