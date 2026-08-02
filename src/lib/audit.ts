import { supabase } from "@/integrations/supabase/client";

export interface AuditInput {
  modulo: string;
  entidad: string;
  entidadId?: string | null;
  accion: "insert" | "update" | "delete" | "export" | "login";
  valorAnterior?: unknown;
  valorNuevo?: unknown;
}

/**
 * Registro de auditoría transversal a todos los módulos.
 * No lanza errores: la auditoría nunca debe romper una operación de negocio.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      modulo: input.modulo,
      entidad: input.entidad,
      entidad_id: input.entidadId ?? null,
      accion: input.accion,
      valor_anterior: (input.valorAnterior ?? null) as never,
      valor_nuevo: (input.valorNuevo ?? null) as never,
      user_id: data.user?.id ?? null,
      user_email: data.user?.email ?? null,
    });
  } catch (error) {
    console.warn("[auditoría] no se pudo registrar la operación", error);
  }
}
