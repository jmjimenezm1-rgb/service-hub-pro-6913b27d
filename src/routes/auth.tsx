import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso | ServiceHub" },
      {
        name: "description",
        content: "Accede a ServiceHub para gestionar facturación, cobros, finanzas y soporte.",
      },
      { property: "og:title", content: "Acceso | ServiceHub" },
      { property: "og:description", content: "Entra en tu plataforma de gestión SaaS ServiceHub." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      modulo: "auth",
      entidad: "login",
      accion: "login",
      valorNuevo: { email },
    });
    navigate({ to: "/dashboard", replace: true });
  }

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-display text-base font-bold text-primary-foreground">
            SH
          </span>
          <h1 className="font-display text-2xl font-semibold">ServiceHub</h1>
          <p className="text-sm text-muted-foreground">
            Gestión SaaS multiempresa · Pay Per Use
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acceso a la plataforma</CardTitle>
            <CardDescription>
              Introduce tus credenciales corporativas para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form className="space-y-4" onSubmit={login}>
                  <Field
                    email={email}
                    password={password}
                    setEmail={setEmail}
                    setPassword={setPassword}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Accediendo…" : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form className="space-y-4" onSubmit={signup}>
                  <Field
                    email={email}
                    password={password}
                    setEmail={setEmail}
                    setPassword={setPassword}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creando…" : "Crear cuenta"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Las cuentas nuevas no tienen rol asignado hasta que un administrador lo
                    concede.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
    </>
  );
}
