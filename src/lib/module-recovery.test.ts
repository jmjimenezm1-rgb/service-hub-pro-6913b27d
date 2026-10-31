import { test } from "node:test";
import assert from "node:assert/strict";
import { isModuleLoadError, recoverModuleLoad } from "./module-recovery";

test("identifica fallos de carga de módulos sin confundir errores de negocio", () => {
  assert.equal(isModuleLoadError(new TypeError("Importing a module script failed.")), true);
  assert.equal(isModuleLoadError(new TypeError("Failed to fetch dynamically imported module: /assets/page.js")), true);
  assert.equal(isModuleLoadError(new Error("No se pudo guardar la factura")), false);
});

test("recarga una sola vez para evitar una pantalla atrapada en recargas", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  let reloads = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }, location: { reload: () => reloads++ } } });
  try {
    assert.equal(recoverModuleLoad(new Error("Importing a module script failed.")), true);
    assert.equal(recoverModuleLoad(new Error("Importing a module script failed.")), false);
    assert.equal(reloads, 1);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});