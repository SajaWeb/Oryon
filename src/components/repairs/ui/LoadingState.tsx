import { Loading } from '../../oryon'

/* Se conserva el nombre porque la vista y el README ya lo referencian, pero por
   dentro ya no dibuja su propio círculo: usa el loader único del sistema. */
export function LoadingState() {
  return <Loading mode="screen" label="Cargando órdenes de trabajo" />
}
