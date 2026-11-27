// niceMax = «un tope redondo para el eje»: 1, 2, 2,5, 5 o 10 por la potencia de diez que toque. Lo comparten la gráfica
// plana (BarChart) y la de 3D (Bars3D); va aparte porque un archivo de componentes solo exporta componentes
export function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find(candidate => candidate * power >= value) ?? 10
  return step * power
}
