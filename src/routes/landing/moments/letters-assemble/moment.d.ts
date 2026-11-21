/*  Los tipos de moment.js (copiado tal cual de taste-skill): monta el momento en `root` y devuelve cómo soltarlo. */
declare function mount(root: HTMLElement, opts: Record<string, unknown>, lib: Record<string, unknown>): { destroy?: () => void } | undefined
export default mount
