import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface InvoiceRow {
  id: string;
  numero: string;
  tipo: string;
  estado: string;
  periodicidad: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  base_imponible: number;
  descuento: number;
  iva: number;
  total: number;
  pagado: number;
  moneda: string;
  client_id: string | null;
  clients: { razon_social: string; nombre_comercial: string | null } | null;
}

export const invoicesQuery = queryOptions({
  queryKey: ["facturacion", "invoices"],
  queryFn: async (): Promise<InvoiceRow[]> => {
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, numero, tipo, estado, periodicidad, fecha_emision, fecha_vencimiento, base_imponible, descuento, iva, total, pagado, moneda, client_id, clients(razon_social, nombre_comercial)",
      )
      .is("deleted_at", null)
      .order("fecha_emision", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as InvoiceRow[];
  },
});

export const invoiceLinesQuery = (invoiceId: string) =>
  queryOptions({
    queryKey: ["facturacion", "lines", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_lines")
        .select("*, applications(nombre)")
        .eq("invoice_id", invoiceId)
        .order("orden");
      if (error) throw error;
      return data ?? [];
    },
  });

export const seriesQuery = queryOptions({
  queryKey: ["facturacion", "series"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("invoice_series")
      .select("*")
      .is("deleted_at", null)
      .order("codigo");
    if (error) throw error;
    return data ?? [];
  },
});

export const couponsQuery = queryOptions({
  queryKey: ["facturacion", "coupons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .is("deleted_at", null)
      .order("codigo");
    if (error) throw error;
    return data ?? [];
  },
});
