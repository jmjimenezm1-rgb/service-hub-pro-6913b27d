import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { nextCode } from "@/lib/numbering";

export interface InvoiceRow {
  id: string;
  numero: string;
  tipo: string;
  estado: string;
  periodicidad: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  periodo_desde: string | null;
  periodo_hasta: string | null;
  base_imponible: number;
  descuento: number;
  iva: number;
  retencion: number;
  total: number;
  pagado: number;
  moneda: string;
  notas: string | null;
  serie_id: string | null;
  coupon_id: string | null;
  client_id: string | null;
  clients: { razon_social: string; nombre_comercial: string | null } | null;
}

export interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  application_id: string | null;
  concepto: string;
  tipo_cargo: string;
  cantidad: number;
  precio_unitario: number;
  descuento_pct: number;
  iva_pct: number;
  importe: number;
  orden: number;
  applications: { nombre: string } | null;
}

export const INVOICE_STATES = [
  "borrador",
  "emitida",
  "enviada",
  "pagada",
  "parcial",
  "vencida",
  "anulada",
] as const;

export const INVOICE_TYPES = ["ordinaria", "rectificativa", "abono", "nota_credito"] as const;

export const BILLING_PERIODS = [
  "mensual",
  "trimestral",
  "semestral",
  "anual",
  "puntual",
] as const;

export const CHARGE_TYPES = ["fijo", "por_usuario", "por_uso", "servicio", "descuento"] as const;

export const invoicesQuery = queryOptions({
  queryKey: ["facturacion", "invoices"],
  queryFn: async (): Promise<InvoiceRow[]> => {
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, numero, tipo, estado, periodicidad, fecha_emision, fecha_vencimiento, periodo_desde, periodo_hasta, base_imponible, descuento, iva, retencion, total, pagado, moneda, notas, serie_id, coupon_id, client_id, clients(razon_social, nombre_comercial)",
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
    queryFn: async (): Promise<InvoiceLineRow[]> => {
      const { data, error } = await supabase
        .from("invoice_lines")
        .select("*, applications(nombre)")
        .eq("invoice_id", invoiceId)
        .is("deleted_at", null)
        .order("orden");
      if (error) throw error;
      return (data ?? []) as unknown as InvoiceLineRow[];
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

/**
 * Devuelve el siguiente número de factura. Si existe un patrón de
 * numeración activo en parametrización, se usa ese patrón (con {SERIE}
 * sustituido por el prefijo de la serie); si no, se usa el contador de la serie.
 */
export async function nextInvoiceNumber(serieId: string): Promise<string> {
  const { data, error } = await supabase
    .from("invoice_series")
    .select("prefijo, proximo_numero, ejercicio")
    .eq("id", serieId)
    .single();
  if (error) throw error;

  const fromPattern = await nextCode("factura", { serie: data.prefijo });
  if (fromPattern) return fromPattern;

  const numero = `${data.prefijo}-${data.ejercicio}-${String(data.proximo_numero).padStart(4, "0")}`;
  const { error: upErr } = await supabase
    .from("invoice_series")
    .update({ proximo_numero: data.proximo_numero + 1 })
    .eq("id", serieId);
  if (upErr) throw upErr;
  return numero;
}

/** Recalcula base, descuento, IVA y total de una factura a partir de sus líneas. */
export async function recalcInvoice(invoiceId: string): Promise<void> {
  const { data, error } = await supabase
    .from("invoice_lines")
    .select("cantidad, precio_unitario, descuento_pct, iva_pct")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null);
  if (error) throw error;

  let base = 0;
  let descuento = 0;
  let iva = 0;
  for (const l of data ?? []) {
    const bruto = Number(l.cantidad) * Number(l.precio_unitario);
    const desc = (bruto * Number(l.descuento_pct)) / 100;
    const neto = bruto - desc;
    base += bruto;
    descuento += desc;
    iva += (neto * Number(l.iva_pct)) / 100;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  const total = round(base - descuento + iva);

  const { error: upErr } = await supabase
    .from("invoices")
    .update({
      base_imponible: round(base),
      descuento: round(descuento),
      iva: round(iva),
      total,
    })
    .eq("id", invoiceId);
  if (upErr) throw upErr;
}

/** Importe de una línea con descuento e IVA aplicados. */
export function lineAmount(input: {
  cantidad: number;
  precio_unitario: number;
  descuento_pct: number;
  iva_pct: number;
}): number {
  const bruto = input.cantidad * input.precio_unitario;
  const neto = bruto - (bruto * input.descuento_pct) / 100;
  return Math.round((neto + (neto * input.iva_pct) / 100) * 100) / 100;
}
