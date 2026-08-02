import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LifeBuoy } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { fecha } from "@/lib/format";

interface TicketRow {
  id: string;
  referencia: string;
  asunto: string;
  estado: string;
  prioridad: string;
  categoria: string | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
  clients: { razon_social: string } | null;
}

export const Route = createFileRoute("/_authenticated/soporte")({
  head: () => ({
    meta: [
      { title: "Soporte | ServiceHub" },
      {
        name: "description",
        content: "Mesa de soporte: tickets por prioridad, estado y cliente con seguimiento.",
      },
      { property: "og:title", content: "Soporte | ServiceHub" },
      {
        property: "og:description",
        content: "Gestiona incidencias y peticiones de tus clientes SaaS.",
      },
    ],
  }),
  component: SoportePage,
});

function SoportePage() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["soporte", "tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, referencia, asunto, estado, prioridad, categoria, fecha_apertura, fecha_cierre, clients(razon_social)",
        )
        .is("deleted_at", null)
        .order("fecha_apertura", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TicketRow[];
    },
  });

  const columns: Column<TicketRow>[] = [
    {
      key: "referencia",
      header: "Ref.",
      value: (r) => r.referencia,
      render: (r) => <span className="font-medium">{r.referencia}</span>,
    },
    { key: "asunto", header: "Asunto", value: (r) => r.asunto, render: (r) => r.asunto },
    {
      key: "cliente",
      header: "Cliente",
      value: (r) => r.clients?.razon_social ?? "",
      render: (r) => r.clients?.razon_social ?? "—",
    },
    {
      key: "categoria",
      header: "Categoría",
      value: (r) => r.categoria ?? "",
      render: (r) => r.categoria ?? "—",
    },
    {
      key: "prioridad",
      header: "Prioridad",
      value: (r) => r.prioridad,
      render: (r) => <StatusBadge value={r.prioridad} />,
    },
    {
      key: "apertura",
      header: "Apertura",
      value: (r) => r.fecha_apertura,
      render: (r) => fecha(r.fecha_apertura),
    },
    {
      key: "cierre",
      header: "Cierre",
      value: (r) => r.fecha_cierre ?? "",
      render: (r) => fecha(r.fecha_cierre),
    },
    {
      key: "estado",
      header: "Estado",
      value: (r) => r.estado,
      render: (r) => <StatusBadge value={r.estado} />,
    },
  ];

  const abiertos = tickets.filter((t) => t.estado === "abierto" || t.estado === "en_progreso");
  const criticos = tickets.filter((t) => t.prioridad === "critica");

  return (
    <>
      <PageHeader
        modulo="Módulo 12"
        titulo="Soporte y atención al cliente"
        descripcion="Tickets por cliente y aplicación, con prioridad, categoría y trazabilidad."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Tickets totales" valor={String(tickets.length)} icon={LifeBuoy} />
        <KpiCard
          titulo="Abiertos"
          valor={String(abiertos.length)}
          icon={LifeBuoy}
          tone="warning"
        />
        <KpiCard
          titulo="Críticos"
          valor={String(criticos.length)}
          icon={LifeBuoy}
          tone="destructive"
        />
      </div>

      <DataTable
        data={tickets}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Buscar ticket…"
        onExport={() => exportCsv("tickets", tickets, columns)}
      />
    </>
  );
}
