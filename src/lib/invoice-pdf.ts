import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { money, fecha } from "@/lib/format";

/** Genera el PDF de una factura, lo archiva en el almacén y lo registra en documental. */
export async function generateInvoicePdf(invoiceId: string): Promise<{
  path: string;
  documentId: string;
  numero: string;
}> {
  const { data: inv, error } = await supabase
    .from("invoices")
    .select(
      "id, numero, tipo, estado, fecha_emision, fecha_vencimiento, periodo_desde, periodo_hasta, base_imponible, descuento, iva, retencion, total, pagado, moneda, notas, client_id, clients(razon_social, nif, direccion, email)",
    )
    .eq("id", invoiceId)
    .single();
  if (error) throw error;

  const { data: lines, error: linesErr } = await supabase
    .from("invoice_lines")
    .select("concepto, cantidad, precio_unitario, descuento_pct, iva_pct, importe, orden")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null)
    .order("orden");
  if (linesErr) throw linesErr;

  const cliente = inv.clients as
    | { razon_social: string; nif: string | null; direccion: string | null; email: string | null }
    | null;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("ServiceHub", marginX, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Plataforma SaaS Pay Per Use", marginX, 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(inv.tipo === "ordinaria" ? "FACTURA" : `FACTURA ${inv.tipo.toUpperCase()}`, 400, 60);
  doc.setFontSize(11);
  doc.text(inv.numero, 400, 76);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Emisión: ${fecha(inv.fecha_emision)}`, 400, 92);
  if (inv.fecha_vencimiento) doc.text(`Vencimiento: ${fecha(inv.fecha_vencimiento)}`, 400, 105);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Cliente", marginX, 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const clienteLines = [
    cliente?.razon_social ?? "—",
    cliente?.nif ? `NIF: ${cliente.nif}` : "",
    cliente?.direccion ?? "",
    cliente?.email ?? "",
  ].filter(Boolean);
  clienteLines.forEach((l, i) => doc.text(String(l), marginX, 134 + i * 12));

  if (inv.periodo_desde || inv.periodo_hasta) {
    doc.text(
      `Periodo facturado: ${fecha(inv.periodo_desde)} – ${fecha(inv.periodo_hasta)}`,
      marginX,
      134 + clienteLines.length * 12 + 8,
    );
  }

  autoTable(doc, {
    startY: 200,
    head: [["Concepto", "Cant.", "Precio", "Dto %", "IVA %", "Importe"]],
    body: (lines ?? []).map((l) => [
      l.concepto,
      String(Number(l.cantidad)),
      money(Number(l.precio_unitario)),
      `${Number(l.descuento_pct)}`,
      `${Number(l.iva_pct)}`,
      money(Number(l.importe)),
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [23, 42, 69], textColor: 255 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  const totals: [string, string][] = [
    ["Base imponible", money(Number(inv.base_imponible))],
    ["Descuento", `- ${money(Number(inv.descuento))}`],
    ["IVA", money(Number(inv.iva))],
    ["Retención", `- ${money(Number(inv.retencion))}`],
    ["TOTAL", money(Number(inv.total))],
    ["Cobrado", money(Number(inv.pagado))],
    ["Pendiente", money(Math.max(0, Number(inv.total) - Number(inv.pagado)))],
  ];
  doc.setFontSize(10);
  totals.forEach(([k, v], i) => {
    const y = endY + i * 14;
    doc.setFont("helvetica", k === "TOTAL" ? "bold" : "normal");
    doc.text(k, 380, y);
    doc.text(v, 548, y, { align: "right" });
  });

  if (inv.notas) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(String(inv.notas), marginX, endY + totals.length * 14 + 20, { maxWidth: 300 });
  }

  const blob = doc.output("blob");
  const path = `facturas/${inv.numero.replace(/[^\w.-]/g, "_")}-${Date.now()}.pdf`;

  const { error: upErr } = await supabase.storage
    .from("documentos")
    .upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  const { data: user } = await supabase.auth.getUser();
  const uid = user.user?.id ?? null;

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", inv.id)
    .eq("tipo", "factura")
    .is("deleted_at", null);

  const { data: docRow, error: docErr } = await supabase
    .from("documents")
    .insert({
      nombre: `Factura ${inv.numero}.pdf`,
      tipo: "factura",
      descripcion: `PDF de la factura ${inv.numero}`,
      storage_path: path,
      mime_type: "application/pdf",
      tamano_bytes: blob.size,
      version: (count ?? 0) + 1,
      client_id: inv.client_id,
      invoice_id: inv.id,
      estado: "activo",
      created_by: uid,
      updated_by: uid,
    })
    .select("id")
    .single();
  if (docErr) throw docErr;

  await logAudit({
    modulo: "facturacion",
    entidad: "documents",
    entidadId: docRow.id,
    accion: "insert",
    valorNuevo: { factura: inv.numero, storage_path: path },
  });

  return { path, documentId: docRow.id, numero: inv.numero };
}

/** URL firmada temporal para descargar un archivo del almacén documental. */
export async function signedUrl(path: string, seconds = 300): Promise<string> {
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function openStoredFile(path: string): Promise<void> {
  const url = await signedUrl(path);
  window.open(url, "_blank", "noopener");
}
