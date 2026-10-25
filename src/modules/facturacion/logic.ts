import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { nextCode } from "@/lib/numbering";

const round = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Recalcula el importe cobrado de una factura a partir de los cobros reales
 * en estado «cobrado» y ajusta su estado (pagada / parcial / vencida).
 */
export async function syncInvoicePayments(invoiceId: string): Promise<void> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, total, estado, fecha_vencimiento")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  if (invoice.estado === "anulada") return;

  const { data: pays, error: payErr } = await supabase
    .from("payments")
    .select("importe, estado")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null);
  if (payErr) throw payErr;

  const pagado = round(
    (pays ?? [])
      .filter((p) => p.estado === "cobrado")
      .reduce((a, p) => a + Number(p.importe), 0),
  );
  const total = Number(invoice.total);
  const vencida =
    invoice.fecha_vencimiento !== null && invoice.fecha_vencimiento < today();

  let estado: string;
  if (total > 0 && pagado >= total - 0.005) estado = "pagada";
  else if (pagado > 0) estado = "parcial";
  else if (vencida) estado = "vencida";
  else estado = invoice.estado === "borrador" ? "borrador" : "emitida";

  const { error: upErr } = await supabase
    .from("invoices")
    .update({ pagado, estado: estado as never })
    .eq("id", invoiceId);
  if (upErr) throw upErr;
}

/** Días transcurridos desde el vencimiento (0 si aún no ha vencido). */
export function diasVencido(fechaVencimiento: string | null): number {
  if (!fechaVencimiento) return 0;
  const diff = Date.now() - new Date(`${fechaVencimiento}T00:00:00`).getTime();
  return diff <= 0 ? 0 : Math.floor(diff / 86_400_000);
}

/** Tramo de antigüedad de la deuda. */
export function tramoAging(dias: number): string {
  if (dias <= 0) return "Al corriente";
  if (dias <= 30) return "1-30 días";
  if (dias <= 60) return "31-60 días";
  if (dias <= 90) return "61-90 días";
  return "+90 días";
}

/** Verifica o genera el asiento automático sin duplicarlo. */
export async function postInvoiceToLedger(invoiceId: string): Promise<string> {
  return postMovement("invoices", invoiceId);
}

export async function postPaymentToLedger(paymentId: string): Promise<string> {
  return postMovement("payments", paymentId);
}

async function postMovement(table: string, id: string): Promise<string> {
  const { data, error } = await supabase.rpc("sync_accounting_movement", { _table: table, _id: id });
  if (error) throw error;
  if (!data) throw new Error("El movimiento aún no está confirmado; no requiere asiento.");
  return data;
}

/**
 * Genera una factura rectificativa (abono) con los importes negativos
 * de la factura original y copia sus líneas invertidas.
 */
