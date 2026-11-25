// TONE = «el color de texto y de fondo de un cambio»: mejor en azul, peor en naranja, igual en neutro (validados para
// daltonismo sobre los dos fondos del portal). Aparte de parts.tsx: un archivo de componentes solo exporta componentes
export const TONE = {
  better: { text: 'text-[#2f63b8] dark:text-[#a9cdf5]', pill: 'bg-[#2f63b8]/12 text-[#2f63b8] dark:bg-[#5b8fe0]/18 dark:text-[#a9cdf5]' },
  worse: { text: 'text-[#b04a22] dark:text-[#f4a98c]', pill: 'bg-[#c4532a]/12 text-[#b04a22] dark:bg-[#e0703f]/18 dark:text-[#f4a98c]' },
  same: { text: 'text-portal-muted', pill: 'bg-portal-soft text-portal-ink' },
}
