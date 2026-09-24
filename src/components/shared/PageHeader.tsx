import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  modulo?: string;
  actions?: ReactNode;
}

export function PageHeader({ titulo, descripcion, modulo, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-0.5 h-8 w-8 shrink-0"
          aria-label="Volver"
          title="Volver"
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 space-y-1">
          {modulo ? (
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{modulo}</p>
          ) : null}
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{titulo}</h1>
          {descripcion ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{descripcion}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
