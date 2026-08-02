import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, FileText, FolderKanban, LifeBuoy, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MODULES } from "@/lib/modules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ServiceHub · Gestión SaaS Pay Per Use" },
      {
        name: "description",
        content:
          "ServiceHub centraliza facturación, cobros, contabilidad, documentación y soporte para empresas que comercializan aplicaciones web por uso.",
      },
      { property: "og:title", content: "ServiceHub · Gestión SaaS Pay Per Use" },
      {
        property: "og:description",
        content:
          "Plataforma B2B multiempresa para facturar, cobrar, contabilizar y dar soporte a tus aplicaciones SaaS.",
      },
    ],
  }),
  component: Landing,
});

const HIGHLIGHTS = [
  { icon: FileText, titulo: "Facturación", texto: "Series, cupones, IVA y rectificativas." },
  { icon: Wallet, titulo: "Cobros", texto: "Conciliación bancaria e impagos." },
  { icon: BarChart3, titulo: "Financiero", texto: "Asientos, cuentas y centros de coste." },
  { icon: FolderKanban, titulo: "Documental", texto: "Versionado y trazabilidad." },
  { icon: LifeBuoy, titulo: "Soporte", texto: "Tickets con SLA y comentarios." },
];

function Landing() {
  const locales = MODULES.filter((m) => m.origen === "local");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground">
              SH
            </span>
            <span className="font-display text-base font-semibold">ServiceHub</span>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Acceder</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            SaaS B2B multiempresa
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            El back office de tu negocio de aplicaciones de pago por uso
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            ServiceHub reúne los módulos 8 al 12 de la suite: motor de facturación, cobros,
            financiero, gestión documental y soporte. Preparado para integrarse con los módulos
            comerciales y de plataforma existentes.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Entrar a la plataforma <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-5">
          {HIGHLIGHTS.map((h) => (
            <Card key={h.titulo}>
              <CardContent className="space-y-2 p-5">
                <h.icon className="h-5 w-5 text-primary" />
                <h2 className="font-medium">{h.titulo}</h2>
                <p className="text-sm text-muted-foreground">{h.texto}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="pb-20">
          <h2 className="font-display text-xl font-semibold">Módulos incluidos</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locales.map((m) => (
              <li key={m.id} className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Módulo {m.numero}</p>
                <p className="font-medium">{m.nombre}</p>
                <p className="mt-1 text-sm text-muted-foreground">{m.descripcion}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        ServiceHub · Plataforma interna de gestión
      </footer>
    </div>
  );
}
