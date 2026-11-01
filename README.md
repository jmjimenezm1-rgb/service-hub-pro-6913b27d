# Service Hub Pro

Actúa como un arquitecto de software senior especializado en aplicaciones SaaS B2B multiempresa.

Diseña y desarrolla una aplicación web denominada ServiceHub cuyo objetivo sea gestionar una empresa que comercializa aplicaciones web bajo un modelo de pago por uso (Pay Per Use / SaaS).

La aplicación debe ser moderna, responsive, preparada para crecer mediante módulos independientes y construida siguiendo buenas prácticas de arquitectura.

En esta parte se construirán los módulos del 8 al 12. Los módulos del 1 al 7 se están construyendo  en otro proyecto alojado en https://github.com/jmjimenezm1-rgb/service-hub-pro. Estos nuevos módulos  se integrarán a posteriori, por lo que la aplicación debe estar preparada para hacer dicha integración. Los módulos e instrucciones no numerados deberán contemplarse en todos los módulos. Comenzar a construir los módulos del 8 al 12 considerando el mismo formato de los módulos ya construidos en el repositorio 

Objetivos

La aplicación permitirá gestionar completamente el ciclo de vida de los clientes:

Prospección

Alta

Contratación

Activación de servicios

Gestión de usuarios

Control del consumo

Facturación

Cobros

Renovaciones

Incidencias

Baja

Histórico

Debe estar preparada para soportar cientos de empresas clientes y miles de usuarios.

 

Arquitectura

Utiliza una arquitectura modular.

Cada módulo debe ser independiente.

Cada módulo tendrá:

tablas propias

API propia

componentes reutilizables

permisos

auditoría

historial

La navegación será mediante menú lateral.

 

Dashboard

Crear un dashboard con indicadores como:

Número de clientes

Clientes activos

Clientes en prueba

MRR

ARR

Facturación mensual

Facturación anual

Cobros pendientes

Clientes con impagos

Usuarios activos

Usuarios conectados hoy

Aplicaciones más utilizadas

Consumo por aplicación

Alertas

Renovaciones próximas

Gráficos temporales

 

Módulo CRM

Gestión de clientes.

Datos generales:

Razón social

Nombre comercial

NIF/CIF

Dirección

Provincia

País

Persona de contacto

Email

Teléfono

Web

Sector

Número de empleados

Estado

Fecha de alta

Fecha de baja

Observaciones

Etiquetas

Documentos asociados

Historial de actividad.

 

Módulo Aplicaciones

Gestionará todas las aplicaciones SaaS disponibles.

Cada aplicación tendrá:

Nombre

Descripción

Versión

Estado

Categoría

URL

Proveedor

Modelo de cobro

Precio base

Precio por usuario

Precio por uso

Límites

Documentación

API

Logo

Manual

Estado

 

Módulo Suscripciones

Cada cliente podrá contratar una o varias aplicaciones.

Cada suscripción tendrá:

Cliente

Aplicación

Fecha inicio

Fecha renovación

Estado

Modalidad

Número máximo de usuarios

Consumo contratado

Consumo real

Precio

Descuentos

Facturación

Periodicidad

Renovación automática

Observaciones

 

Módulo Usuarios

Cada cliente podrá crear múltiples usuarios.

Cada usuario tendrá:

Nombre

Apellidos

Email

Teléfono

Cargo

Departamento

Estado

Idioma

Zona horaria

Último acceso

Fecha de creación

Roles

Permisos

Aplicaciones autorizadas

Historial de accesos

Autenticación multifactor

Posibilidad de desactivar usuarios.

 

Gestión de permisos

Implementar control RBAC.

Roles del sistema:

Administrador General

Administrador Comercial

Administrador Financiero

Administrador Técnico

Soporte

Cliente Administrador

Usuario Cliente

Cada rol tendrá permisos independientes.

 

Gestión del uso

Registrar automáticamente el consumo.

Por ejemplo:

Número de accesos

Tiempo de utilización

Consultas realizadas

Documentos procesados

Tokens utilizados

Almacenamiento

Llamadas API

Licencias ocupadas

Costes asociados

Permitir definir métricas distintas para cada aplicación.

Notificaciones

Sistema centralizado.

Enviar:

Emails

Notificaciones internas

Recordatorios