export async function createRectificativa(
  invoiceId: string,
): Promise<{ id: string; numero: string }> {
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;

  let numero = (await nextCode("rectificativa")) ?? "";
  if (!numero) {
    numero = `R-${inv.numero}`;
    if (inv.serie_id) {
      const { data: serie } = await supabase
        .from("invoice_series")
        .select("prefijo, proximo_numero, ejercicio")
        .eq("id", inv.serie_id)
        .maybeSingle();
      if (serie) {
        numero = `R${serie.prefijo}-${serie.ejercicio}-${String(serie.proximo_numero).padStart(4, "0")}`;
        await supabase
          .from("invoice_series")
          .update({ proximo_numero: serie.proximo_numero + 1 })
          .eq("id", inv.serie_id);
      }
    }
  }

  const { data: user } = await supabase.auth.getUser();
  const uid = user.user?.id ?? null;

  const { data: nueva, error: insErr } = await supabase
    .from("invoices")
    .insert({
      numero,
      serie_id: inv.serie_id,
      client_id: inv.client_id,
      tipo: "rectificativa",
      estado: "borrador",
      periodicidad: inv.periodicidad,
      fecha_emision: today(),
      periodo_desde: inv.periodo_desde,
      periodo_hasta: inv.periodo_hasta,
      base_imponible: -Number(inv.base_imponible),
      descuento: -Number(inv.descuento),
      iva: -Number(inv.iva),
      retencion: -Number(inv.retencion),
      total: -Number(inv.total),
      pagado: 0,
      moneda: inv.moneda,
      factura_origen_id: inv.id,
      notas: `Rectificativa de la factura ${inv.numero}`,
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;

  const { data: lines } = await supabase
    .from("invoice_lines")
    .select("application_id, concepto, tipo_cargo, cantidad, precio_unitario, descuento_pct, iva_pct, importe, orden")
    .eq("invoice_id", inv.id)
    .is("deleted_at", null);

  if (lines?.length) {
    await supabase.from("invoice_lines").insert(
      lines.map((l) => ({
        ...l,
        invoice_id: nueva.id,
        cantidad: -Number(l.cantidad),
        importe: -Number(l.importe),
        created_by: uid,
        updated_by: uid,
      })),
    );
  }

  await logAudit({
    modulo: "facturacion",
    entidad: "invoices",
    entidadId: nueva.id,
    accion: "insert",
    valorNuevo: { numero, rectifica: inv.numero },
  });

  return { id: nueva.id, numero };
}

/** ¿Está la factura contabilizada? Devuelve el número de asiento si lo está. */
export async function ledgerEntryOf(invoiceId: string): Promise<{ id: string; numero: string } | null> {
  const { data, error } = await supabase.from("journal_entries").select("id, numero")
    .eq("source_table", "invoices").eq("source_id", invoiceId)
    .is("reversal_of", null).is("reversed_at", null).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return data;
}

export interface AnulacionResult {
  rectificativa: string | null;
  asientoReverso: string | null;
  cobrosCancelados: number;
  cobrosDevueltos: number;
}

/** Estados en los que la factura ya ha surtido efectos y exige rectificativa. */
export function requiereRectificativa(estado: string): boolean {
  return ["emitida", "enviada", "pagada", "parcial", "vencida"].includes(estado);
}

/**
 * Anula una factura. Si ya estaba emitida o cobrada, emite además una
 * factura rectificativa, revierte el asiento contable y regulariza los cobros:
 * los pendientes se cancelan y los cobrados se marcan como devueltos.
 */
export async function anularFactura(
  invoiceId: string,
  opts: { conRectificativa: boolean },
): Promise<AnulacionResult> {
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id, numero, estado")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  if (inv.estado === "anulada") throw new Error("La factura ya está anulada.");

  const originalEntry = await ledgerEntryOf(invoiceId);
  const result: AnulacionResult = {
    rectificativa: null,
    asientoReverso: null,
    cobrosCancelados: 0,
    cobrosDevueltos: 0,
  };

  if (opts.conRectificativa) {
    const rect = await createRectificativa(invoiceId);
    result.rectificativa = rect.numero;
  }

  const { data: pays, error: payErr } = await supabase
    .from("payments")
    .select("id, estado")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null);
  if (payErr) throw payErr;

  const { data: user } = await supabase.auth.getUser();
  const uid = user.user?.id ?? null;

  for (const p of pays ?? []) {
    if (p.estado === "cobrado") {
      const { error: e } = await supabase
        .from("payments")
        .update({
          estado: "devuelto",
          fecha_devolucion: today(),
          observaciones: `Devolución por anulación de la factura ${inv.numero}`,
          updated_by: uid,
        })
        .eq("id", p.id);
      if (e) throw e;
      result.cobrosDevueltos += 1;
    } else if (p.estado === "pendiente" || p.estado === "impagado") {
      const { error: e } = await supabase
        .from("payments")
        .update({
          estado: "cancelado",
          observaciones: `Cancelado por anulación de la factura ${inv.numero}`,
          updated_by: uid,
        })
        .eq("id", p.id);
      if (e) throw e;
      result.cobrosCancelados += 1;
    }
  }

  const { error: upErr } = await supabase
    .from("invoices")
    .update({ estado: "anulada", pagado: 0, updated_by: uid })
    .eq("id", invoiceId);
  if (upErr) throw upErr;
  if (originalEntry) {
    const { data: reversal, error: reversalError } = await supabase.from("journal_entries").select("numero").eq("reversal_of", originalEntry.id).maybeSingle();
    if (reversalError) throw reversalError;
    result.asientoReverso = reversal?.numero ?? null;
  }

  await logAudit({
    modulo: "facturacion",
    entidad: "invoices",
    entidadId: invoiceId,
    accion: "update",
    valorNuevo: { estado: "anulada", ...result },
  });

  return result;
}
