import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface SupplierRow {
  id: string;
  razon_social: string;
  nombre_comercial: string | null;
  nif: string | null;
  email: string | null;
  telefono: string | null;
  categoria: string | null;
  estado: string;
}

export interface PurchaseRow {
  id: string;
  numero: string;
  numero_proveedor: string | null;
  concepto: string;
  categoria: string | null;
  estado: string;
  fecha_emision: string;
  fecha_recepcion: string | null;
  fecha_vencimiento: string | null;
  base_imponible: number;
  iva_pct: number;
  iva: number;
  retencion: number;
  total: number;
  pagado: number;
  notas: string | null;
  supplier_id: string | null;
  cost_center_id: string | null;
  account_id: string | null;
  suppliers: { razon_social: string } | null;
  cost_centers: { nombre: string } | null;
  ledger_accounts: { codigo: string; nombre: string } | null;
}

export interface SupplierPaymentRow {
  id: string;
  referencia: string;
  importe: number;
  estado: string;
  metodo: string;
  fecha_prevista: string | null;
  fecha_pago: string | null;
  fecha_devolucion: string | null;
  conciliado: boolean;
  fecha_conciliacion: string | null;
  observaciones: string | null;
  supplier_id: string | null;
  purchase_invoice_id: string | null;
  suppliers: { razon_social: string } | null;
  purchase_invoices: { numero: string; total: number } | null;
}

export const PURCHASE_STATES = [
  "borrador",
  "recibida",
  "aprobada",
  "contabilizada",
  "parcial",
  "pagada",
  "anulada",
] as const;

export const PURCHASE_CATEGORIES = [
  "infraestructura",
  "licencias",
  "servicios profesionales",
  "marketing",
  "personal",
  "suministros",
  "viajes",
  "otros",
];

export const PAGO_STATES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "cobrado", label: "Pagado" },
  { value: "devuelto", label: "Devuelto" },
  { value: "impagado", label: "Rechazado" },
  { value: "cancelado", label: "Cancelado" },
];

export const PAGO_METHODS = [
  "transferencia",
  "tarjeta",
  "sepa",
  "paypal",
  "stripe",
  "domiciliacion",
];

export function estadoPagoLabel(value: string) {
  return PAGO_STATES.find((s) => s.value === value)?.label ?? value;
}

export const suppliersQuery = queryOptions({
  queryKey: ["compras", "suppliers"],
  queryFn: async (): Promise<SupplierRow[]> => {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, razon_social, nombre_comercial, nif, email, telefono, categoria, estado")
      .is("deleted_at", null)
      .order("razon_social");
    if (error) throw error;
    return (data ?? []) as unknown as SupplierRow[];
  },
});

const PURCHASE_SELECT =
  "id, numero, numero_proveedor, concepto, categoria, estado, fecha_emision, fecha_recepcion, fecha_vencimiento, base_imponible, iva_pct, iva, retencion, total, pagado, notas, supplier_id, cost_center_id, account_id, suppliers(razon_social), cost_centers(nombre), ledger_accounts(codigo, nombre)";

export const purchasesQuery = queryOptions({
  queryKey: ["compras", "purchases"],
  queryFn: async (): Promise<PurchaseRow[]> => {
    const { data, error } = await supabase
      .from("purchase_invoices")
      .select(PURCHASE_SELECT)
      .is("deleted_at", null)
      .order("fecha_emision", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as PurchaseRow[];
  },
});

export const supplierPaymentsQuery = queryOptions({
  queryKey: ["pagos", "supplier-payments"],
  queryFn: async (): Promise<SupplierPaymentRow[]> => {
    const { data, error } = await supabase
      .from("supplier_payments")
      .select(
        "id, referencia, importe, estado, metodo, fecha_prevista, fecha_pago, fecha_devolucion, conciliado, fecha_conciliacion, observaciones, supplier_id, purchase_invoice_id, suppliers(razon_social), purchase_invoices(numero, total)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SupplierPaymentRow[];
  },
});

/** Calcula IVA y total de una factura de compra a partir de la base y el % de IVA. */
export function calcPurchase(values: {
  base_imponible?: unknown;
  iva_pct?: unknown;
  retencion?: unknown;
}) {
  const base = Number(values.base_imponible ?? 0) || 0;
  const pct = Number(values.iva_pct ?? 0) || 0;
  const retencion = Number(values.retencion ?? 0) || 0;
  const iva = Math.round(base * (pct / 100) * 100) / 100;
  const total = Math.round((base + iva - retencion) * 100) / 100;
  return { iva, total };
}

/** Recalcula el importe pagado de una factura de compra y ajusta su estado. */
export async function syncPurchasePayments(purchaseId: string) {
  const { data: pagos, error } = await supabase
    .from("supplier_payments")
    .select("importe, estado")
    .eq("purchase_invoice_id", purchaseId)
    .is("deleted_at", null);
  if (error) throw error;

  const pagado =
    (pagos ?? [])
      .filter((p) => p.estado === "cobrado")
      .reduce((a, p) => a + Number(p.importe), 0) || 0;

  const { data: factura, error: e2 } = await supabase
    .from("purchase_invoices")
    .select("total, estado")
    .eq("id", purchaseId)
    .single();
  if (e2) throw e2;

  let estado = factura.estado;
  if (estado !== "anulada" && estado !== "borrador") {
    if (pagado <= 0) estado = estado === "pagada" || estado === "parcial" ? "aprobada" : estado;
    else if (pagado + 0.009 >= Number(factura.total)) estado = "pagada";
    else estado = "parcial";
  }

  const { error: e3 } = await supabase
    .from("purchase_invoices")
    .update({ pagado, estado })
    .eq("id", purchaseId);
  if (e3) throw e3;
  return { pagado, estado };
}
