import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { label } from "@/lib/format";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "muted";

const TONES: Record<string, Tone> = {
  // estados generales
  activo: "success",
  inactivo: "muted",
  borrador: "muted",
  archivado: "muted",
  // facturas
  emitida: "info",
  enviada: "info",
  pagada: "success",
  parcial: "warning",
  vencida: "danger",
  anulada: "muted",
  // cobros
  pendiente: "warning",
  cobrado: "success",
  devuelto: "danger",
  cancelado: "muted",
  impagado: "danger",
  // tickets
  abierto: "info",
  en_progreso: "warning",
  resuelto: "success",
  cerrado: "muted",
  // prioridades
  baja: "muted",
  media: "info",
  alta: "warning",
  critica: "danger",
  // tipos de factura
  ordinaria: "neutral",
  rectificativa: "warning",
  abono: "info",
  nota_credito: "info",
};

const CLASSES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground border-transparent",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/20 text-warning border-warning/35",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  muted: "bg-muted text-muted-foreground border-transparent",
};

export function StatusBadge({
  value,
  className,
  label: custom,
}: {
  value: string | null;
  className?: string;
  label?: string;
}) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const tone = TONES[value] ?? "neutral";
  return (
    <Badge variant="outline" className={cn("font-medium", CLASSES[tone], className)}>
      {custom ?? label(value)}
    </Badge>
  );
}
