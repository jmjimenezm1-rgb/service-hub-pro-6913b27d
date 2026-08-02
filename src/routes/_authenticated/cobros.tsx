import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Banknote, CircleAlert } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { paymentsQuery, type PaymentRow } from "@/modules/cobros/api";
import { money, fecha, label } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cobros")({
  head: () => ({
    meta: [
      { title: "Cobros | ServiceHub" },
      {
        name: "description",
        content: "Gestión de cobros, métodos de pago, conciliación bancaria e impagos.",
      },
      { property: "og:title", content: "Cobros | ServiceHub" },
      {
        property: "og:description",
        content: "Controla cobros, conciliación y saldos pendientes de tus clientes.",
      },
    ],
  }),
  component: CobrosPage,
});

function CobrosPage() {
  const { data: payments = [], isLoading } = useQuery(paymentsQuery);

  const cobrado = payments
    .filter((p) => p.estado === "cobrado")
    .reduce((a, p) => a + Number(p.importe), 0);
  const pendientes = payments.filter((p) => p.estado === "pendiente");
  const impagados = payments.filter((p) => p.estado === "impagado" || p.estado === "devuelto");

  const columns: Column<PaymentRow>[] = [
    {
      key: "referencia",
      header: "Referencia",
      value: (r) => r.referencia,
      render: (r) => <span className="font-medium">{r.referencia}</span>,
    },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.clients?.razon_social ?? "",
      render: (r) => r.clients?.razon_social ?? "—",
    },
    {
      key: "factura",
      header: "Factura",
      value: (r) => r.invoices?.numero ?? "",
      render: (r) => r.invoices?.numero ?? "—",
    },
    {
      key: "metodo",
      header: "Método",
      value: (r) => r.metodo,
      render: (r) => label(r.metodo),
    },
    {
      key: "fecha",
      header: "Fecha",
      value: (r) => r.fecha_pago,
      render: (r) => fecha(r.fecha_pago),
    },
    {
      key: "importe",
      header: "Importe",
      value: (r) => Number(r.importe),
      className: "text-right",
      render: (r) => <span className="tabular font-medium">{money(Number(r.importe))}</span>,
    },
    {
      key: "conciliado",
      header: "Conciliación",
      value: (r) => (r.conciliado ? "conciliado" : "pendiente"),
      render: (r) =>
        r.conciliado ? (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <BadgeCheck className="h-4 w-4" /> {fecha(r.fecha_conciliacion)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Sin conciliar</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      value: (r) => r.estado,
      render: (r) => <StatusBadge value={r.estado} />,
    },
  ];

  return (
    <>
      <PageHeader
        modulo="Módulo 9"
        titulo="Gestión de cobros"
        descripcion="Registro de cobros por método de pago, conciliación bancaria y seguimiento de impagos."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Cobrado" valor={money(cobrado)} icon={Banknote} tone="success" />
        <KpiCard
          titulo="Pendiente"
          valor={money(pendientes.reduce((a, p) => a + Number(p.importe), 0))}
          detalle={`${pendientes.length} cobros`}
          icon={Banknote}
          tone="warning"
        />
        <KpiCard
          titulo="Impagados / devueltos"
          valor={money(impagados.reduce((a, p) => a + Number(p.importe), 0))}
          detalle={`${impagados.length} incidencias`}
          icon={CircleAlert}
          tone="destructive"
        />
      </div>

      <DataTable
        data={payments}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Buscar por referencia, cliente o factura…"
        onExport={() => exportCsv("cobros", payments, columns)}
      />
    </>
  );
}
