import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  modulo?: string;
  actions?: ReactNode;
}

export function PageHeader({ titulo, descripcion, modulo, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {modulo ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{modulo}</p>
        ) : null}
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{titulo}</h1>
        {descripcion ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{descripcion}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
