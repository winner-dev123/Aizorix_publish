# Manual de uso · Aizorix

> **Para el equipo de la clínica.** Esta guía explica cómo usar el panel día a día: cómo recibir mensajes por WhatsApp, gestionar la agenda, atender escaladas, ajustar la IA, invitar al equipo y consultar el historial de actividad.
>
> Para documentación técnica (despliegue, esquema, integraciones) ver [HANDOFF.md](HANDOFF.md) y [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md). Aizorix tiene también una versión interactiva de esta guía dentro del panel en **`/app/help`** (icono de interrogación arriba a la derecha).

---

## Índice

1. [¿Qué hace Aizorix?](#1-qué-hace-aizorix)
2. [Empezar](#2-empezar)
3. [El flujo de un mensaje](#3-el-flujo-de-un-mensaje)
4. [Panel principal — qué hay en cada pantalla](#4-panel-principal--qué-hay-en-cada-pantalla)
5. [Configuración](#5-configuración)
6. [Roles del equipo](#6-roles-del-equipo)
7. [Tareas comunes (recetas)](#7-tareas-comunes-recetas)
8. [Auditoría y observabilidad](#8-auditoría-y-observabilidad)
9. [Glosario](#9-glosario)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)
11. [Límites conocidos](#11-límites-conocidos)
12. [Solución de problemas](#12-solución-de-problemas)

---

## 1. ¿Qué hace Aizorix?

Aizorix es una **recepcionista virtual con IA** para clínicas estéticas. Sustituye o complementa a un equipo humano respondiendo mensajes de WhatsApp 24/7. Cuando un paciente escribe al WhatsApp de la clínica, Aizorix puede:

- Responder con información sobre tratamientos (precios, duración, contraindicaciones)
- Buscar huecos libres en la agenda y confirmar reservas
- Cancelar o reprogramar citas
- Identificar al paciente por su teléfono y recordar conversaciones anteriores
- Detectar cuándo necesita ayuda humana (quejas, casos médicos, peticiones explícitas) y avisar al equipo

Todo en español, con el tono que la clínica configure (formal / cercano / neutro), siguiendo las **instrucciones específicas** que la dueña haya escrito (descuentos del martes, aparcamiento, etc.).

---

## 2. Empezar

### 2.1 Acceder al panel

1. Abre [http://localhost:3000/signin](http://localhost:3000/signin) (o la URL pública que te haya dado el equipo de Aizorix).
2. Escribe tu email y pulsa **Enviar enlace**.
3. Revisa tu bandeja de entrada — recibirás un enlace de un solo uso.
4. Haz clic en el enlace → entras directamente al panel `/app`.

**No funciona el enlace?** Pídele a la persona que te invitó que vuelva a `/app/settings/staff` y pulse **Reenviar enlace** en tu fila.

### 2.2 Lo primero que verás

El panel principal (`/app`) muestra:

- **Banner de bienvenida** con el nombre de tu clínica y un resumen de la actividad de los últimos 30 días.
- **4 tarjetas de métricas**: leads de los últimos 7 días, conversaciones, próximas citas, ingresos atribuidos a la IA.
- **Próximas citas** (las 5 siguientes confirmadas).
- **Conversaciones recientes** (las 5 últimas por actividad).
- **Rendimiento de la IA — últimos 30 días** (citas creadas por el bot, tasa de cierre, ingresos).
- **Cambios recientes** (solo Propietarios/Admins) — quién hizo qué en el panel.

A la izquierda, la **barra lateral** te lleva a cada sección del panel. Abajo se ve el resumen de tu clínica (tratamientos, técnicos, empleados activos).

En móvil la barra lateral se oculta — pulsa el icono de menú arriba a la izquierda para desplegarla.

---

## 3. El flujo de un mensaje

Para entender Aizorix por dentro, sigue mentalmente este recorrido:

1. **El paciente escribe** al WhatsApp de la clínica desde su móvil.
2. **El webhook recibe el mensaje** y lo asocia a la clínica usando el número de destino.
3. **El orquestador identifica al paciente** por su teléfono. Si no existe, lo crea con `find_or_create_patient`.
4. **La IA decide qué hacer.** Tiene 8 herramientas:
   - `find_treatment` — busca el tratamiento más parecido a lo que pidió el paciente
   - `find_availability` — busca huecos libres
   - `book_appointment` — reserva
   - `cancel_appointment` — cancela
   - `reschedule_appointment` — mueve una cita
   - `find_or_create_patient` — registra al paciente
   - `set_memory` — guarda hechos duraderos ("alérgica a la lidocaína")
   - `escalate_to_human` — pasa el caso al equipo
5. **El bot responde** al paciente en lenguaje natural. Si reservó algo, la cita aparece en `/app/agenda` al instante.
6. **El equipo ve la conversación** en `/app/conversations` con el historial completo, incluido un detalle técnico clicable con cada herramienta que usó la IA.

Si el bot escala, el paciente recibe un "te atenderá un compañero en breve" y la conversación aparece en la pestaña **Necesitan ayuda** con un badge naranja en la barra lateral.

---

## 4. Panel principal — qué hay en cada pantalla

### Dashboard (`/app`)
Resumen de la clínica. Empezar el día aquí.

### Pipeline (`/app/pipeline`)
Embudo de pacientes en 5 columnas (Nuevo → Contactado → Cita agendada → Cliente activo → Inactivo). Cada tarjeta es un paciente; clicar abre su ficha.

### Clientes (`/app/clients`)
Lista paginada (50/página) con buscador. Filtra por nombre, teléfono o email. Botón **Nuevo cliente** arriba a la derecha.

### Conversaciones (`/app/conversations`)
Bandeja unificada. A la izquierda: lista filtrable (Todas / Necesitan ayuda) con buscador. A la derecha: el hilo completo del paciente seleccionado.
- **Composer manual** abajo: para escribir una respuesta de tu puño y letra.
- **Pausar bot / Reactivar bot**: detiene las respuestas automáticas mientras tú gestionas.
- **Marcar resuelto**: cierra una escalada y reactiva el bot.
- **Detalle técnico**: bajo cada respuesta de la IA, despliega las herramientas que usó y con qué argumentos.

### Agenda (`/app/agenda`)
Cuadrícula de 7 días + lista de próximas citas con controles inline (cancelar / mover). Botón **Nueva cita manual** para reservar sin pasar por el bot.

### IA Recepcionista (`/app/ai`)
Demo del bot para probarlo. Dos modos:
- **Modo simulado**: respuestas pre-programadas, sin coste.
- **Modo real**: usa la IA real y consume créditos OpenAI. Pulsa "Reiniciar" para limpiar la conversación.

### Campañas IA (`/app/campaigns`)
6 plantillas de campaña (recuperación de inactivos, VIP, post-tratamiento…). Muestra audiencia real, coste estimado e ingresos potenciales basado en tus pacientes.

### Métricas (`/app/metrics`)
KPIs con deltas mes-a-mes: leads, conversiones a cita, citas → ventas, ingresos IA, ticket medio, recuperación de inactivos. Embudo de conversión + top empleados por revenue + día pico + tratamiento estrella.

### Configuración (`/app/settings`)
7 subpáginas — ver [Configuración](#5-configuración).

---

## 5. Configuración

Las primeras 5 las puede usar OWNER o ADMIN; **Empleados** y **Módulos** son normalmente OWNER.

### Datos del negocio (`/app/settings/clinic`)
- **Nombre de la clínica** — aparece en la barra superior y en las respuestas del bot.
- **Zona horaria** — fundamental: el bot razona en hora local.
- **Idioma** — `es-ES` por defecto.
- **Número de WhatsApp** — formato E.164 (`+34911000000`). Si cambias el número, recuerda actualizarlo también en Twilio.
- **Tiempo mínimo antes de una cita** (minutos) — el bot no propondrá huecos con menos antelación.
- **Tamaño del hueco** (minutos) — 30 es lo más habitual.

### Horarios (`/app/settings/hours`)
Define las franjas de apertura por día de la semana. Soporta turnos partidos (mañana + tarde). Si un día no tiene franjas, la clínica está cerrada.

### IA Recepcionista (`/app/settings/ai`)
- **Tono del bot**: Formal (usted) / Cercano (tú) / Neutro.
- **Instrucciones adicionales** (hasta 2000 caracteres): consejos que la IA usará como contexto (sin citarlos literalmente al paciente). Ej.: *"Los martes -20% en limpieza facial."*

### Empleados y permisos (`/app/settings/staff`)
- **Invitar empleado**: email + nombre + rol. Al guardar, se envía el enlace de acceso automáticamente.
- **Reenviar enlace**: para empleados existentes cuyo enlace anterior haya expirado.
- **Desactivar**: el usuario pierde acceso (su sesión actual sigue válida hasta que expire el token JWT).
- **Cambiar rol**: en el selector. Solo un OWNER puede tocar el rol OWNER.

### Módulos contratados (`/app/settings/modulos`)
Checkboxes para activar/desactivar funciones. Al desactivar un módulo:
- Su entrada desaparece de la barra lateral en la siguiente navegación.
- Acceder a su URL directamente redirige aquí con un aviso en ámbar.

### Facturación (`/app/settings/facturacion`)
Visualiza el plan actual (Free / Basic / Pro / Enterprise) y sus funciones incluidas. Los cambios de plan no son self-service — escribe a `billing@aizorix.dev`.

### Registro de acciones (`/app/settings/audit`)
Log append-only de cada cambio relevante: configuración, empleados, respuestas manuales, escaladas resueltas. Filtra por acción y fecha, exporta a CSV.

---

## 6. Roles del equipo

| Rol | Puede |
|---|---|
| **OWNER** (Propietario/a) | Todo: configuración, empleados (incluido invitar otros OWNERs), módulos, facturación, auditoría. |
| **ADMIN** | Todo lo del OWNER salvo gestionar el rol OWNER. |
| **RECEPTIONIST** (Recepción) | Bandeja, agenda, clientes, demo del bot. No accede a configuración. |
| **STAFF** | Igual que recepción. |

> Los pacientes no tienen cuenta — interactúan solo por WhatsApp.

---

## 7. Tareas comunes (recetas)

### Crear un cliente manualmente (llamada / visita en persona)
1. `/app/clients` → **Nuevo cliente**.
2. Nombre + teléfono (E.164) son obligatorios. Resto opcional.
3. Al guardar, el cliente aparece como **Lead** en el pipeline.
4. La próxima vez que escriba por WhatsApp, la IA lo reconocerá por su número.

### Reservar una cita por teléfono
1. Abre la ficha del paciente (`/app/clients/<id>`).
2. Pulsa **Reservar cita** — abre `/app/agenda/new` con el paciente ya seleccionado.
3. Elige tratamiento, técnico, fecha y hora.
4. Si la hora cae fuera de los horarios o solapa con otra cita, verás un error claro.
5. **Bypass del tiempo mínimo**: si la cita es para hoy/inmediata y el sistema te bloquea por `minLeadMinutes`, marca la casilla.

### Atender una conversación escalada
1. La barra lateral muestra un badge naranja en **Conversaciones** cuando hay escaladas abiertas.
2. Entra a `/app/conversations` → filtra **Necesitan ayuda**.
3. Abre la conversación. Verás:
   - El **Historial de escaladas** arriba (motivo + cuándo).
   - El **bot está pausado** automáticamente — el paciente no recibirá respuestas automáticas hasta que tú lo reactives.
4. Escribe tu respuesta en el composer → **Enviar**.
5. Cuando hayas terminado: **Marcar resuelto** → el bot vuelve a estar activo y el badge desaparece.

### Cambiar el tono del bot
1. `/app/settings/ai` → elige Formal / Cercano / Neutro → **Guardar**.
2. El cambio se aplica al **siguiente mensaje del paciente**, no a las conversaciones que ya están en curso.

### Añadir un dato persistente sobre un paciente
1. Ficha del paciente → tarjeta **Memorias del bot**.
2. Clave (snake_case) + valor → **Añadir**.
3. Ejemplos:
   - `preferred_technician` = `Diana`
   - `allergic_to` = `lidocaína`
   - `has_two_kids` = `sí (Lola 4 años, Pablo 2)`
4. La IA usa estas memorias en cada respuesta — sin citarlas literalmente.

### Exportar el registro de auditoría
1. `/app/settings/audit`.
2. Opcional: aplica filtros (acción, rango de fechas).
3. **Exportar CSV** → descarga un fichero con timestamp, acción, actor, target y metadatos.

### Invitar a un nuevo empleado
1. `/app/settings/staff` → rellena email + rol → **Enviar**.
2. La persona recibirá un enlace por email (o, en desarrollo, en la consola del servidor).
3. Si dice que el enlace expiró: **Reenviar enlace** en su fila.

### Pausar el bot en una conversación concreta
1. Abre la conversación.
2. **Pausar bot** debajo del composer.
3. Mientras esté pausado, los mensajes del paciente se registran pero no reciben respuesta automática.
4. **Reactivar bot** cuando termines.

---

## 8. Auditoría y observabilidad

### Para el equipo
- **`/app/settings/audit`**: ver y exportar todo lo que ha hecho el personal del panel.
- **Tarjeta "Cambios recientes"** en `/app` (solo OWNER/ADMIN): preview de las últimas 5 acciones.

### Para operaciones (tu proveedor técnico)
- **`GET /api/health`** — JSON `{status, db, latencyMs, timestamp}`. Comprueba que la base de datos responde.
- **`GET /api/version`** — versión desplegada (git SHA + Node + entorno).
- **`GET /api/metrics`** — métricas Prometheus (peticiones webhook, vueltas de orquestador, denegaciones por rate limit, citas creadas, llamadas a herramientas de IA). Protegido por bearer token cuando se configura `METRICS_AUTH_TOKEN`.

---

## 9. Glosario

- **Bot** / **IA Recepcionista** / **Aizorix**: el LLM que responde por WhatsApp.
- **Orquestador**: la capa de software que coordina al bot con la base de datos y las herramientas.
- **Webhook**: punto de entrada al que Twilio envía los mensajes entrantes.
- **Conversación**: el hilo de mensajes con un mismo número de teléfono.
- **Escalada / Handoff**: cuando el bot pasa el caso al equipo (queja, caso médico, petición explícita).
- **Memoria**: un hecho duradero sobre un paciente. Persiste entre conversaciones.
- **Tratamiento**: una entrada del catálogo de la clínica (Limpieza facial, Dermapen…).
- **Técnico/a**: una persona del equipo que realiza tratamientos. NO es el mismo concepto que un User del panel.
- **Lead minutes** (`minLeadMinutes`): tiempo mínimo entre "ahora" y la próxima cita reservable.
- **Slot granularity** (`slotGranularityMin`): cada cuántos minutos empieza un hueco bookeable (típicamente 30).
- **Pipeline**: vista de Patientes agrupados por su estado en el embudo comercial.
- **Módulo**: una sección del panel que se puede activar/desactivar para una clínica.

---

## 10. Preguntas frecuentes

**¿El bot inventa información?**
No deliberadamente — está instruido para usar siempre las herramientas (`find_treatment`, `find_availability`) y nunca improvisar precios o disponibilidad. Si dudas de una respuesta, abre el thread en `/app/conversations` y mira el **Detalle técnico** bajo el mensaje del bot — verás cada herramienta que usó.

**¿Y si el bot reserva mal una cita?**
La reserva pasa por la misma validación que una reserva manual (horarios, solapamientos, elegibilidad del técnico). Si una cita está mal: ve a `/app/agenda` y muévela o cancélala. Cada acción manual queda registrada en `/app/settings/audit` con tu nombre.

**¿Puedo escribir al paciente directamente sin que el bot conteste?**
Sí — abre la conversación, pulsa **Pausar bot**, escribe tu respuesta. El bot no responderá hasta que reactives.

**¿Puedo enseñarle algo al bot sobre un paciente?**
Sí — en la ficha del paciente (`/app/clients/<id>`), tarjeta **Memorias del bot**, añade pares clave/valor. El bot los usa en futuras respuestas.

**¿Hay límites en cuánto puede crecer la lista de pacientes?**
La lista está paginada (50/página), así que en términos de UX, no. Por debajo, el plan/host determina los límites reales — pregunta a tu proveedor.

**¿Quién ve qué?**
Resumen en [§6 Roles del equipo](#6-roles-del-equipo). En general, RECEPTIONIST/STAFF pueden gestionar pacientes y conversaciones pero no tocan configuración ni auditoría.

**¿Funciona si pierde Internet la clínica?**
El bot vive en el servidor remoto, no en la clínica. Si la clínica se queda sin Internet, el bot sigue atendiendo WhatsApps normalmente; solo el panel no se ve. Cuando vuelva la conexión, todo lo que el bot hizo está ahí.

**¿Qué pasa con la privacidad?**
Las conversaciones, memorias y notas son visibles solo para el personal de tu clínica. No se comparten entre clínicas. Los datos están scopeados por `clinicId` en cada consulta a la base de datos.

---

## 11. Límites conocidos

- **Las conversaciones en curso no cambian de tono al instante.** Si cambias el tono de Formal → Cercano, ese cambio entra en el **siguiente mensaje**. Las respuestas ya enviadas no se reescriben.
- **La IA puede tardar unos segundos** en responder (típicamente 2-6 s). Es normal — está consultando precios, horarios y eligiendo técnico.
- **El bot pide confirmación antes de reservar.** Si el paciente dice "prefiero limpieza el martes", el bot responde "¿confirmas?" en lugar de auto-reservar. Es a propósito — evita reservas accidentales.
- **WhatsApp tiene una ventana de 24 h.** Pasadas 24 h desde el último mensaje del paciente, solo se pueden enviar plantillas pre-aprobadas. El composer manual lo intentará igualmente, pero Twilio puede rechazarlo.
- **Aún no hay actualizaciones en tiempo real** en el panel: la bandeja se refresca cada 30 segundos. Para algo más rápido, pulsa **F5** o navega entre páginas.
- **La búsqueda en conversaciones** matchea solo nombres y teléfonos, no el contenido de los mensajes. (Si lo necesitas, dilo y se puede añadir.)
- **Los empleados desactivados conservan su sesión** hasta que el token JWT expire. Para un cierre inmediato hay que esperar a que caduque o invalidar manualmente.

---

## 12. Solución de problemas

| Síntoma | Probable causa | Solución |
|---|---|---|
| No recibo el enlace de acceso por email | SMTP mal configurado o el correo fue a Spam | Pide a un compañero OWNER que pulse **Reenviar enlace** en tu fila de `/app/settings/staff`. En desarrollo el enlace se imprime en la consola del servidor. |
| El badge de Conversaciones no baja después de resolver | Hay otra escalada abierta en la misma conversación | Abre el hilo, mira **Historial de escaladas** — si hay más de una abierta, resuélvelas todas. |
| El bot no contesta los mensajes nuevos | Está pausado en esa conversación | Abre el hilo, pulsa **Reactivar bot**. |
| El bot dice "no abrimos los domingos" pero sí abrimos | Falta una franja para ese día en `/app/settings/hours` | Añade la franja → guardar. El siguiente mensaje del paciente ya la respeta. |
| La IA propone técnicos que no atienden ese tratamiento | El mapeo técnico/tratamiento es incorrecto en la base de datos | Pide a tu equipo técnico ajustar `TechnicianTreatment` (no editable desde el panel todavía). |
| Una página dice "Módulo desactivado" | El módulo está desactivado en `/app/settings/modulos` | Reactivalo en esa página, o pide al OWNER que lo haga. |
| Un cliente nuevo no aparece en /app/clients | El bot no lo ha registrado todavía (sigue siendo "anonymous" en la conversación) | Aparecerá en cuanto la IA llame a `find_or_create_patient` (típicamente en la primera respuesta donde se le pida el nombre). |
| "No tienes permisos" al entrar en /app/settings/* | Tu rol es STAFF o RECEPTIONIST | Solo OWNER y ADMIN pueden editar configuración. Pide cambio de rol al OWNER. |
| El panel se ve roto en móvil | La barra lateral está ocultada por diseño | Pulsa el icono de menú arriba a la izquierda. |

---

## ¿Algo que no encuentras?

- **Documentación técnica**: [HANDOFF.md](HANDOFF.md)
- **Despliegue en producción**: [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md)
- **Ayuda comercial o cambios de plan**: `billing@aizorix.dev`
- **Bugs o sugerencias del panel**: abre un issue en el repositorio o contacta a tu proveedor técnico.
