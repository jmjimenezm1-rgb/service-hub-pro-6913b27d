import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable, exportCsv, type Column } from "@/components/shared/DataTable";
import { FormDialog } from "@/components/shared/FormDialog";
import { RowActions } from "@/components/shared/RowActions";
import { Button } from "@/components/ui/button";
import { DocumentViewer, type ViewerDoc } from "@/components/shared/DocumentViewer";
import { supabase } from "@/integrations/supabase/client";
import { clientsQuery, toOptions } from "@/modules/common/api";
import { useCrud, type Payload } from "@/lib/crud";
import { bytes, fecha, label } from "@/lib/format";

interface DocRow {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  descripcion: string | null;
  version: number;
  tamano_bytes: number | null;
  storage_path: string | null;
  mime_type: string | null;
  client_id: string | null;
  invoice_id: string | null;
  created_at: string;
  clients: { razon_social: string } | null;
  invoices: { numero: string } | null;
}

const TIPOS = [
  "contrato",
  "factura",
  "presupuesto",
  "licencia",
  "documentacion",
  "imagen",
  "email",
  "otro",
];
const ESTADOS = ["activo", "borrador", "inactivo", "archivado"];

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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payload | null>(null);
  const [viewing, setViewing] = useState<ViewerDoc | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documental", "documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          "id, nombre, tipo, estado, descripcion, version, tamano_bytes, storage_path, mime_type, client_id, invoice_id, created_at, clients(razon_social), invoices(numero)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocRow[];
    },
  });

  const { data: clients = [] } = useQuery(clientsQuery);
  const { data: invoices = [] } = useQuery({
    queryKey: ["documental", "invoice-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, numero")
        .is("deleted_at", null)
        .order("numero");
      if (error) throw error;
      return data ?? [];
    },
  });

  const crud = useCrud("documents", {
    modulo: "documental",
    entidad: "Documento",
    invalidate: [["documental"]],
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
    {
      key: "acciones",
      header: "",
      sortable: false,
      className: "w-12 text-right",
      render: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
        <RowActions
          onEdit={() => {
            setEditing(r as unknown as Payload);
            setOpen(true);
          }}
          onDelete={() => crud.remove.mutate(r.id)}
          deleteLabel={`¿Eliminar «${r.nombre}»?`}
          extra={[
            {
              label: "Nueva versión",
              icon: <FolderKanban className="h-4 w-4" />,
              onSelect: () =>
                crud.create.mutate({
                  nombre: r.nombre,
                  tipo: r.tipo,
                  descripcion: r.descripcion,
                  estado: r.estado,
                  client_id: r.client_id,
                  invoice_id: r.invoice_id,
                  storage_path: r.storage_path,
                  tamano_bytes: r.tamano_bytes,
                  parent_document_id: r.id,
                  version: Number(r.version) + 1,
                }),
            },
            {
              label: r.estado === "archivado" ? "Desarchivar" : "Archivar",
              onSelect: () =>
                crud.update.mutate({
                  id: r.id,
                  values: { estado: r.estado === "archivado" ? "activo" : "archivado" },
                }),
            },
          ]}
        />
        </div>
      ),
    },
  ];

  const totalBytes = docs.reduce((a, d) => a + Number(d.tamano_bytes ?? 0), 0);

  return (
    <>
      <PageHeader
        modulo="Módulo 11"
        titulo="Gestión documental"
        descripcion="Documentos versionados y vinculados a clientes, contratos y facturas."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo documento
          </Button>
        }
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
        onRowClick={(r) => setViewing(r)}
        onExport={() => exportCsv("documentos", docs, columns)}
      />

      <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />

      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        title={editing ? "Editar documento" : "Nuevo documento"}
        description="Registra los metadatos del documento y vincúlalo a un cliente o factura."
        fields={[
          { name: "nombre", label: "Nombre", required: true, full: true },
          {
            name: "tipo",
            label: "Tipo",
            type: "select",
            required: true,
            options: TIPOS.map((t) => ({ value: t, label: label(t) })),
          },
          {
            name: "estado",
            label: "Estado",
            type: "select",
            required: true,
            options: ESTADOS.map((s) => ({ value: s, label: label(s) })),
          },
          { name: "client_id", label: "Cliente", type: "select", options: toOptions(clients) },
          {
            name: "invoice_id",
            label: "Factura",
            type: "select",
            options: invoices.map((i) => ({ value: i.id, label: i.numero })),
          },
          {
            name: "archivo",
            label: "Archivo adjunto",
            type: "file",
            full: true,
            help: "El archivo se almacena de forma privada y queda asociado a esta línea documental.",
          },
          { name: "storage_path", label: "Ruta / enlace", full: true },
          { name: "mime_type", label: "Tipo MIME", placeholder: "application/pdf" },
          { name: "tamano_bytes", label: "Tamaño (bytes)", type: "number" },
          { name: "version", label: "Versión", type: "number", required: true },
          { name: "descripcion", label: "Descripción", type: "textarea" },
        ]}
        initial={editing ?? { version: 1, estado: "activo" }}
        submitting={crud.saving}
        onSubmit={async (values) => {
          const { archivo, ...rest } = values as Payload & { archivo?: unknown };
          const payload: Payload = { ...rest };

          if (archivo instanceof File) {
            const safe = archivo.name.replace(/[^\w.-]/g, "_");
            const path = `adjuntos/${Date.now()}-${safe}`;
            const { error } = await supabase.storage
              .from("documentos")
              .upload(path, archivo, {
                contentType: archivo.type || "application/octet-stream",
                upsert: true,
              });
            if (error) {
              toast.error(`No se pudo subir el archivo: ${error.message}`);
              return;
            }
            payload["storage_path"] = path;
            payload["mime_type"] = archivo.type || null;
            payload["tamano_bytes"] = archivo.size;
            if (!payload["nombre"]) payload["nombre"] = archivo.name;
          }

          if (editing) await crud.update.mutateAsync({ id: String(editing["id"]), values: payload });
          else await crud.create.mutateAsync(payload);
          setOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
