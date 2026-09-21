import { supabase } from "@/integrations/supabase/client";

export const AUDIT_ACTIONS = [
  "insert",
  "update",
  "delete",
  "export",
  "login",
  "logout",
  "view",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditInput {
  modulo: string;
  entidad: string;
  entidadId?: string | null;
  accion: AuditAction;
  /** Estado del registro antes de la operación. */
  valorAnterior?: unknown;
  /** Estado del registro después de la operación. */
  valorNuevo?: unknown;
}

export interface AuditEntry {
  id: string;
  modulo: string;
  entidad: string;
  entidad_id: string | null;
  accion: string;
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  ip: string | null;
  created_at: string;
}

let ipPromise: Promise<string | null> | null = null;

/** IP pública del cliente, cacheada durante la sesión del navegador. */
async function clientIp(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  ipPromise ??= fetch("/api/public/ip")
    .then((r) => (r.ok ? (r.json() as Promise<{ ip: string | null }>) : { ip: null }))
    .then((d) => d.ip)
    .catch(() => null);
  return ipPromise;
}

/**
 * Registro de auditoría transversal a todos los módulos: quién, qué, cuándo,
 * desde dónde, qué había antes y qué quedó después.
 * Es de solo escritura de traza: nunca modifica datos de negocio y nunca
 * lanza errores, la auditoría no debe romper una operación.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const [{ data }, ip] = await Promise.all([supabase.auth.getUser(), clientIp()]);
    await supabase.from("audit_log").insert({
      modulo: input.modulo,
      entidad: input.entidad,
      entidad_id: input.entidadId ?? null,
      accion: input.accion,
      valor_anterior: (input.valorAnterior ?? null) as never,
      valor_nuevo: (input.valorNuevo ?? null) as never,
      user_id: data.user?.id ?? null,
      user_email: data.user?.email ?? null,
      ip,
    });
  } catch (error) {
    console.warn("[auditoría] no se pudo registrar la operación", error);
  }
}

/** Lee el estado actual de un registro para guardarlo como "valor anterior". */
export async function snapshot(
  table: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await supabase
      .from(table as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return (data ?? null) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

export interface FieldChange {
  campo: string;
  antes: unknown;
  despues: unknown;
}

const IGNORED = new Set(["updated_at", "updated_by", "created_at", "created_by"]);

/** Compara el estado anterior y el posterior y devuelve solo lo que cambió. */
export function diffValues(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldChange[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: FieldChange[] = [];
  for (const campo of keys) {
    if (IGNORED.has(campo)) continue;
    const antes = before?.[campo] ?? null;
    const despues = after?.[campo] ?? null;
    if (JSON.stringify(antes) === JSON.stringify(despues)) continue;
    changes.push({ campo, antes, despues });
  }
  return changes.sort((a, b) => a.campo.localeCompare(b.campo, "es"));
}
