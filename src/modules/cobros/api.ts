import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface PaymentRow {
  id: string;
  referencia: string;
  estado: string;
  metodo: string;
  importe: number;
  fecha_pago: string;
  fecha_conciliacion: string | null;
  conciliado: boolean;
  notas: string | null;
  invoice_id: string | null;
  client_id: string | null;
  invoices: { numero: string; total: number } | null;
  clients: { razon_social: string } | null;
}

export const paymentsQuery = queryOptions({
  queryKey: ["cobros", "payments"],
  queryFn: async (): Promise<PaymentRow[]> => {
    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, referencia, estado, metodo, importe, fecha_pago, fecha_conciliacion, conciliado, notas, invoice_id, client_id, invoices(numero, total), clients(razon_social)",
      )
      .is("deleted_at", null)
      .order("fecha_pago", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PaymentRow[];
  },
});
