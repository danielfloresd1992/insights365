import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './index'

/*  LOS HOOKS DE REDUX, YA TIPADOS
 *
 *  Usar estos en vez de useDispatch y useSelector a secas: conocen el estado y las acciones del store sin
 *  repetir los tipos en cada componente.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
