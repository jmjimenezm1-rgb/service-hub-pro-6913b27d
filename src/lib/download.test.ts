import { test } from "node:test";
import assert from "node:assert/strict";
import { deliverFile, downloadBlob } from "./download";

test("la descarga adjunta el enlace y mantiene la URL durante 30 segundos", () => {
  const saved = Object.getOwnPropertyDescriptors(globalThis);
  const events: string[] = [];
  let cleanup: (() => void) | undefined;
  const link = { href: "", download: "", click: () => events.push("click"), remove: () => events.push("remove") };
  try {
    Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => link, body: { appendChild: () => events.push("append") } } });
    Object.defineProperty(globalThis, "URL", { configurable: true, value: { createObjectURL: () => "blob:report", revokeObjectURL: () => events.push("revoke") } });
    Object.defineProperty(globalThis, "setTimeout", { configurable: true, value: (fn: () => void, delay: number) => { assert.equal(delay, 30_000); cleanup = fn; } });
    downloadBlob(new Blob(["report"]), "report.csv");
    assert.equal(link.download, "report.csv");
    assert.deepEqual(events, ["append", "click", "remove"]);
    cleanup?.();
    assert.deepEqual(events, ["append", "click", "remove", "revoke"]);
  } finally {
    for (const key of ["document", "URL", "setTimeout"]) {
      const descriptor = saved[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test("en dispositivos táctiles entrega el archivo a la opción nativa de guardar", async () => {
  const saved = Object.getOwnPropertyDescriptors(globalThis);
  let sharedFile: File | undefined;
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { matchMedia: () => ({ matches: true }) } });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { canShare: () => true, share: async ({ files }: { files: File[] }) => { sharedFile = files[0]; } } });
    await deliverFile(new Blob(["PDF"], { type: "application/pdf" }), "centros.pdf");
    assert.equal(sharedFile?.name, "centros.pdf");
    assert.equal(sharedFile?.type, "application/pdf");
    assert.equal(await sharedFile?.text(), "PDF");
  } finally {
    for (const key of ["window", "navigator"]) {
      const descriptor = saved[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});