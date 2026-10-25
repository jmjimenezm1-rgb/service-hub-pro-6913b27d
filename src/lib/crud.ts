import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { logAudit, snapshot } from "@/lib/audit";

export type CrudTable =
  | "invoices"
  | "invoice_lines"
  | "invoice_series"
  | "coupons"
  | "payments"
  | "cost_centers"
  | "ledger_accounts"
  | "journal_entries"
  | "journal_lines"
  | "documents"
  | "tickets"
  | "ticket_comments"
  | "numbering_patterns"
  | "suppliers"
  | "purchase_invoices"
  | "supplier_payments";

interface CrudOptions {
  /** Módulo funcional, usado en el registro de auditoría. */
  modulo: string;
  /** Claves de react-query a invalidar tras cada operación. */
  invalidate: readonly unknown[][];
  /** Nombre singular legible, p. ej. "Factura". */
  entidad: string;
}

export type Payload = Record<string, unknown>;

/** Normaliza un formulario: strings vacíos a null, números como number. */
export function clean(values: Payload): Payload {
  const out: Payload = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = value === "" || value === undefined ? null : value;
  }
  return out;
}

export function useCrud(table: CrudTable, opts: CrudOptions) {
  const qc = useQueryClient();

  const refresh = () => {
    for (const key of opts.invalidate) void qc.invalidateQueries({ queryKey: key });
    if (["invoices", "payments", "purchase_invoices", "supplier_payments"].includes(table)) {
      void qc.invalidateQueries({ queryKey: ["financiero"] });
    }
  };

  const withUser = async (payload: Payload, isNew: boolean) => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    return isNew ? { ...payload, created_by: uid, updated_by: uid } : { ...payload, updated_by: uid };
  };

  const create = useMutation({
    mutationFn: async (values: Payload) => {
      const payload = await withUser(clean(values), true);
      const { data, error } = await supabase
        .from(table)
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw error;
      await logAudit({
        modulo: opts.modulo,
        entidad: table,
        entidadId: data.id,
        accion: "insert",
        valorNuevo: payload,
      });
      return data;
    },
    onSuccess: () => {
      toast.success(`${opts.entidad} creada correctamente`);
      refresh();
    },
    onError: (e: Error) => toast.error(`No se pudo crear: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Payload }) => {
      const payload = await withUser(clean(values), false);
      const antes = await snapshot(table, id);
      const { error } = await supabase
        .from(table)
        .update(payload as never)
        .eq("id", id);
      if (error) throw error;
      const despues = await snapshot(table, id);
      await logAudit({
        modulo: opts.modulo,
        entidad: table,
        entidadId: id,
        accion: "update",
        valorAnterior: antes,
        valorNuevo: despues ?? payload,
      });
    },
    onSuccess: () => {
      toast.success(`${opts.entidad} actualizada`);
      refresh();
    },
    onError: (e: Error) => toast.error(`No se pudo guardar: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await supabase.auth.getUser();
      const antes = await snapshot(table, id);
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString(), updated_by: data.user?.id ?? null } as never)
        .eq("id", id);
      if (error) throw error;
      await logAudit({
        modulo: opts.modulo,
        entidad: table,
        entidadId: id,
        accion: "delete",
        valorAnterior: antes,
        valorNuevo: await snapshot(table, id),
      });
    },
    onSuccess: () => {
      toast.success(`${opts.entidad} eliminada`);
      refresh();
    },
    onError: (e: Error) => toast.error(`No se pudo eliminar: ${e.message}`),
  });

  return {
    create,
    update,
    remove,
    refresh,
    saving: create.isPending || update.isPending || remove.isPending,
  };
}