Avisos de renovación

Avisos de impago

Avisos de consumo

Alertas administrativas.

 

 

 

Motor de facturación

Crear un sistema de facturación configurable.

Debe soportar:

Pago por usuario

Pago por consumo

Pago fijo

Modelos híbridos

Bonificaciones

Descuentos

Cupones

Promociones

Facturación mensual

Trimestral

Semestral

Anual

Generación automática de facturas

Facturas rectificativas

Abonos

Notas de crédito

Exportación PDF

Exportación Excel

 

Cobros

Gestión completa de cobros.

Estado:

Pendiente

Cobrado

Devuelto

Cancelado

Impagado

Métodos:

Transferencia

Tarjeta

SEPA

PayPal

Stripe

Domiciliación

Registrar fechas.

Conciliación.

Avisos automáticos.

 

Módulo Financiero

Preparar un ERP ligero.

Debe incluir:

Plan contable

Asientos

Diario

Mayor

Balances

Cuenta de pérdidas y ganancias

Tesorería

Caja

Bancos

IVA

Retenciones

Modelos fiscales

Clientes

Proveedores

Gastos

Ingresos

Centros de coste

Presupuestos

Amortizaciones

Conciliación bancaria

Exportación para asesoría.

Este módulo debe quedar preparado aunque inicialmente solo se implementen las funcionalidades básicas.

 

Gestión documental

Permitir almacenar:

Contratos

Facturas

Presupuestos

Licencias

Documentación

PDF

Imágenes

Emails

Versionado.

 

Soporte

Crear módulo de tickets.

Estados:

Abierto

En progreso

Pendiente

Resuelto

Cerrado

Prioridades

Categorías

Comentarios

Adjuntos

Historial.

 

Auditoría

Registrar todas las operaciones.

Usuario

Fecha

Hora

IP

Cambio realizado

Valor anterior

Valor nuevo

Entidad modificada

Exportable.

 

Informes

Crear informes configurables.

Clientes

Facturación

Cobros

Consumo

Usuarios

Rentabilidad

Aplicaciones

Actividad

Histórico

Exportación:

PDF

Excel

CSV

 

Integraciones

Preparar conectores para:

Stripe

PayPal

Google Workspace

Microsoft 365

SMTP

OAuth

OpenID

REST API

Webhooks

Zapier

Make

Power Automate

 

API

Crear una API REST documentada.

Autenticación JWT.

Versionado.

Swagger/OpenAPI.

 

Base de datos

Diseñar un modelo relacional normalizado.

Todas las tablas deberán incluir:

id

uuid

created_at

updated_at

deleted_at

created_by

updated_by

Estado

Soft delete

Auditoría.

 

Seguridad

Autenticación multifactor.

JWT.

Control de sesiones.

Protección CSRF.

Rate limiting.

Logs.

Cifrado de datos sensibles.

Cumplimiento RGPD.

Consentimientos.

 

Interfaz

Diseño moderno.

Minimalista.

Muy rápido.

Tema claro y oscuro.

Buscador global.

Filtros avanzados.

Tablas con paginación.

Edición en línea.

Gráficos.

KPIs.

Panel configurable.

Responsive.

 

Escalabilidad

Toda la aplicación deberá diseñarse para incorporar nuevos módulos sin modificar los existentes.

Cada módulo será desacoplado.

Preparar arquitectura para futuras funcionalidades como:

Gestión comercial (pipeline de ventas).

Marketing y automatización de campañas.

Portal de clientes.

Portal de distribuidores.

Marketplace de aplicaciones.

Gestión de contratos electrónicos.

Firma digital.

Inteligencia de negocio (BI).

IA para predicción de ingresos, abandono de clientes (churn), recomendaciones de venta cruzada (cross-selling) y detección de anomalías.

Integración con sistemas ERP externos (como Sage, SAP, Holded, Odoo y Microsoft Dynamics).

Integración con pasarelas de pago adicionales.

Automatización de procesos mediante flujos de trabajo (workflows).

Por último, genera una primera versión completamente funcional con datos de ejemplo, una navegación intuitiva, componentes reutilizables y una estructura de código limpia, preparada para evolucionar hacia un producto SaaS comercial de nivel empresarial.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f22c0a42-faa6-4702-ba7b-2918017eebc5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
