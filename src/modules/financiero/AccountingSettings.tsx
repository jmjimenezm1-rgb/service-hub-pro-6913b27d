import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { logAudit } from "@/lib/audit";
import { PURCHASE_CATEGORIES, PAGO_METHODS } from "@/modules/compras/api";

type Rule = Database["public"]["Tables"]["accounting_rules"]["Row"];
const movements = [
  { value: "factura", label: "Facturación" },
  { value: "cobro", label: "Cobros" },
  { value: "compra", label: "Compras y gastos" },
  { value: "pago", label: "Pagos" },
];

export function AccountingSettings() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["parametrizacion", "accounting"],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounting_rules").select("*").order("movimiento").order("variante");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["financiero", "active-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ledger_accounts").select("id,codigo,nombre").is("deleted_at", null).eq("estado", "activo").order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });
  const accountName = (id: string | null) => {
    const account = accounts.find((a) => a.id === id);
    return account ? `${account.codigo} · ${account.nombre}` : "—";
  };
  const columns: Column<Rule>[] = [
    { key: "movimiento", header: "Movimiento", render: (r) => movements.find((m) => m.value === r.movimiento)?.label },
    { key: "variante", header: "Categoría / método", render: (r) => r.variante || "General" },
    { key: "contrapartida", header: "Cliente / proveedor", render: (r) => accountName(r.contrapartida_id) },
    { key: "principal", header: "Ingreso / gasto / tesorería", render: (r) => accountName(r.principal_id) },
    { key: "iva", header: "IVA", render: (r) => accountName(r.iva_id) },
    { key: "retencion", header: "Retención", render: (r) => accountName(r.retencion_id) },
    { key: "acciones", header: "", sortable: false, render: (r) => <Button size="icon" variant="ghost" aria-label={`Editar cuentas de ${r.nombre}`} onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button> },
  ];
  const reconcile = async () => {
    setSyncing(true);
    let count = 0;
    const failures: string[] = [];
    try {
      for (const table of ["invoices", "payments", "purchase_invoices", "supplier_payments"] as const) {
        const { data, error } = await supabase.from(table).select("id").is("deleted_at", null);
        if (error) throw error;
        for (const row of data ?? []) {
          const { data: number, error: syncError } = await supabase.rpc("sync_accounting_movement", { _table: table, _id: row.id });
          if (syncError) failures.push(syncError.message);
          else if (number) count++;
        }
      }
      await qc.invalidateQueries({ queryKey: ["financiero"] });
      if (failures.length) toast.error(`${failures.length} movimientos pendientes: ${failures[0]}`);
      else toast.success(`${count} movimientos con reflejo contable verificado`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo revisar la contabilidad"); }
    finally { setSyncing(false); }
  };
  const options = accounts.map((a) => ({ value: a.id, label: `${a.codigo} · ${a.nombre}` }));
  return <section className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold">Asociaciones contables</h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={syncing} onClick={reconcile}><RefreshCw className="mr-1.5 h-4 w-4" />{syncing ? "Revisando…" : "Contabilizar pendientes"}</Button>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Nueva asociación</Button>
      </div>
    </div>
    <DataTable data={rules} columns={columns} loading={isLoading} searchPlaceholder="Buscar asociación…" />
    <FormDialog open={open} onOpenChange={setOpen} title={editing ? `Cuentas de ${editing.nombre}` : "Nueva asociación contable"} initial={editing ? { ...editing, variante: editing.variante || "general" } : { movimiento: "compra", variante: "general" }} submitting={saving} fields={[
      { name: "movimiento", label: "Movimiento", type: "select", required: true, options: movements },
      { name: "nombre", label: "Nombre", required: true },
      { name: "variante", label: "Categoría de compra / método de cobro o pago", type: "select", full: true, required: true, options: [{ value: "general", label: "General" }, ...Array.from(new Set([...PURCHASE_CATEGORIES, ...PAGO_METHODS])).map((s) => ({ value: s, label: s }))] },
      { name: "contrapartida_id", label: "Cuenta cliente / proveedor", type: "select", required: true, options },
      { name: "principal_id", label: "Cuenta ingreso / gasto / tesorería", type: "select", required: true, options },
      { name: "iva_id", label: "Cuenta de IVA", type: "select", options: [{ value: "none", label: "Sin IVA" }, ...options] },
      { name: "retencion_id", label: "Cuenta de retenciones", type: "select", options: [{ value: "none", label: "Sin retenciones" }, ...options] },
    ]} onSubmit={async (values) => {
      setSaving(true);
      try {
        const movimiento = String(values["movimiento"]);
        const variante = values["variante"] === "general" ? "" : String(values["variante"]);
        if (movimiento === "factura" && variante) throw new Error("Facturación utiliza la asociación General.");
        if (movimiento === "compra" && variante && !PURCHASE_CATEGORIES.includes(variante)) throw new Error("Selecciona una categoría de compra.");
        if (["cobro", "pago"].includes(movimiento) && variante && !PAGO_METHODS.includes(variante)) throw new Error("Selecciona un método de pago.");
        const { data: user } = await supabase.auth.getUser();
        const nullable = (v: unknown) => !v || v === "none" ? null : String(v);
        const payload = { movimiento, variante, nombre: String(values["nombre"]), contrapartida_id: String(values["contrapartida_id"]), principal_id: String(values["principal_id"]), iva_id: nullable(values["iva_id"]), retencion_id: nullable(values["retencion_id"]), updated_by: user.user?.id ?? null };
        const result = editing ? await supabase.from("accounting_rules").update(payload).eq("id", editing.id).select().single() : await supabase.from("accounting_rules").insert({ ...payload, created_by: user.user?.id ?? null }).select().single();
        if (result.error) throw result.error;
        await logAudit({ modulo: "parametrizacion", entidad: "accounting_rules", entidadId: result.data.id, accion: editing ? "update" : "insert", valorAnterior: editing, valorNuevo: result.data });
        await qc.invalidateQueries({ queryKey: ["parametrizacion"] });
        toast.success("Asociación contable guardada"); setOpen(false);
      } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar la asociación"); }
      finally { setSaving(false); }
    }} />
  </section>;
}