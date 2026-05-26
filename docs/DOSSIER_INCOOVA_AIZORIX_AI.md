# DOSSIER DE PROYECTO — AIZORIX AI

### Entrega para Incoova / Ayuntamiento de Murcia

> Documento dirigido al comité técnico y de innovación para presentar el estado, la viabilidad y el plan de continuidad del proyecto **Aizorix AI**, una plataforma de automatización e inteligencia artificial para PYMEs.
>
> **Versión:** 1.0 · **Fecha:** mayo 2026 · **Estado:** PMV funcional operativo.

---

## Resumen ejecutivo (1 minuto)

Aizorix AI es un **recepcionista virtual con inteligencia artificial** que atiende los mensajes de WhatsApp de un negocio 24/7: responde dudas, informa de precios, **capta al cliente potencial y le reserva la cita automáticamente** — sin intervención humana. Lo que hoy se pierde fuera de horario o cuando nadie contesta el teléfono, Aizorix lo convierte en una reserva confirmada y registrada en el CRM.

El producto **ya está construido y operativo** como Producto Mínimo Viable: arquitectura SaaS multiempresa, motor de IA conectado a OpenAI, motor de reservas con prevención de duplicados, CRM con persistencia real y panel de control completo. La cobertura de pruebas automatizadas supera los **285 tests** en verde.

Buscamos apoyo institucional y de inversión para completar la conexión de WhatsApp en producción, integrar la agenda con Google Calendar y escalar la captación comercial a los sectores prioritarios del tejido empresarial de Murcia.

---

## 1. Información General del Proyecto

### 1.1 El problema que resuelve Aizorix AI

Las PYMEs de servicios (clínicas estéticas, dentistas, peluquerías, talleres, gimnasios, inmobiliarias, restaurantes…) **pierden clientes cada día** por tres motivos recurrentes:

- **No contestan a tiempo.** El 60–70 % de las consultas llegan por WhatsApp fuera del horario en que hay alguien para responder. Un lead que no recibe respuesta en minutos se va a la competencia.
- **La recepción está saturada.** El personal atiende presencialmente, al teléfono y al móvil a la vez; los mensajes se acumulan y las reservas se escapan.
- **No hay registro.** Las conversaciones quedan en el móvil personal de alguien; no hay CRM, no hay seguimiento, no hay datos.

El resultado: **leads perdidos, agenda infrautilizada e ingresos que no se materializan.**

### 1.2 Segmentos de clientes prioritarios

| Prioridad | Segmento | Por qué encaja |
|---|---|---|
| 1 | **Clínicas estéticas y de medicina estética** | Alto valor por cita, mucha consulta previa, dependencia total de WhatsApp. Segmento de arranque ya validado en el producto. |
| 1 | **Dentistas y clínicas dentales** | Volumen alto de citas, recordatorios críticos, agenda compleja. |
| 2 | **Peluquerías y centros de uñas/belleza** | Reserva recurrente, alta rotación, márgenes ajustados que premian la automatización. |
| 2 | **Gimnasios y centros wellness** | Captación constante de leads, gestión de altas y clases. |
| 3 | **Talleres mecánicos, veterinarias, inmobiliarias, restaurantes** | Mismo patrón de consulta-reserva; expansión natural una vez consolidado el núcleo. |

### 1.3 La solución propuesta

Una **plataforma SaaS modular** que cada negocio activa en minutos y que ofrece:

1. **Recepcionista IA 24/7** sobre WhatsApp: entiende lenguaje natural, consulta el catálogo real del negocio y responde con su tono de marca.
2. **Reserva automática de citas**: la IA busca huecos reales, evita solapamientos y duplicados, y confirma la cita.
3. **CRM con pipeline visual**: cada conversación crea o enriquece la ficha del cliente; nada se pierde.
4. **Bandeja unificada, agenda, campañas con ROI previsto y métricas en tiempo real.**
5. **Escalado a humano** cuando el caso lo requiere (queja, caso médico, petición expresa).

### 1.4 Objetivos a corto, medio y largo plazo

- **Corto (0–3 meses):** WhatsApp en producción con un piloto de 5–10 negocios reales en Murcia. Integración con Google Calendar. Primeras reservas reales automatizadas.
- **Medio (3–12 meses):** 50–150 negocios de pago. Panel multiempresa consolidado, facturación recurrente, métricas de conversión por sector.
- **Largo (12–36 meses):** Expansión nacional, marketplace de módulos por sector, IA proactiva (re-captación de inactivos, upselling) e integración con más canales (Instagram, Facebook, voz).

---

