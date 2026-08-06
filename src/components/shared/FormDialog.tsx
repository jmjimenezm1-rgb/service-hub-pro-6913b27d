import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Payload } from "@/lib/crud";

export interface FieldOption {
  value: string;
  label: string;
}

export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "switch" | "file" | undefined;
  accept?: string | undefined;
  options?: FieldOption[] | undefined;
  required?: boolean | undefined;
  placeholder?: string | undefined;
  step?: string | undefined;
  full?: boolean | undefined;
  help?: string | undefined;
}

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: Field[];
  initial?: Payload | null;
  submitting?: boolean;
  submitLabel?: string;
  extra?: ReactNode;
  onSubmit: (values: Payload) => void | Promise<void>;
}

function seed(fields: Field[], initial?: Payload | null): Payload {
  const values: Payload = {};
  for (const f of fields) {
    const raw = initial?.[f.name];
    if (f.type === "switch") values[f.name] = Boolean(raw);
    else if (f.type === "file") values[f.name] = null;
    else values[f.name] = raw === null || raw === undefined ? "" : String(raw);
  }
  return values;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  submitting,
  submitLabel = "Guardar",
  extra,
  onSubmit,
}: FormDialogProps) {
  const [values, setValues] = useState<Payload>(() => seed(fields, initial));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(seed(fields, initial));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (name: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const missing = fields.find(
      (f) => f.required && (values[f.name] === "" || values[f.name] === null),
    );
    if (missing) {
      setError(`El campo «${missing.label}» es obligatorio.`);
      return;
    }
    const parsed: Payload = {};
    for (const f of fields) {
      const raw = values[f.name];
      if (f.type === "switch") parsed[f.name] = Boolean(raw);
      else if (f.type === "file") parsed[f.name] = raw ?? null;
      else if (f.type === "number") parsed[f.name] = raw === "" ? null : Number(raw);
      else parsed[f.name] = raw === "" ? null : raw;
    }
    setError(null);
    await onSubmit(parsed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={cn("space-y-1.5", (field.full || field.type === "textarea") && "sm:col-span-2")}
              >
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>

                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    value={String(values[field.name] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(e) => set(field.name, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={String(values[field.name] ?? "")}
                    onValueChange={(v) => set(field.name, v)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder={field.placeholder ?? "Selecciona…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "switch" ? (
                  <div className="flex h-9 items-center">
                    <Switch
                      id={field.name}
                      checked={Boolean(values[field.name])}
                      onCheckedChange={(v) => set(field.name, v)}
                    />
                  </div>
                ) : field.type === "file" ? (
                  <Input
                    id={field.name}
                    type="file"
                    accept={field.accept}
                    className="cursor-pointer file:mr-3 file:text-sm file:text-muted-foreground"
                    onChange={(e) => set(field.name, e.target.files?.[0] ?? null)}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    step={field.step}
                    value={String(values[field.name] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(e) => set(field.name, e.target.value)}
                  />
                )}
                {field.help ? (
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                ) : null}
              </div>
            ))}
          </div>

          {extra}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
