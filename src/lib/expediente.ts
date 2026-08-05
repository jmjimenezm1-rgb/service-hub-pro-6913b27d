/**
 * Nomenclatura de expedientes documentales.
 *
 * Formato: EXP{aaaa}{0001}_{nombre}_{aaaammdd}_v{NN}
 *  - EXPaaaa0001 → código de expediente (secuencial reiniciado cada año)
 *  - aaaammdd    → fecha de generación de la versión
 *  - vNN         → número de versión (v01, v02 …)
 *
 * Los adjuntos se nombran: EXPaaaa0001_{nombre original}
 */

export const EXP_RE = /^(EXP(\d{4})(\d{4}))_(.+?)_(\d{8})_v(\d{2})$/;

export function yyyymmdd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export interface ParsedName {
  codigo: string;
  ejercicio: number;
  secuencial: number;
  base: string;
  fecha: string;
  version: number;
}

export function parseDocName(nombre: string): ParsedName | null {
  const m = EXP_RE.exec(nombre.trim());
  if (!m) return null;
  return {
    codigo: m[1]!,
    ejercicio: Number(m[2]),
    secuencial: Number(m[3]),
    base: m[4]!,
    fecha: m[5]!,
    version: Number(m[6]),
  };
}

/** Extrae el código de expediente de un nombre ya formateado o de un adjunto. */
export function codigoDe(nombre: string): string | null {
  const parsed = parseDocName(nombre);
  if (parsed) return parsed.codigo;
  const m = /^(EXP\d{8})_/.exec(nombre.trim());
  return m ? m[1]! : null;
}

/** Devuelve el nombre "limpio", sin prefijo de expediente ni sufijos. */
export function baseDe(nombre: string): string {
  const parsed = parseDocName(nombre);
  if (parsed) return parsed.base;
  return nombre.replace(/^EXP\d{8}_/, "").trim();
}

/** Siguiente código de expediente del año en curso a partir de los nombres existentes. */
export function nextExpediente(nombres: readonly string[], date: Date = new Date()): string {
  const year = date.getFullYear();
  let max = 0;
  for (const n of nombres) {
    const m = /^EXP(\d{4})(\d{4})/.exec(n.trim());
    if (!m || Number(m[1]) !== year) continue;
    max = Math.max(max, Number(m[2]));
  }
  return `EXP${year}${String(max + 1).padStart(4, "0")}`;
}

/** Compone el nombre definitivo de una versión de documento. */
export function buildDocName(
  codigo: string,
  nombre: string,
  version: number,
  date: Date = new Date(),
): string {
  return `${codigo}_${baseDe(nombre)}_${yyyymmdd(date)}_v${String(Math.max(1, version)).padStart(2, "0")}`;
}

/** Compone el nombre de un adjunto asociado al expediente. */
export function buildAttachmentName(codigo: string, nombreOriginal: string): string {
  return `${codigo}_${nombreOriginal.replace(/^EXP\d{8}_/, "").trim()}`;
}