## 2. Mercado

### 2.1 Análisis TAM / SAM / SOM *(estimaciones a validar)*

- **TAM (mercado total):** PYMEs de servicios con atención al cliente por mensajería en España. >1,3 millones de PYMEs de servicios; mercado potencial de software de automatización/CRM para PYME estimado en cientos de millones de € anuales.
- **SAM (mercado servible):** negocios de los sectores prioritarios (estética, dental, belleza, wellness, automoción, inmobiliaria) que ya usan WhatsApp como canal principal — del orden de **150.000–250.000 negocios** en España.
- **SOM (mercado alcanzable a 3 años):** captura realista de **1.500–4.000 negocios** de pago con un ARPU de 49–149 €/mes → ingresos recurrentes anuales objetivo de **0,9–7 M€**.

> Las cifras son estimaciones de partida; uno de los objetivos del piloto en Murcia es **validar el SOM con datos reales** de adopción y conversión.

### 2.2 Tendencias tecnológicas y oportunidades

- **Explosión de la IA conversacional** (LLMs) que por primera vez permite atención automática de calidad humana a coste marginal.
- **WhatsApp como canal #1** de comunicación negocio-cliente en España y LATAM.
- **Presión de costes** en PYMEs que buscan hacer más con menos personal.
- **Normalización del "self-service" 24/7** por parte de los consumidores.

### 2.3 Situación del sector de automatización e IA empresarial

El mercado se mueve de chatbots de reglas rígidas (frustrantes) hacia **agentes de IA** capaces de razonar, consultar datos y ejecutar acciones (reservar, cancelar, reprogramar). Aizorix se sitúa exactamente en esta segunda ola, ya con un agente funcional que ejecuta acciones reales, no solo conversa.

---

## 3. Validación del Proyecto

### 3.1 Validación del problema

- ¿Pierde clientes por no responder a tiempo en WhatsApp? — Confirmado como dolor transversal en los sectores objetivo.
- ¿Quién gestiona hoy los mensajes? — Personal de recepción saturado o el propio dueño fuera de horas.
- ¿Existe registro/seguimiento? — Generalmente no; los datos viven en móviles personales.

### 3.2 Validación de la solución

- La IA responde de forma natural y **completa una reserva de principio a fin** en la demo actual.
- El flujo conversación → identificación de cliente → propuesta de hueco → reserva → registro en CRM **funciona hoy** en el entorno de demostración.

### 3.3 Encaje producto-solución

El PMV demuestra el encaje técnico: el agente capta, atiende, reserva y registra. El siguiente hito de validación es el **encaje producto-mercado** con el piloto de negocios reales en Murcia.

---

## 4. Competidores

### 4.1 Competidores directos

- Plataformas de "chatbot + reservas" para sectores concretos (booking + bot).
- Soluciones genéricas de chatbot de IA conectables a WhatsApp.

### 4.2 Competidores indirectos

- Centralitas y software de citas tradicionales (sin IA).
- Agencias que montan flujos manuales (n8n, Make) caso por caso.
- El "status quo": gestionar WhatsApp a mano.

### 4.3 Ventajas competitivas reales de Aizorix AI

1. **Agente que ejecuta acciones, no solo responde**: reserva, cancela y reprograma sobre una agenda real con control de solapamientos y duplicados.
2. **Multiempresa de serie**: arquitectura SaaS escalable, cada negocio aislado y configurable.
3. **Prompt del sistema editable por el propio negocio**: ajusta el comportamiento de la IA sin tocar código.
4. **Especialización por sector** con catálogo, tono y reglas propias.
5. **Producto real ya construido y probado** (285+ tests), no una maqueta.

---

## 5. Canvas Estratégico de Valor

### 5.1 Drivers del cliente

- No perder ni un lead.
- Reducir carga de trabajo del personal.
- Profesionalizar la imagen (respuesta inmediata 24/7).
- Tener datos y control sobre su captación.

### 5.2 Matriz de valor

| Factor | Status quo (WhatsApp manual) | Chatbot de reglas | **Aizorix AI** |
|---|---|---|---|
| Disponibilidad 24/7 | ✗ | ✓ | ✓ |
| Lenguaje natural | — | Limitado | **Alto (LLM)** |
| Reserva automática real | ✗ | Parcial | **✓** |
| CRM integrado | ✗ | ✗ | **✓** |
| Multiempresa / multisede | ✗ | ✗ | **✓** |
| Configurable sin código | — | ✗ | **✓** |

### 5.3 Factores diferenciadores

