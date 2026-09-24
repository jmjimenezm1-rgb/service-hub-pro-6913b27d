import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export interface ViewerDoc {
  nombre: string;
  storage_path: string | null;
  mime_type?: string | null;
}

export function DocumentViewer({ doc, onClose }: { doc: ViewerDoc | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    setError(null);
    const path = doc?.storage_path;
    if (!path) return;
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return;
    }
    void supabase.storage
      .from("documentos")
      .createSignedUrl(path, 600)
      .then(({ data, error: e }) => {
        if (e || !data) setError(e?.message ?? "No se pudo abrir el archivo");
        else setUrl(data.signedUrl);
      });
  }, [doc]);

  const ref = `${doc?.mime_type ?? ""} ${doc?.storage_path ?? ""}`.toLowerCase();
  const isPdf = ref.includes("pdf");
  const isImage = /image\/|\.(png|jpe?g|gif|webp|svg)/.test(ref);

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{doc?.nombre}</SheetTitle>
          <SheetDescription>{doc?.mime_type ?? "Documento"}</SheetDescription>
        </SheetHeader>
        {!doc?.storage_path ? (
          <p className="text-sm text-muted-foreground">Este registro no tiene archivo adjunto.</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !url ? (
          <p className="text-sm text-muted-foreground">Cargando documento…</p>
        ) : (
          <>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Abrir
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={url} download={doc.nombre}>
                  <Download className="mr-1.5 h-4 w-4" /> Descargar
                </a>
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/30">
              {isPdf ? (
                <iframe src={url} title={doc.nombre} className="h-full min-h-[70vh] w-full" />
              ) : isImage ? (
                <img src={url} alt={doc.nombre} className="mx-auto max-h-[75vh] object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-10 text-sm text-muted-foreground">
                  <FileText className="h-10 w-10" />
                  Vista previa no disponible para este tipo. Usa Descargar.
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
