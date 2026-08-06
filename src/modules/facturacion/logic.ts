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
    Boolean(invoice.fecha_vencimiento) && invoice.fecha_vencimiento! < today();

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

async function accountId(codigo: string): Promise<string> {
  const { data, error } = await supabase
    .from("ledger_accounts")
    .select("id")
    .eq("codigo", codigo)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Falta la cuenta contable ${codigo} en el plan contable.`);
  return data.id;
}

async function nextEntryNumber(ejercicio: number): Promise<string> {
  const { count, error } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("ejercicio", ejercicio);
  if (error) throw error;
  return `AS-${ejercicio}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

/**
 * Contabiliza una factura por partida doble:
 * 430 Clientes (debe total) / 700 Ventas (haber base neta) + 477 IVA (haber).
 */
export async function postInvoiceToLedger(invoiceId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id, numero")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) throw new Error(`La factura ya está contabilizada en el asiento ${existing.numero}.`);

  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id, numero, fecha_emision, base_imponible, descuento, iva, total, clients(razon_social)")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;

  const ejercicio = Number(inv.fecha_emision.slice(0, 4));
  const numero = await nextEntryNumber(ejercicio);
  const cliente = (inv.clients as { razon_social: string } | null)?.razon_social ?? "cliente";
  const neto = round(Number(inv.base_imponible) - Number(inv.descuento));

  const { data: user } = await supabase.auth.getUser();
  const uid = user.user?.id ?? null;

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      numero,
      fecha: inv.fecha_emision,
      ejercicio,
      concepto: `Factura ${inv.numero} · ${cliente}`,
      invoice_id: inv.id,
      estado: "activo",
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();
  if (entryErr) throw entryErr;

  const [clientes, ventas, ivaRep] = await Promise.all([
    accountId("430000"),
    accountId("700000"),
    accountId("477000"),
  ]);

  const lines = [
    { account_id: clientes, descripcion: `Cliente ${cliente}`, debe: Number(inv.total), haber: 0 },
    { account_id: ventas, descripcion: "Ventas de servicios", debe: 0, haber: neto },
    { account_id: ivaRep, descripcion: "IVA repercutido", debe: 0, haber: Number(inv.iva) },
  ].filter((l) => l.debe !== 0 || l.haber !== 0);

  const { error: linesErr } = await supabase
    .from("journal_lines")
    .insert(lines.map((l) => ({ ...l, entry_id: entry.id, created_by: uid, updated_by: uid })));
  if (linesErr) throw linesErr;

  await logAudit({
    modulo: "financiero",
    entidad: "journal_entries",
    entidadId: entry.id,
    accion: "insert",
    valorNuevo: { numero, invoice_id: inv.id },
  });

  return numero;
}

/**
 * Contabiliza un cobro: 572 Bancos (debe) / 430 Clientes (haber).
 */
export async function postPaymentToLedger(paymentId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id, numero")
    .eq("concepto", `Cobro ${paymentId}`)
    .maybeSingle();
  if (existing) throw new Error("El cobro ya está contabilizado.");

  const { data: pay, error } = await supabase
    .from("payments")
    .select("id, referencia, importe, fecha_cobro, invoice_id, clients(razon_social)")
    .eq("id", paymentId)
    .single();
  if (error) throw error;

  const fecha = pay.fecha_cobro ?? today();
  const ejercicio = Number(fecha.slice(0, 4));
  const numero = await nextEntryNumber(ejercicio);
  const cliente = (pay.clients as { razon_social: string } | null)?.razon_social ?? "cliente";

  const { data: user } = await supabase.auth.getUser();
  const uid = user.user?.id ?? null;

  const { data: entry, error: entryErr } = await supabase
    .from("journal_entries")
    .insert({
      numero,
      fecha,
      ejercicio,
      concepto: `Cobro ${pay.referencia} · ${cliente}`,
      invoice_id: pay.invoice_id,
      estado: "activo",
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();
  if (entryErr) throw entryErr;

  const [bancos, clientes] = await Promise.all([accountId("572000"), accountId("430000")]);
  const importe = Number(pay.importe);

  const { error: linesErr } = await supabase.from("journal_lines").insert([
    {
      entry_id: entry.id,
      account_id: bancos,
      descripcion: `Cobro ${pay.referencia}`,
      debe: importe,
      haber: 0,
      created_by: uid,
      updated_by: uid,
    },
    {
      entry_id: entry.id,
      account_id: clientes,
      descripcion: `Cliente ${cliente}`,
      debe: 0,
      haber: importe,
      created_by: uid,
      updated_by: uid,
    },
  ]);
  if (linesErr) throw linesErr;

  await logAudit({
    modulo: "financiero",
    entidad: "journal_entries",
    entidadId: entry.id,
    accion: "insert",
    valorNuevo: { numero, payment_id: pay.id },
  });

  return numero;
}

/**
 * Genera una factura rectificativa (abono) con los importes negativos
 * de la factura original y copia sus líneas invertidas.
 */
export async function createRectificativa(invoiceId: string): Promise<string> {
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

  return numero;
}
