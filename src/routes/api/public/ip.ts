import { createFileRoute } from "@tanstack/react-router";

/**
 * Devuelve la IP pública desde la que se realiza la petición.
 * La usa el módulo de auditoría para registrar "desde dónde" se hizo cada
 * operación. No lee ni escribe datos de negocio.
 */
export const Route = createFileRoute("/api/public/ip")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = request.headers;
        const ip =
          headers.get("cf-connecting-ip") ??
          headers.get("x-real-ip") ??
          headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        return new Response(JSON.stringify({ ip }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
