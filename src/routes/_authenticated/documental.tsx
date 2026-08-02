import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { bytes, fecha, label } from "@/lib/format";

interface DocRow {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  version: number;
  tamano_bytes: number | null;
  created_at: string;
  clients: { razon_social: string } | null;
  invoices: { numero: string } | null;
}

export const Route = createFileRoute("/_authenticated/documental")({
  head: () => ({
    meta: [
      { title: "Gestión documental | ServiceHub" },
      {
        name: "description",
        content: "Repositorio documental con versionado y vinculación a clientes y facturas.",
      },
      { property: "og:title", content: "Gestión documental | ServiceHub" },
      {
        property: "og:description",
        content: "Contratos, facturas y documentación operativa versionada.",
      },
    ],
  }),
  component: DocumentalPage,
});

function DocumentalPage() {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documental", "documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, nombre, tipo, estado, version, tamano_bytes, created_at, clients(razon_social), invoices(numero)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocRow[];
    },
  });

  const columns: Column<DocRow>[] = [
    {
      key: "nombre",
      header: "Documento",
      value: (r) => r.nombre,
      render: (r) => <span className="font-medium">{r.nombre}</span>,
    },
    { key: "tipo", header: "Tipo", value: (r) => r.tipo, render: (r) => label(r.tipo) },
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
      key: "version",
      header: "Versión",
      value: (r) => r.version,
      render: (r) => <span className="tabular">v{r.version}</span>,
    },
    {
      key: "tamano",
      header: "Tamaño",
      className: "text-right",
      value: (r) => r.tamano_bytes ?? 0,
      render: (r) => <span className="tabular">{bytes(r.tamano_bytes)}</span>,
    },
    {
      key: "fecha",
      header: "Alta",
      value: (r) => r.created_at,
      render: (r) => fecha(r.created_at),
    },
    {
      key: "estado",
      header: "Estado",
      value: (r) => r.estado,
      render: (r) => <StatusBadge value={r.estado} />,
    },
  ];

  const totalBytes = docs.reduce((a, d) => a + Number(d.tamano_bytes ?? 0), 0);

  return (
    <>
      <PageHeader
        modulo="Módulo 11"
        titulo="Gestión documental"
        descripcion="Documentos versionados y vinculados a clientes, contratos y facturas."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard titulo="Documentos" valor={String(docs.length)} icon={FolderKanban} />
        <KpiCard titulo="Almacenamiento" valor={bytes(totalBytes)} icon={FolderKanban} tone="info" />
        <KpiCard
          titulo="Archivados"
          valor={String(docs.filter((d) => d.estado === "archivado").length)}
          icon={FolderKanban}
          tone="warning"
        />
      </div>

      <DataTable
        data={docs}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Buscar documento…"
        onExport={() => exportCsv("documentos", docs, columns)}
      />
    </>
  );
}
