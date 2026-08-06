import { supabase } from "@/integrations/supabase/client";

/**
 * Parametrización de códigos automáticos (facturas, rectificativas, cobros…).
 *
 * Un patrón es una plantilla con marcadores:
 *   {YYYY} año 4 dígitos · {YY} año 2 dígitos · {MM} mes · {DD} día
 *   {SERIE} prefijo de la serie de facturación
 *   {0000} contador con relleno de ceros (tantos como dígitos tenga el marcador)
 *
 * Ejemplo: `FAC-{YYYY}-{0000}` → `FAC-2026-0007`
 */

export type NumberingEntity =
  | "factura"
  | "rectificativa"
  | "cobro"
  | "asiento"
  | "documento"
  | "ticket";

export interface NumberingPattern {
  id: string;
  entidad: string;
  nombre: string;
  patron: string;
  proximo_numero: number;
  reinicio: string;
  periodo_actual: string | null;
  estado: string;
}

export const NUMBERING_ENTITIES: { value: NumberingEntity; label: string }[] = [
  { value: "factura", label: "Factura" },
  { value: "rectificativa", label: "Factura rectificativa" },
  { value: "cobro", label: "Cobro" },
  { value: "asiento", label: "Asiento contable" },
  { value: "documento", label: "Documento" },
  { value: "ticket", label: "Ticket de soporte" },
];

export const NUMBERING_RESETS = [
  { value: "nunca", label: "Nunca" },
  { value: "anual", label: "Cada año" },
  { value: "mensual", label: "Cada mes" },
];

export const NUMBERING_TOKENS = "{YYYY} {YY} {MM} {DD} {SERIE} {0000}";

function periodOf(reinicio: string, date = new Date()): string {
  const y = String(date.getFullYear());
  if (reinicio === "mensual") return `${y}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (reinicio === "anual") return y;
  return "*";
}

/** Sustituye los marcadores de un patrón. */
export function renderPattern(
  patron: string,
  numero: number,
  vars: { serie?: string | undefined } = {},
  date = new Date(),
): string {
  return patron
    .replace(/\{YYYY\}/g, String(date.getFullYear()))
    .replace(/\{YY\}/g, String(date.getFullYear()).slice(-2))
    .replace(/\{MM\}/g, String(date.getMonth() + 1).padStart(2, "0"))
    .replace(/\{DD\}/g, String(date.getDate()).padStart(2, "0"))
    .replace(/\{SERIE\}/g, vars.serie ?? "")
    .replace(/\{(0+)\}/g, (_m, zeros: string) => String(numero).padStart(zeros.length, "0"));
}

/** Vista previa del próximo código sin consumir contador. */
export function previewPattern(pattern: {
  patron: string;
  proximo_numero: number;
}): string {
  return renderPattern(pattern.patron, Number(pattern.proximo_numero || 1), { serie: "FAC" });
}

export async function getPattern(entidad: NumberingEntity): Promise<NumberingPattern | null> {
  const { data, error } = await supabase
    .from("numbering_patterns")
    .select("*")
    .eq("entidad", entidad)
    .eq("estado", "activo")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return (data as NumberingPattern | null) ?? null;
}

/**
 * Genera el siguiente código para una entidad a partir de su patrón
 * y consume el contador (reiniciándolo si cambia el periodo).
 */
export async function nextCode(
  entidad: NumberingEntity,
  vars: { serie?: string | undefined } = {},
): Promise<string | null> {
  const pattern = await getPattern(entidad);
  if (!pattern) return null;

  const periodo = periodOf(pattern.reinicio);
  const reinicia = pattern.reinicio !== "nunca" && pattern.periodo_actual !== periodo;
  const numero = reinicia ? 1 : Number(pattern.proximo_numero);

  const codigo = renderPattern(pattern.patron, numero, vars);

  const { error } = await supabase
    .from("numbering_patterns")
    .update({ proximo_numero: numero + 1, periodo_actual: periodo })
    .eq("id", pattern.id);
  if (error) throw error;

  return codigo;
}
