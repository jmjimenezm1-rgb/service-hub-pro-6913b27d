import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Scale, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { money, fecha, label } from "@/lib/format";

interface EntryRow {
  id: string;
  numero: string;
  concepto: string;
  fecha: string;
  ejercicio: number;
  estado: string;
  journal_lines: { debe: number; haber: number }[];
  cost_centers: { nombre: string } | null;
}

export const Route = createFileRoute("/_authenticated/financiero")({
  head: () => ({
    meta: [
      { title: "Financiero | ServiceHub" },
      {
        name: "description",
        content: "Contabilidad: plan de cuentas, asientos contables y centros de coste.",
      },
      { property: "og:title", content: "Financiero | ServiceHub" },
      {
        property: "og:description",
        content: "Consulta asientos, cuentas contables y centros de coste de la empresa.",
      },
    ],
  }),
  component: FinancieroPage,
});

function FinancieroPage() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["financiero", "entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, numero, concepto, fecha, ejercicio, estado, journal_lines(debe, haber), cost_centers(nombre)")
        .is("deleted_at", null)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EntryRow[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["financiero", "accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ledger_accounts")
        .select("*")
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: centers = [] } = useQuery({
    queryKey: ["financiero", "centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data ?? [];
    },
  });

  const debe = entries.reduce(
    (a, e) => a + e.journal_lines.reduce((s, l) => s + Number(l.debe), 0),
    0,
  );
  const haber = entries.reduce(
    (a, e) => a + e.journal_lines.reduce((s, l) => s + Number(l.haber), 0),
    0,
  );

  const columns: Column<EntryRow>[] = [
    {
      key: "numero",
      header: "Asiento",
      value: (r) => r.numero,
      render: (r) => <span className="font-medium">{r.numero}</span>,
    },
    { key: "fecha", header: "Fecha", value: (r) => r.fecha, render: (r) => fecha(r.fecha) },
    {
      key: "concepto",
      header: "Concepto",
      value: (r) => r.concepto,
      render: (r) => r.concepto,
    },
    {
      key: "centro",
      header: "Centro de coste",
      value: (r) => r.cost_centers?.nombre ?? "",
      render: (r) => r.cost_centers?.nombre ?? "—",
    },
    {
      key: "debe",
      header: "Debe",
      className: "text-right",
      value: (r) => r.journal_lines.reduce((s, l) => s + Number(l.debe), 0),
      render: (r) => (
        <span className="tabular">
          {money(r.journal_lines.reduce((s, l) => s + Number(l.debe), 0))}
        </span>
      ),
    },
    {
      key: "haber",
      header: "Haber",
      className: "text-right",
      value: (r) => r.journal_lines.reduce((s, l) => s + Number(l.haber), 0),
      render: (r) => (
        <span className="tabular">
          {money(r.journal_lines.reduce((s, l) => s + Number(l.haber), 0))}
        </span>
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
        modulo="Módulo 10"
        titulo="Gestión financiera"
        descripcion="Plan contable, asientos por partida doble y centros de coste."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Total debe" valor={money(debe)} icon={BookOpen} />
        <KpiCard titulo="Total haber" valor={money(haber)} icon={Wallet} tone="info" />
        <KpiCard
          titulo="Descuadre"
          valor={money(debe - haber)}
          detalle={debe === haber ? "Contabilidad cuadrada" : "Revisar asientos"}
          icon={Scale}
          tone={debe === haber ? "success" : "destructive"}
        />
      </div>

      <Tabs defaultValue="asientos">
        <TabsList>
          <TabsTrigger value="asientos">Asientos</TabsTrigger>
          <TabsTrigger value="cuentas">Plan de cuentas</TabsTrigger>
          <TabsTrigger value="centros">Centros de coste</TabsTrigger>
        </TabsList>

        <TabsContent value="asientos" className="mt-4">
          <DataTable
            data={entries}
            columns={columns}
            loading={isLoading}
            searchPlaceholder="Buscar asiento…"
            onExport={() => exportCsv("asientos", entries, columns)}
          />
        </TabsContent>

        <TabsContent value="cuentas" className="mt-4">
          <DataTable
            data={accounts}
            columns={[
              { key: "codigo", header: "Código", value: (r) => r.codigo, render: (r) => r.codigo },
              { key: "nombre", header: "Cuenta", value: (r) => r.nombre, render: (r) => r.nombre },
              {
                key: "naturaleza",
                header: "Naturaleza",
                value: (r) => r.naturaleza,
                render: (r) => label(r.naturaleza),
              },
              {
                key: "estado",
                header: "Estado",
                value: (r) => r.estado,
                render: (r) => <StatusBadge value={r.estado} />,
              },
            ]}
            searchPlaceholder="Buscar cuenta…"
          />
        </TabsContent>

        <TabsContent value="centros" className="mt-4">
          <DataTable
            data={centers}
            columns={[
              { key: "codigo", header: "Código", value: (r) => r.codigo, render: (r) => r.codigo },
              { key: "nombre", header: "Nombre", value: (r) => r.nombre, render: (r) => r.nombre },
              {
                key: "descripcion",
                header: "Descripción",
                value: (r) => r.descripcion ?? "",
                render: (r) => r.descripcion ?? "—",
              },
              {
                key: "estado",
                header: "Estado",
                value: (r) => r.estado,
                render: (r) => <StatusBadge value={r.estado} />,
              },
            ]}
            searchPlaceholder="Buscar centro…"
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