Combinación única de **IA conversacional + ejecución de reservas reales + CRM + multiempresa**, en una sola plataforma lista para producción.

---

## 6. Business Model Canvas

- **Propuesta de valor:** recepcionista IA 24/7 que capta y reserva automáticamente, con CRM incluido.
- **Segmentos de cliente:** PYMEs de servicios (estética, dental, belleza, wellness, automoción, inmobiliaria, restauración).
- **Canales de captación:** venta directa, partners/agencias, demostraciones institucionales (Incoova/Ayuntamiento), marketing de contenido y referidos.
- **Relación con el cliente:** onboarding guiado, autoservicio en el panel, soporte en español.
- **Flujos de ingresos:**
  - Suscripción mensual por niveles (Free / Basic / Pro / Enterprise).
  - Posibles add-ons: consumo de IA por volumen, módulos premium por sector, multisede.
- **Recursos clave:** plataforma SaaS, modelos de IA (OpenAI), equipo técnico.
- **Actividades clave:** desarrollo de producto, integración de canales, soporte y ventas.
- **Socios clave:** OpenAI, proveedor de WhatsApp Business API (Twilio/Meta), Incoova como acelerador institucional.
- **Estructura de costes:** infraestructura cloud, consumo de IA, desarrollo, soporte, captación.
- **Innovaciones del modelo:** monetización por valor generado (reservas conseguidas), prompt configurable por el cliente, catálogo modular por sector.

---

## 7. Segmentos de Cliente y Análisis

### 7.1 Actividades diarias del cliente

Atender llamadas y WhatsApp, gestionar la agenda, confirmar y recordar citas, atender en persona, hacer seguimiento de clientes y campañas puntuales.

### 7.2 Dolores y frustraciones

- Mensajes sin responder y leads que se enfrían.
- Solapamientos y errores de agenda.
- Falta de datos para tomar decisiones.
- Dependencia de una persona concreta que "lleva el WhatsApp".

### 7.3 Objetivos y beneficios esperados

- Captar más clientes sin contratar más personal.
- Llenar la agenda automáticamente.
- Profesionalizar la atención y la imagen de marca.
- Tener trazabilidad y métricas reales.

---

## 8. Propuesta de Valor

### 8.1 Características vs. beneficios

| Característica | Beneficio para el negocio |
|---|---|
| Recepcionista IA 24/7 en WhatsApp | No se pierde ningún lead, ni de madrugada ni en festivos. |
| Reserva automática con control de huecos | La agenda se llena sola, sin solapamientos ni dobles reservas. |
| CRM con pipeline y ficha de cliente | Todo cliente queda registrado y con seguimiento. |
| Tono y prompt configurables | La IA habla como la marca, con sus reglas y promociones. |
| Escalado a humano inteligente | Los casos delicados llegan a una persona en el momento justo. |
| Métricas y campañas con ROI previsto | Decisiones basadas en datos, no en intuición. |
| Multiempresa / multisede | Una sola plataforma para cadenas y franquicias. |

### 8.2 Cómo impacta positivamente en el cliente

Convierte conversaciones perdidas en **citas confirmadas e ingresos**, reduce la carga del personal y aporta datos para crecer — todo desde el primer día y sin conocimientos técnicos.

### 8.3 Qué diferencia a Aizorix AI del resto

No es un chatbot que "contesta": es un **agente que trabaja** — capta, razona, reserva y registra — sobre una infraestructura SaaS real, multiempresa y ya probada.

---

## 9. Producto Mínimo Viable (PMV)

### 9.1 Definición exacta del PMV

Plataforma SaaS multiempresa con **recepcionista IA conectada a OpenAI** que mantiene conversaciones por WhatsApp (formato listo para producción), **reserva citas reales** sobre una agenda con control de disponibilidad, y registra todo en un **CRM persistente**, gobernado desde un **panel de control completo**.

### 9.2 Características principales (ya operativas)

- ✅ **IA recepcionista** con OpenAI (GPT-4.1-mini) y 12 herramientas (buscar tratamiento, consultar disponibilidad, reservar, cancelar, reprogramar, identificar paciente, memoria, escalado, listar catálogo/equipo/horarios/citas).
- ✅ **Reserva automática** con validación de horario, prevención de solapamientos y de **reservas duplicadas**, reintento ante conflictos de concurrencia.
- ✅ **CRM persistente** (PostgreSQL + Prisma): pacientes, conversaciones, citas, memorias, auditoría.
- ✅ **Webhook de WhatsApp** en formato estándar (Twilio), listo para conectar el número real.
- ✅ **Arquitectura multiempresa**: cada negocio aislado por `clinicId`, módulos activables, prompt del sistema editable.
- ✅ **Panel completo**: dashboard, pipeline, bandeja de conversaciones, agenda, demo de IA, campañas, métricas, configuración y registro de auditoría.
- ✅ **Onboarding inteligente** y **landing con chat IA real**.
- ✅ **285+ tests automatizados** en verde.

