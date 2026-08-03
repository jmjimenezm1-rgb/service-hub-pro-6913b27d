import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface PaymentRow {
  id: string;
  referencia: string;
  estado: string;
  metodo: string;
  importe: number;
  fecha_prevista: string | null;
  fecha_cobro: string | null;
  fecha_devolucion: string | null;
  fecha_conciliacion: string | null;
  conciliado: boolean;
  aviso_enviado: boolean;
  observaciones: string | null;
  invoice_id: string | null;
  client_id: string | null;
  invoices: { numero: string; total: number } | null;
  clients: { razon_social: string } | null;
}

const SELECT =
  "id, referencia, estado, metodo, importe, fecha_prevista, fecha_cobro, fecha_devolucion, fecha_conciliacion, conciliado, aviso_enviado, observaciones, invoice_id, client_id, invoices(numero, total), clients(razon_social)";

export const paymentsQuery = queryOptions({
  queryKey: ["cobros", "payments"],
  queryFn: async (): Promise<PaymentRow[]> => {
    const { data, error } = await supabase
      .from("payments")
      .select(SELECT)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PaymentRow[];
  },
});

/** Facturas con saldo pendiente, para vincular cobros. */
export const openInvoicesQuery = queryOptions({
  queryKey: ["cobros", "open-invoices"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("id, numero, total, pagado, client_id")
      .is("deleted_at", null)
      .neq("estado", "anulada")
      .order("fecha_emision", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const PAYMENT_STATES = [
  "pendiente",
  "cobrado",
  "devuelto",
  "cancelado",
  "impagado",
] as const;

export const PAYMENT_METHODS = [
  "transferencia",
  "tarjeta",
  "sepa",
  "paypal",
  "stripe",
  "domiciliacion",
] as const;
