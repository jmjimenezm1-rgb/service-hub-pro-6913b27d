import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Valor usado para ordenar y buscar. */
  value?: (row: T) => string | number;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  onExport?: () => void;
  toolbar?: ReactNode;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading,
  pageSize = 10,
  searchPlaceholder = "Buscar…",
  emptyMessage = "No hay registros.",
  onRowClick,
  onExport,
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = data;
    if (q) {
      rows = rows.filter((row) =>
        columns.some((col) => String(col.value?.(row) ?? "").toLowerCase().includes(q)),
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.value) {
        rows = [...rows].sort((a, b) => {
          const av = col.value!(a);
          const bv = col.value!(b);
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv), "es");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, columns, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages - 1);
  const rows = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {onExport ? (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-1.5 h-4 w-4" />
              Exportar CSV
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={cn("whitespace-nowrap", col.className)}>
                  {col.sortable !== false && col.value ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() =>
                        setSort((prev) =>
                          prev?.key === col.key
                            ? { key: col.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                            : { key: col.key, dir: "asc" },
                        )
                      }
                    >
                      {col.header}
                      <ArrowUpDown className="h-3 w-3 opacity-60" />
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("py-3", col.className)}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </Button>
          <span className="tabular">
            {current + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current >= totalPages - 1}
            onClick={() => setPage(current + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Exportación CSV reutilizable por todos los módulos. */
export function exportCsv<T>(filename: string, rows: T[], columns: Column<T>[]) {
  const header = columns.map((c) => `"${c.header}"`).join(";");
  const body = rows
    .map((row) =>
      columns.map((c) => `"${String(c.value?.(row) ?? "").replace(/"/g, '""')}"`).join(";"),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
