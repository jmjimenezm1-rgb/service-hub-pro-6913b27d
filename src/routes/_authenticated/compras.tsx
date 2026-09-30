import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, CheckCheck, Plus, Receipt, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { FormDialog, type Field } from "@/components/shared/FormDialog";
import { RowActions } from "@/components/shared/RowActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  PURCHASE_CATEGORIES,
  PURCHASE_STATES,
  calcPurchase,
  purchasesQuery,
  suppliersQuery,
  type PurchaseRow,
  type SupplierRow,
} from "@/modules/compras/api";
import { useCrud, type Payload } from "@/lib/crud";
import { nextCode } from "@/lib/numbering";
import { money, fecha, label } from "@/lib/format";

const ESTADOS_PROVEEDOR = ["activo", "inactivo", "borrador", "archivado"];

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras y gastos | ServiceHub" },
      {
        name: "description",
        content:
          "Registro de proveedores, facturas de compra y gastos por categoría y centro de coste.",
      },
      { property: "og:title", content: "Compras y gastos | ServiceHub" },
      {
        property: "og:description",
        content: "Controla el gasto de la empresa por proveedor, categoría y centro de coste.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComprasPage,
});

function ComprasPage() {
  const qc = useQueryClient();
  const { data: purchases = [], isLoading } = useQuery(purchasesQuery);
  const { data: suppliers = [] } = useQuery(suppliersQuery);

  const { data: centers = [] } = useQuery({
    queryKey: ["compras", "centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, codigo, nombre")
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["compras", "accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_accounts")
        .select("id, codigo, nombre, naturaleza")
        .is("deleted_at", null)
        .eq("naturaleza", "gasto")
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseRow | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);

  const purchaseCrud = useCrud("purchase_invoices", {
    modulo: "compras",
    entidad: "Factura de compra",
    invalidate: [["compras"], ["pagos"], ["dashboard"]],
  });
  const supplierCrud = useCrud("suppliers", {
    modulo: "compras",
    entidad: "Proveedor",
    invalidate: [["compras"]],
  });

  const fields: Field[] = useMemo(
    () => [
      {
        name: "numero",
        label: "Número interno",
        placeholder: "Se genera automáticamente",
        help: "Si lo dejas vacío se genera con el patrón definido en Parametrización.",
      },
      { name: "numero_proveedor", label: "Nº factura del proveedor" },
      {
        name: "supplier_id",
        label: "Proveedor",
        type: "select",
        required: true,
        options: suppliers.map((s) => ({ value: s.id, label: s.razon_social })),
      },
      { name: "concepto", label: "Concepto", required: true, full: true },
      {
        name: "categoria",
        label: "Categoría de gasto",
        type: "select",
        options: PURCHASE_CATEGORIES.map((c) => ({ value: c, label: label(c) })),
      },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        required: true,
        options: PURCHASE_STATES.map((s) => ({ value: s, label: label(s) })),
      },
      {
        name: "cost_center_id",
        label: "Centro de coste",
        type: "select",
        options: centers.map((c) => ({ value: c.id, label: `${c.codigo} · ${c.nombre}` })),
      },
      {
        name: "account_id",
        label: "Cuenta de gasto",
        type: "select",
        options: accounts.map((a) => ({ value: a.id, label: `${a.codigo} · ${a.nombre}` })),
      },
      { name: "fecha_emision", label: "Fecha de factura", type: "date", required: true },
      { name: "fecha_recepcion", label: "Fecha de recepción", type: "date" },
      { name: "fecha_vencimiento", label: "Fecha de vencimiento", type: "date" },
      { name: "base_imponible", label: "Base imponible (€)", type: "number", step: "0.01", required: true },
      { name: "iva_pct", label: "IVA (%)", type: "number", step: "0.01" },
      { name: "retencion", label: "Retención (€)", type: "number", step: "0.01" },
      { name: "notas", label: "Notas", type: "textarea" },
    ],
    [suppliers, centers, accounts],
  );

  const submit = async (values: Payload) => {
    const { iva, total } = calcPurchase(values);
    const payload: Payload = { ...values, iva, total };
    if (editing) {
      await purchaseCrud.update.mutateAsync({ id: editing.id, values: payload });
    } else {
      const numero =
        (values["numero"] ? String(values["numero"]) : null) ??
        (await nextCode("compra")) ??
        `COM-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(4, "0")}`;
      await purchaseCrud.create.mutateAsync({ ...payload, numero });
    }
    void qc.invalidateQueries({ queryKey: ["compras"] });
    setOpen(false);
    setEditing(null);
  };

  const columns: Column<PurchaseRow>[] = [
    {
      key: "numero",
      header: "Número",
      value: (r) => r.numero,
      render: (r) => (
        <span className="font-medium">
          {r.numero}
          {r.numero_proveedor ? (
            <span className="block text-xs text-muted-foreground">{r.numero_proveedor}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "proveedor",
      header: "Proveedor",
      value: (r) => r.suppliers?.razon_social ?? "",
      render: (r) => r.suppliers?.razon_social ?? "—",
    },
    { key: "concepto", header: "Concepto", value: (r) => r.concepto, render: (r) => r.concepto },
    {
      key: "categoria",
      header: "Categoría",
      value: (r) => r.categoria ?? "",
      render: (r) => (r.categoria ? label(r.categoria) : "—"),
    },
    {
      key: "centro",
      header: "Centro de coste",
      value: (r) => r.cost_centers?.nombre ?? "",
      render: (r) => r.cost_centers?.nombre ?? "—",
    },
    {
      key: "fecha",
      header: "Fecha",
      value: (r) => r.fecha_emision,
      render: (r) => fecha(r.fecha_emision),
    },
    {
      key: "total",
      header: "Total",
      className: "text-right",
      value: (r) => Number(r.total),
      render: (r) => <span className="tabular font-medium">{money(Number(r.total))}</span>,
    },
    {
      key: "pendiente",
      header: "Pendiente",
      className: "text-right",
      value: (r) => Number(r.total) - Number(r.pagado),
      render: (r) => (
        <span className="tabular">{money(Number(r.total) - Number(r.pagado))}</span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      value: (r) => r.estado,
      render: (r) => <StatusBadge value={r.estado} />,
    },
    {
      key: "acciones",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (r) => (
        <RowActions
          onEdit={() => {
            setEditing(r);
            setOpen(true);
          }}
          onDelete={() => purchaseCrud.remove.mutate(r.id)}
          deleteLabel={`¿Eliminar la factura de compra ${r.numero}?`}
          extra={[
            {
              label: "Marcar como recibida",
              icon: <Receipt className="h-4 w-4" />,
              onSelect: () =>
                purchaseCrud.update.mutate({ id: r.id, values: { estado: "recibida" } }),
              disabled: r.estado === "recibida",
            },
            {
              label: "Aprobar para pago",
              onSelect: () =>
                purchaseCrud.update.mutate({ id: r.id, values: { estado: "aprobada" } }),
              disabled: r.estado === "aprobada" || r.estado === "pagada",
            },
            {
              label: "Anular",
              onSelect: () =>
                purchaseCrud.update.mutate({ id: r.id, values: { estado: "anulada" } }),
              disabled: r.estado === "anulada",
            },
          ]}
        />
      ),
    },
  ];

  const supplierColumns: Column<SupplierRow>[] = [
    {
      key: "razon_social",
      header: "Proveedor",
      value: (r) => r.razon_social,
      render: (r) => <span className="font-medium">{r.razon_social}</span>,
    },
    { key: "nif", header: "NIF", value: (r) => r.nif ?? "", render: (r) => r.nif ?? "—" },
    {
      key: "categoria",
      header: "Categoría",
      value: (r) => r.categoria ?? "",
      render: (r) => (r.categoria ? label(r.categoria) : "—"),
    },
    { key: "email", header: "Email", value: (r) => r.email ?? "", render: (r) => r.email ?? "—" },
    {
      key: "telefono",
      header: "Teléfono",
      value: (r) => r.telefono ?? "",
      render: (r) => r.telefono ?? "—",
    },
    {
      key: "gasto",
      header: "Gasto acumulado",
      className: "text-right",
      value: (r) =>
        purchases.filter((p) => p.supplier_id === r.id).reduce((a, p) => a + Number(p.total), 0),
      render: (r) => (
        <span className="tabular">
          {money(
            purchases
              .filter((p) => p.supplier_id === r.id)
              .reduce((a, p) => a + Number(p.total), 0),
          )}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      value: (r) => r.estado,
      render: (r) => <StatusBadge value={r.estado} />,
    },
    {
      key: "acciones",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (r) => (
        <RowActions
          onEdit={() => {
            setEditingSupplier(r);
            setSupplierOpen(true);
          }}
          onDelete={() => supplierCrud.remove.mutate(r.id)}
          deleteLabel={`¿Eliminar el proveedor «${r.razon_social}»?`}
        />
      ),
    },
  ];

  const activos = purchases.filter((p) => p.estado !== "anulada");
  const gastoTotal = activos.reduce((a, p) => a + Number(p.total), 0);
  const pendientePago = activos.reduce((a, p) => a + Number(p.total) - Number(p.pagado), 0);

  const porCategoria = useMemo(() => {
    const map = new Map<string, { id: string; categoria: string; facturas: number; total: number }>();
    for (const p of activos) {
      const key = p.categoria ?? "sin categoría";
      const row = map.get(key) ?? { id: key, categoria: key, facturas: 0, total: 0 };
      row.facturas += 1;
      row.total += Number(p.total);
      map.set(key, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [activos]);

  return (
    <>
      <PageHeader
        modulo="Módulo 15"
        titulo="Compras y gastos"
        descripcion="Facturas de proveedor y gastos clasificados por categoría y centro de coste."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nueva factura de compra
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Gasto registrado" valor={money(gastoTotal)} icon={ShoppingCart} />
        <KpiCard
          titulo="Pendiente de pago"
          valor={money(pendientePago)}
          detalle={`${activos.filter((p) => Number(p.pagado) < Number(p.total)).length} facturas abiertas`}
          icon={Wallet}
          tone="warning"
        />
        <KpiCard
          titulo="Facturas de compra"
          valor={String(activos.length)}
          icon={Receipt}
          tone="info"
        />
        <KpiCard titulo="Proveedores" valor={String(suppliers.length)} icon={Building} />
      </div>

      <Tabs defaultValue="facturas">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:h-9 sm:w-auto">
          <TabsTrigger className="w-full whitespace-normal px-2 sm:w-auto sm:whitespace-nowrap sm:px-3" value="facturas">
            Facturas de compra
          </TabsTrigger>
          <TabsTrigger className="w-full whitespace-normal px-2 sm:w-auto sm:whitespace-nowrap sm:px-3" value="categorias">
            Gasto por categoría
          </TabsTrigger>
          <TabsTrigger className="col-span-2 w-full whitespace-normal px-2 sm:col-span-1 sm:w-auto sm:whitespace-nowrap sm:px-3" value="proveedores">
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="mt-4">
          <DataTable
            data={purchases}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Buscar por número, proveedor o concepto…"
            onExport={() => exportCsv("compras-y-gastos", purchases, columns)}
          />
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <DataTable
            data={porCategoria}
            columns={[
              {
                key: "categoria",
                header: "Categoría",
                value: (r) => r.categoria,
                render: (r) => label(r.categoria),
              },
              {
                key: "facturas",
                header: "Facturas",
                className: "text-right",
                value: (r) => r.facturas,
                render: (r) => <span className="tabular">{r.facturas}</span>,
              },
              {
                key: "total",
                header: "Gasto",
                className: "text-right",
                value: (r) => r.total,
                render: (r) => <span className="tabular font-medium">{money(r.total)}</span>,
              },
              {
                key: "peso",
                header: "% sobre el total",
                className: "text-right",
                value: (r) => (gastoTotal ? (r.total / gastoTotal) * 100 : 0),
                render: (r) => (
                  <span className="tabular">
                    {gastoTotal ? ((r.total / gastoTotal) * 100).toFixed(1) : "0.0"} %
                  </span>
                ),
              },
            ]}
            searchPlaceholder="Buscar categoría…"
          />
        </TabsContent>

        <TabsContent value="proveedores" className="mt-4">
          <DataTable
            data={suppliers}
            columns={supplierColumns}
            toolbar={
              <Button
                size="sm"
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nuevo proveedor
              </Button>
            }
            searchPlaceholder="Buscar proveedor…"
            onExport={() => exportCsv("proveedores", suppliers, supplierColumns)}
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? `Editar compra ${editing.numero}` : "Nueva factura de compra"}
        description="El IVA y el total se calculan automáticamente a partir de la base imponible."
        fields={fields}
        initial={
          (editing as unknown as Payload | null) ?? {
            estado: "recibida",
            iva_pct: 21,
            retencion: 0,
            fecha_emision: new Date().toISOString().slice(0, 10),
          }
        }
        submitting={purchaseCrud.saving}
        onSubmit={submit}
      />

      <FormDialog
        open={supplierOpen}
        onOpenChange={(o) => {
          setSupplierOpen(o);
          if (!o) setEditingSupplier(null);
        }}
        title={editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}
        description="Datos fiscales y de contacto del proveedor."
        fields={[
          { name: "razon_social", label: "Razón social", required: true, full: true },
          { name: "nombre_comercial", label: "Nombre comercial" },
          { name: "nif", label: "NIF / CIF" },
          { name: "email", label: "Email" },
          { name: "telefono", label: "Teléfono" },
          { name: "direccion", label: "Dirección", full: true },
          {
            name: "categoria",
            label: "Categoría",
            type: "select",
            options: PURCHASE_CATEGORIES.map((c) => ({ value: c, label: label(c) })),
          },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ESTADOS_PROVEEDOR.map((s) => ({ value: s, label: label(s) })),
          },
          { name: "observaciones", label: "Observaciones", type: "textarea" },
        ]}
        initial={(editingSupplier as unknown as Payload | null) ?? { estado: "activo" }}
        submitting={supplierCrud.saving}
        onSubmit={async (values) => {
          if (editingSupplier)
            await supplierCrud.update.mutateAsync({ id: editingSupplier.id, values });
          else await supplierCrud.create.mutateAsync(values);
          setSupplierOpen(false);
          setEditingSupplier(null);
        }}
      />
    </>
  );
}