### 9.3 Materiales de presentación

- Este dossier (formato Incoova).
- Guion de presentación para el Ayuntamiento (documento adjunto).
- Demo funcional navegable.
- Simulador de WhatsApp (HTML) para mostrar el flujo end-to-end sin necesidad del número real.

### 9.4 Demo funcional

- **Landing pública** con chat IA real integrado.
- **Panel `/app`** con todos los módulos.
- **Simulador WhatsApp** (`/demo.html` y `/whatsapp-tester.html`) que dispara el flujo real de IA y reserva contra el backend.

### 9.5 Landing y presentación

Landing institucional con propuesta de valor, sectores, métricas y CTA, además del chat IA en vivo para que cualquier asistente pruebe el producto en segundos.

### 9.6 Cronograma y plan de hitos

| Fase | Hito | Plazo orientativo |
|---|---|---|
| H1 | WhatsApp en producción (cuenta Business API) | 2–4 semanas |
| H2 | Integración Google Calendar | 3–5 semanas |
| H3 | Piloto con 5–10 negocios reales en Murcia | 1–2 meses |
| H4 | Facturación recurrente + panel multiempresa consolidado | 2–3 meses |
| H5 | 50+ negocios de pago y métricas de conversión por sector | 6–12 meses |

---

## 10. Equipo

### 10.1 Definición de roles

- **Producto / Tecnología:** arquitectura SaaS, IA, integraciones, calidad.
- **Negocio / Ventas:** captación de pilotos, relación institucional, partners.
- **Soporte / Operaciones:** onboarding de clientes y atención.

### 10.2 Competencias profesionales

Desarrollo full-stack (Next.js, TypeScript, PostgreSQL), integración de IA (OpenAI), arquitectura multiempresa, y conocimiento del sector servicios.

### 10.3 Participación actual y futura

Equipo técnico activo manteniendo la plataforma estable y operativa; con el apoyo de Incoova se reforzarían las áreas de **negocio, ventas y operaciones** para escalar la captación.

---

## Estado Técnico Actual Detectado

- ✅ Repositorio GitHub funcional.
- ✅ Sistema Full Stack operativo.
- ✅ Frontend ejecutándose localmente.
- ✅ Onboarding inteligente operativo.
- ✅ Demo visual de IA recepcionista.
- ✅ Arquitectura SaaS escalable y multiempresa.
- ✅ **Integración OpenAI operativa** (no solo planificada).
- ✅ **Persistencia CRM real** (PostgreSQL + Prisma).
- ✅ **Automatización de citas real** (reserva, cancelación, reprogramación).
- ✅ **Webhook de WhatsApp listo** para conectar el número real.
- ✅ **285+ pruebas automatizadas** en verde.

---

## Objetivo de Incoova

- Demostrar que el proyecto **ya tiene base técnica real** (PMV operativo, no maqueta).
- Validar el **avance del SaaS** con cobertura de pruebas y arquitectura escalable.
- Mostrar la **capacidad de escalabilidad** (multiempresa de serie).
- Demostrar **viabilidad comercial y tecnológica**.
- Conseguir **continuidad y apoyo institucional** para el piloto en Murcia.

---

## Prioridades Técnicas Inmediatas

| Prioridad | Estado |
|---|---|
| Conectar WhatsApp real | 🟡 Webhook listo; falta activar cuenta Business API |
| Integrar OpenAI | ✅ Hecho y operativo |
| Conectar Google Calendar | ⚪ Roadmap (H2) |
| Persistencia CRM | ✅ Hecho (PostgreSQL + Prisma) |
| Automatización real de citas | ✅ Hecho (con control de duplicados y solapamientos) |
| Preparación multiempresa | ✅ Hecho (aislamiento por `clinicId`, módulos, prompt editable) |

---

## Observación Importante

- La demo actual **debe mantenerse estable y operativa**.
- Toda modificación se realiza **sin comprometer la infraestructura principal** de Aizorix AI.
- La prioridad es asegurar una **demo funcional, visual y presentable** para Incoova.

---

**Aizorix AI** — Proyecto de automatización e inteligencia artificial empresarial.
*Documento interno de coordinación técnica y preparación estratégica para Incoova y Ayuntamiento de Murcia.*
