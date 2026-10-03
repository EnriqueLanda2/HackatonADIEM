# agromIA - Sistema inteligente de riego

## 1. Propósito del proyecto

agromIA es una aplicación web para supervisar y operar un sistema de riego agrícola en parcelas del estado de Morelos. Integra:

- Telemetría de sensores de humedad, temperatura, humedad ambiental y pH.
- Control automático y manual del riego.
- Pronóstico meteorológico e historial climático.
- Decisiones de riego basadas en humedad, lluvia y disponibilidad de agua.
- Cisterna principal y consumo de agua en tiempo real.
- Dron de riego y fumigación limitado a una parcela objetivo, con dosis calculada por misión.
- Visualización 3D del terreno.
- Gestión de parcelas y cultivos.
- Alertas operativas y agronómicas con push notifications.
- IA de plagas: riesgo predictivo por parcela y escaneo del dron que reporta si hay plaga (booleano).
- Simulador físico de sensores para demostraciones sin hardware real.

El objetivo de la demo es que el usuario pueda abrir o cerrar una válvula y observar que la siguiente telemetría cambia de forma coherente: la humedad sube con riego, baja por evaporación y el tanque disminuye cuando existe consumo.

## 2. Arquitectura

### Frontend

Ubicación: [`frontend/`](./frontend/)

- Next.js 14.
- React 18.
- TypeScript.
- Tailwind CSS.
- Three.js, React Three Fiber y Drei para el terreno 3D.
- Polling del dashboard cada 2 segundos.
- Cliente API con fallback a datos locales cuando el backend no está disponible.

Archivos principales:

- [`frontend/src/app/page.tsx`](./frontend/src/app/page.tsx): composición del dashboard y actualización del clima.
- [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts): cliente API, estado demo, telemetría simulada y operaciones de riego.
- [`frontend/src/lib/weather-service.ts`](./frontend/src/lib/weather-service.ts): consulta y transformación meteorológica.
- [`frontend/src/types/index.ts`](./frontend/src/types/index.ts): tipos compartidos del frontend.
- [`frontend/src/components/dashboard/Widgets.tsx`](./frontend/src/components/dashboard/Widgets.tsx): encabezado y cisterna.
- [`frontend/src/components/dashboard/ParcelaCard.tsx`](./frontend/src/components/dashboard/ParcelaCard.tsx): tarjeta operativa de parcela.
- [`frontend/src/components/dashboard/DroneControlPanel.tsx`](./frontend/src/components/dashboard/DroneControlPanel.tsx): control del dron.
- [`frontend/src/components/dashboard/WeatherWidgetIOS.tsx`](./frontend/src/components/dashboard/WeatherWidgetIOS.tsx): clima actual, historial y pronóstico.
- [`frontend/src/components/3d/TerrainScene3D.tsx`](./frontend/src/components/3d/TerrainScene3D.tsx): visualización 3D.
- [`frontend/src/components/dashboard/CreateParcelModal.tsx`](./frontend/src/components/dashboard/CreateParcelModal.tsx): alta de parcelas.
- [`frontend/src/components/dashboard/EditParcelModal.tsx`](./frontend/src/components/dashboard/EditParcelModal.tsx): edición de parcelas.

### Backend

Ubicación: [`backend/`](./backend/)

- NestJS 10.
- TypeORM.
- PostgreSQL.
- WebSockets con Socket.IO.
- Swagger.
- `@nestjs/schedule` para tareas programadas.

Módulos registrados en [`backend/src/app.module.ts`](./backend/src/app.module.ts):

- `CropsModule`: cultivos.
- `ParcelsModule`: parcelas.
- `SensorsModule`: sensores y lecturas.
- `ValvesModule`: válvulas.
- `AlertsModule`: alertas.
- `IrrigationModule`: eventos y lógica de riego.
- `WeatherModule`: clima.
- `DashboardModule`: resumen agregado.

## 3. Ejecución local

### Backend

```bash
cd backend
npm ci
npm run dev
```

Por defecto se utiliza el puerto `3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La demo se ha ejecutado en el puerto `3002` cuando el puerto `3000` ya estaba ocupado.

### Builds

```bash
cd backend && npm run build
cd frontend && npm run build
```

El proyecto no tiene un `package.json` en la raíz; los comandos deben ejecutarse dentro de `backend` o `frontend`.

## 4. Flujo general de la aplicación

1. El frontend consulta el dashboard.
2. Si el backend responde, se obtienen parcelas, cultivos, sensores, válvulas, clima y alertas desde la API.
3. El estado local del dron, el modo global y la telemetría demo se combinan con la respuesta del backend porque el backend todavía no persiste todas las variables de la demo.
4. Si el backend no responde, el frontend utiliza el estado local de demostración.
5. El dashboard se actualiza cada 2 segundos.
6. El usuario puede cambiar entre:
   - **Parcelas Solitas**: tarjetas operativas por parcela.
   - **Métricas y Modelado**: clima, cisterna, terreno 3D y dron.
7. Todas las operaciones manuales deben respetar el modo global de riego.

## 4.1 Sesiones y roles

Al abrir la app se pide iniciar sesión. Hay dos roles:

| | 🛠️ Técnico | 👨‍🌾 Productor (usuario final) |
| --- | --- | --- |
| Dar de alta parcelas nuevas | ✅ | — |
| Instalar, editar o retirar tuberías de goteo y/o aspersión (metros, emisores) | ✅ | — |
| Vista **Instalaciones** | ✅ | — |
| Administrar parcela y sembradío: nombre, activa/inactiva, cultivo, descanso, notas | ✅ | ✅ |
| Elegir con qué tubería instalada regar: goteo, aspersión o ambos | ✅ | ✅ |
| Operar riego, dron y alertas; push notifications | ✅ | ✅ |

Cuentas de demostración, creadas automáticamente si la tabla `usuarios` está vacía:

- Técnico: `tecnico@agromai.mx` / `tecnico123`
- Productor: `productor@agromai.mx` / `productor123`

**Backend** (`AuthModule`):

- `POST /auth/login` devuelve un token firmado con HMAC-SHA256, válido 12 h.
- Las contraseñas se guardan con `scrypt` y sal aleatoria.
- El secreto de firma está en `backend/.auth-secret` (ignorado por git; se genera solo) o en la variable `AUTH_SECRET`.
- `RolesGuard` protege las rutas de parcelas:
  - `POST` y `DELETE /parcelas` exigen el rol técnico.
  - `PUT /parcelas/:id` admite ambos roles, pero el productor solo puede cambiar `nombre`, `activa`, `tiene_cultivo`, `cultivo_id`, `notas` y `metodo_riego`.
- Las parcelas no se borran desde la app, porque sensores, válvulas y eventos dependen de ellas. Se dan de baja marcándolas inactivas.

**Frontend** ([`frontend/src/lib/auth.ts`](./frontend/src/lib/auth.ts)):

- La sesión se guarda en `localStorage` y se envía como `Authorization: Bearer`.
- Si el backend responde 401, la sesión se cierra y se vuelve al login.
- Sin backend se usa una sesión local de demostración con las mismas cuentas y las mismas reglas en la interfaz.

**Tuberías de la parcela** (`parcelas.instalaciones_riego`, JSONB, una entrada por sistema):

- Una parcela puede tener **goteo, aspersión o los dos** instalados.
- Cada tubería guarda: estado `pendiente`/`instalada`, método, metros de tubería, emisores (goteros o aspersores), fecha, técnico y notas.
- Una tubería **pendiente** no riega, ni en manual ni en automático.
- Si la selección usa una tubería que el técnico retira, la parcela pasa a regar con la que quede.
- Las parcelas sin registro se consideran con la instalación previa del sistema recomendado.
- La columna anterior `instalacion_riego` (una sola tubería) se migra sola a la lista al arrancar el backend.
- Materiales sugeridos:
  - Goteo: cintas cada 2.5 m (4,000 m/ha) con goteros cada 30 cm.
  - Aspersión: marco de 12 × 12 m (~69 aspersores/ha).

## 5. Modos de operación

### Modo automático

El sistema toma decisiones con sensores y clima.

Reglas:

- Las válvulas se controlan automáticamente.
- Los controles manuales de válvulas quedan bloqueados.
- La recarga manual de cisterna queda bloqueada.
- La presencia y la llave de recarga del dron no se pueden modificar manualmente.
- El despacho manual del dron queda bloqueado.
- La selección de una misión manual no debe iniciar riego.
- La automatización considera la humedad mínima y óptima del cultivo, el nivel del tanque y el pronóstico.

### Modo manual

El usuario recupera el control explícito.

Se habilita:

- Abrir y cerrar válvulas.
- Regar todas las parcelas cultivadas.
- Detener el riego global.
- Rellenar la cisterna.
- Simular la presencia del dron en la base.
- Abrir o cerrar la llave de recarga del dron.
- Llenar el tanque del dron.
- Elegir una parcela concreta.
- Despachar el dron únicamente hacia la parcela elegida.

### Transición automático -> manual

Al cambiar a manual:

- Se muestra confirmación visual del cambio.
- Si había una misión automática activa, se detiene de forma segura.
- El dron vuelve lógicamente a la base.
- Se cierra la llave de recarga.
- Se limpia el objetivo anterior.
- Se habilitan los controles manuales.

El selector de parcela del dron permanece bloqueado durante una misión activa para evitar modificar el objetivo en vuelo.

## 6. Simulador físico de telemetría

El simulador está dentro de [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts) y reemplaza el antiguo panel de simulación manual.

Cada ciclo de dashboard representa un nuevo payload de sensores, aproximadamente cada 2 segundos.

### Humedad

Para cada parcela:

- Si la válvula está abierta, la humedad aumenta.
- Si la válvula está cerrada, la humedad disminuye por evaporación.
- La evaporación aumenta con la temperatura.
- Se respetan límites mínimos y máximos para evitar valores inválidos.

Las tasas son distintas por cultivo para representar necesidades diferentes:

- Caña: incremento de humedad más moderado.
- Tomate: incremento mayor por riego frecuente.
- Arroz: incremento adaptado a su humedad alta.
- Parcela en descanso: únicamente pierde humedad.

### Temperatura

La temperatura:

- Sigue una curva diaria sinusoidal.
- Tiene ruido pequeño para evitar una lectura completamente estática.
- Se utiliza para modificar la evaporación.

### Riego por tubería: goteo, aspersión o ambos

Cada parcela riega con las tuberías que tenga instaladas. `metodo_riego` es la selección en uso: `goteo`, `aspersion` o `ambos`.

- Se elige en la tarjeta de la parcela o en **Editar parcela**; solo se habilitan las opciones con tubería terminada.
- Lo pueden cambiar el técnico y el productor.
- Sin selección guardada, se usa lo instalado (los dos → `ambos`) o, si no hay registro, el sistema recomendado por el cultivo.
- Con **ambos**, los caudales se suman (280 L/min por ha) y cada sistema aporta según su eficiencia. Es la recuperación más rápida, con el mayor consumo, y la aspersión moja el follaje.

| | Goteo | Aspersión |
| --- | --- | --- |
| Caudal | 80 L/min por ha | 200 L/min por ha |
| Eficiencia (agua que llega a la raíz) | 90% | 75%, baja con calor (>25 °C) y viento, mínimo 50% |
| Velocidad de humedecimiento | ~5 puntos/min | ~10 puntos/min |
| Follaje | Seco | Mojado: +8% de humedad ambiental en la parcela mientras riega |

Reglas:

- La simulación (`simularRiegoParcelas()` en [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts)) usa el id real de cada parcela, así que funciona igual con el backend que con el simulador.
- Una válvula abierta toma de la cisterna `caudal × hectáreas`; solo la fracción eficiente sube la humedad del suelo.
- Con la válvula cerrada, el suelo pierde humedad por evaporación según la temperatura, sin bajar de 10%.
- Si la cisterna se vacía, la válvula se cierra.
- Solo se riegan parcelas activas con cultivo.
- La tarjeta muestra el caudal actual, la eficiencia y los litros usados hoy. El total diario aparece en "Litros hoy".
- Si la humedad ambiental de una parcela supera el `hr_alerta_hongos` de su cultivo, se genera una alerta de hongos. Si la causa es la aspersión, la alerta sugiere cambiar a goteo, y el dron puede fumigar en automático.
- En 3D se dibujan las tuberías instaladas: el goteo como cintas a ras de suelo y la aspersión como aspersores giratorios. Solo se animan las que están regando.

### Tanque

Las válvulas abiertas consumen agua de la cisterna según el caudal de su sistema de riego y la superficie de la parcela.

- El valor nunca baja por debajo de 0%.
- La recarga manual solo está disponible en modo manual.

### Histéresis de riego automático

Para evitar parpadeos:

- La válvula se abre cuando la humedad cae por debajo de `humedad_minima`.
- La válvula permanece abierta mientras la humedad esté entre el mínimo y el óptimo.
- La válvula se cierra al alcanzar `humedad_optima`.
- Si el tanque baja de 20%, el riego automático se bloquea y las válvulas se cierran.

## 7. Cultivos

Cada cultivo define:

- Nombre común.
- Nombre científico.
- Humedad mínima.
- Humedad óptima.
- Humedad máxima.
- Temperatura mínima, óptima y máxima.
- Humedad ambiental de alerta de hongos.
- Frecuencia de riego.
- Duración de riego.
- Tipo de riego.
- Descripción e icono.

Cultivos disponibles en el perfil local:

- Caña de azúcar.
- Nopal.
- Aguacate.
- Tomate rojo.
- Tomate verde.
- Maíz.
- Sorgo.
- Arroz.

El usuario puede cambiar el cultivo de una parcela desde **Editar parcela**. También puede convertirla en:

```text 
En descanso / sin cultivo
```

Al cambiar el cultivo, las reglas de humedad y frecuencia de riego se basan en el nuevo perfil.

## 8. Parcelas

Una parcela contiene:

- Identificador.
- Nombre.
- Estado activa/inactiva.
- Indicador de si tiene cultivo.
- Cultivo asociado.
- Zona 3D.
- Superficie.
- Coordenadas y altitud.
- Propietario.
- Notas.
- Modo de operación.
- Sensores.
- Válvula.

Desde las tarjetas se visualiza:

- Humedad del suelo.
- Estado de humedad: crítico, bajo, óptimo o saturado.
- Temperatura.
- pH.
- Humedad ambiental.
- Frecuencia de riego.
- Próximo riego.
- Estado de la electroválvula.
- Estado activa/inactiva.

La edición utiliza:

```http
PUT /parcelas/:id
```

Campos editables (ver permisos por rol en la sección 4.1):

- `nombre`
- `activa`
- `tiene_cultivo`
- `cultivo_id`
- `notas`
- `metodo_riego` (`goteo`, `aspersion`, `ambos` o `null` para usar lo instalado). Técnico y productor.
- `instalaciones_riego` (lista de tuberías instaladas o pendientes, una por sistema). Solo técnico.

## 9. Dron de riego y fumigación

El dron tiene:

- Estado de vuelo (`en_base`, `regando`, `fumigando`).
- Tanque de agua (40 L) y cartucho de biopreparado orgánico (5 L).
- Batería.
- Sensor de presencia en la base.
- Llave de recarga.
- Misión activa: tipo (`riego` o `fumigacion`), parcela objetivo, dosis en litros y litros aplicados.
- Resumen de la última misión (completada o parcial y motivo de fin).
- Días sin lluvia e indicador de riego de emergencia.

Toda la lógica vive en `sincronizarDron()` dentro de [`frontend/src/lib/api.ts`](./frontend/src/lib/api.ts). Se ejecuta sobre las parcelas que muestra el dashboard, ya sea con los UUID del backend o con los ids del simulador, así que la parcela objetivo siempre existe.

### Misiones

Cada misión descarga una **dosis calculada** sobre una sola parcela y después regresa a la base:

| Misión | Dosis | Caudal | Efecto |
| --- | --- | --- | --- |
| Riego | `(humedad óptima − humedad actual) / 0.4` L, mínimo 8 L | 45 L/min | Cada litro sube 0.4 puntos la humedad del suelo; el aporte se evapora a 0.6 puntos/min |
| Fumigación | 10 L de caldo por hectárea, mínimo 5 L | 20 L/min | Inyecta 5% de biopreparado; oculta la alerta de prevención orgánica de esa parcela durante 12 h |

La misión termina cuando:

- Se aplica la dosis completa.
- Se vacía el tanque o el biopreparado: la aplicación queda registrada como parcial.
- El operador la detiene o se cambia a modo manual.

### Reglas de despacho

- Solo hay misiones sobre parcelas activas con cultivo. No existe el despacho hacia "todas".
- El dron no despega con 15% de agua o menos.
- No se riega una parcela con el suelo saturado (por encima de su humedad máxima).
- No se fumiga con el cartucho de biopreparado al 10% o menos.
- Una misión activa bloquea el cambio de parcela y de tipo de misión.
- Automático:
  - Primero hace riego de emergencia sobre la parcela con menor humedad bajo su mínimo, si hay sequía.
  - Si no hay riego pendiente, fumiga cuando la humedad ambiental alcanza el `hr_alerta_hongos` del cultivo y la parcela no se fumigó en las últimas 12 h.
- Manual: el operador elige riego o fumigación y la parcela. El panel muestra la dosis estimada y avisa si el tanque no alcanza.
- En 3D, el riego se ve como gotas azules y la fumigación como una bruma color lino, ambas solo sobre la parcela objetivo.

### Recarga

- El sensor debe detectar al dron en la plataforma.
- Si el dron no está presente, la llave de paso se cierra por seguridad.
- La recarga de agua (150 L/min) y el llenado manual toman el agua de la cisterna litro por litro, sin pérdidas.
- El biopreparado se recarga manualmente con el dron acoplado. Debajo de 20% se genera una alerta.
- En modo automático, el sistema abre la llave por sí mismo mientras el dron esté acoplado y la cisterna supere el 20%.
- Todo el flujo se calcula por tiempo transcurrido, no por número de consultas.

## 9.1 IA de plagas

Archivo: [`frontend/src/lib/pest-ai.ts`](./frontend/src/lib/pest-ai.ts).

**Modelo predictivo (antes de escanear).** Es una regresión logística con factores explicables que estima la probabilidad de plaga de cada parcela. Considera:

- Humedad del aire frente al umbral de hongos del cultivo.
- Temperatura favorable (20–30 °C).
- Follaje mojado por aspersión y suelo saturado.
- Días sin fumigar y susceptibilidad del cultivo.
- Una plaga confirmada sin tratar, o una fumigación reciente.

La tarjeta muestra el riesgo (bajo, moderado o alto), los dos factores principales y la plaga probable del cultivo, como tizón tardío o mosca blanca en tomate, o gusano cogollero en maíz.

**Escaneo con el dron.** Es la misión `escaneo`: tarda 20 s por hectárea y no gasta agua. Al terminar, el clasificador de visión del dron devuelve:

```json
{ "parcela_id": "…", "plaga_detectada": true, "confianza": 0.72, "plaga": "Mosca blanca (Bemisia tabaci)", "severidad": "media" }
```

En la demo, la imagen se simula con un nivel de infestación oculto por parcela:

- Crece con humedad, temperatura favorable y follaje mojado.
- La fumigación elimina hasta 85%, según la superficie cubierta.
- La cámara la detecta a partir de 0.35.

Con una cámara real, solo hay que reemplazar `clasificarEscaneo()` y mandar el mismo JSON.

**Automático:**

1. Riego de emergencia.
2. Fumigación solo de plagas confirmadas por escaneo.
3. Escaneo de la parcela con mayor riesgo IA (≥60%) que no se haya escaneado en 6 h.

## 9.2 Alertas inteligentes y push notifications

El evaluador [`frontend/src/lib/alertas-inteligentes.ts`](./frontend/src/lib/alertas-inteligentes.ts) genera alertas con un id estable por condición:

| Alerta | Condición |
| --- | --- |
| Nivel de agua bajo / crítico | Cisterna < 35% / < 20% |
| Tanque del dron casi vacío | Dron ≤ 15% |
| Parcela en riesgo | Humedad del suelo bajo el mínimo del cultivo |
| Sequía probable | ≥ 3 días sin lluvia y sin lluvia en 3 días |
| Lluvia próxima: no riegues | Lluvia ≥ 60% o en 12 h estando en **manual** (indica cuántas válvulas cerrar) |
| Lluvia próxima (informativa) | Igual en automático; el riego se pospone salvo nivel crítico |
| Riesgo de plaga | Riesgo IA ≥ 70% sin escaneo reciente |
| Plaga detectada / sin plaga | Resultado del escaneo del dron |

El clima usado es el real de Open-Meteo: la página lo comparte con `api.setClimaEnVivo()`.

**Push** ([`frontend/src/lib/push.ts`](./frontend/src/lib/push.ts), [`frontend/src/hooks/useNotificaciones.ts`](./frontend/src/hooks/useNotificaciones.ts), [`frontend/public/sw.js`](./frontend/public/sw.js)):

- La campana del encabezado pide permiso, registra el service worker y suscribe el dispositivo con VAPID. Ya activa, sirve para enviar una notificación de prueba.
- Solo se notifica cuando una condición aparece; las alertas que ya estaban al abrir la app no se reenvían.
- Con backend, la push llega a todos los dispositivos suscritos aunque la app esté cerrada. Sin backend, se muestra una notificación local.
- El backend evita repetir la misma clave durante 30 minutos.
- La vibración depende de la severidad, y las alertas críticas permanecen visibles hasta que el usuario las atiende.
- El service worker ya no guarda en caché la app ni los chunks de Next.

**Requisitos:** las push necesitan HTTPS o `localhost`. En un teléfono conectado por IP de la red local (`http://192.168…`) el navegador no las permite. En iPhone, además, la app debe estar instalada en la pantalla de inicio.

**Backend:**

- `NotificationsModule`: `web-push`, claves VAPID en `backend/.vapid-keys.json` (ignorado por git; se generan solas) o en las variables `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`. Las suscripciones se guardan en la tabla `push_suscripciones`, que se crea sola.
- `DroneModule`: recibe el booleano del dron. Si hay plaga, crea o actualiza la alerta `plaga_detectada` y envía la push. Si el escaneo sale limpio, resuelve la alerta anterior y avisa "sin plaga".

## 10. Clima y decisiones de riego

El servicio meteorológico usa Open-Meteo cuando está disponible.

La interfaz muestra:

- Clima actual.
- Temperatura.
- Humedad relativa.
- Viento y dirección.
- Pronóstico por hora.
- Historial de los últimos cinco días.
- Día actual.
- Días siguientes.
- Probabilidad de lluvia.
- Próxima fecha de riego.
- Razón de la decisión de riego.

### Riego de emergencia

La decisión considera:

- Días consecutivos sin lluvia.
- Lluvia histórica.
- Lluvia pronosticada.
- Humedad de cada parcela.
- Nivel de agua disponible.
- Existencia de un cultivo.

Si se esperan precipitaciones, el riego puede posponerse. Si existe sequía y hay una parcela cultivada con humedad crítica, se selecciona como objetivo automático la parcela cultivada con menor humedad.

## 11. Cisternas y agua

La cisterna muestra:

- Nivel porcentual.
- Volumen actual.
- Capacidad total.
- Nivel crítico.
- Estado del sensor de nivel.

Reglas:

- El riego consume agua.
- La recarga manual requiere modo manual.
- Bajo 20% se bloquean los riegos automáticos no permitidos por seguridad.
- El tanque del dron también consume agua durante la recarga.

## 12. Alertas

Tipos contemplados:

- Humedad crítica.
- Nivel de reserva.
- Temperatura.
- Pronóstico.
- Dron vacío.
- Emergencia del dron.
- Prevención orgánica por humedad ambiental.

Las alertas tienen severidad:

- Baja.
- Media.
- Alta.
- Crítica.

Desde el dashboard se pueden marcar como leídas.

## 13. API principal

### Dashboard

```http
GET /dashboard/summary
```

Devuelve parcelas, sensores agregados, tanques, alertas, clima, eventos y estadísticas.

### Parcelas

```http
GET    /parcelas
GET    /parcelas/:id
POST   /parcelas
PUT    /parcelas/:id
DELETE /parcelas/:id
```

### Cultivos

```http
GET    /cultivos
GET    /cultivos/:id
POST   /cultivos
PUT    /cultivos/:id
DELETE /cultivos/:id
```

### Válvulas

```http
GET  /valves
POST /valves/:id/toggle
POST /valves/:id/mode
```

El frontend localiza la válvula asociada a una parcela antes de enviar un cambio al backend.

### Alertas

```http
GET  /alerts
POST /alerts/:id/read
```

### Clima

```http
GET /weather/forecast
```

### Dron e IA de plagas

```http
POST /dron/escaneos     # { parcela_id, plaga_detectada: boolean, confianza?, plaga?, severidad?, recomendacion? }
GET  /dron/escaneos     # último escaneo por parcela
```

### Sesiones

```http
POST /auth/login   # { email, password } → { token, usuario, expira }
GET  /auth/me      # Authorization: Bearer <token>
```

### Notificaciones push

```http
GET  /notificaciones/vapid-public-key
POST /notificaciones/suscribir      # PushSubscription del navegador
POST /notificaciones/desuscribir    # { endpoint }
POST /notificaciones/enviar         # { clave, titulo, mensaje, tipo?, severidad?, cooldown_min? }
POST /notificaciones/prueba
```

## 14. Base de datos

Las entidades principales están en [`backend/src/common/entities/`](./backend/src/common/entities/):

- `Parcela`.
- `Cultivo`.
- `Sensor`.
- `Valvula`.
- `TanqueAgua`.
- `EventoRiego`.
- `Alerta`.

La relación principal es:

```text
Parcela 1 ─── N Sensor
Parcela N ─── 1 Cultivo
Parcela 1 ─── N Valvula
Valvula 1 ─── N EventoRiego
```

## 15. Logo e identidad visual

El logo proporcionado está en:

[`frontend/public/agromai-logo.png`](./frontend/public/agromai-logo.png)

Se utiliza en:

- Encabezado principal.
- Favicon.
- Icono de dispositivos móviles.

La paleta está centralizada como tokens de Tailwind en [`frontend/src/app/globals.css`](./frontend/src/app/globals.css) (`@theme`). Los componentes usan los nombres de token (`bg-card`, `text-flax`, `border-applegreen/20`…) en lugar de hex sueltos.

Colores de marca:

| Token | Hex | Uso |
| --- | --- | --- |
| `darkgreen` | `#365004` | Botones secundarios, iconos de cultivo, estado saturado |
| `applegreen` | `#8DA432` | Acción principal, estado óptimo, bordes |
| `flax` | `#EDE383` | Texto secundario, estado bajo, selección |
| `goldenbrown` | `#925E06` | Alertas, estado crítico, detener riego |
| `creme` | `#FFFCE9` | Texto principal |

Superficies derivadas del verde oscuro (sin grises neutros):

| Token | Hex | Uso |
| --- | --- | --- |
| `ink` | `#10170a` | Fondo de página y texto sobre `applegreen` |
| `card` | `#18220c` | Tarjetas |
| `panel` | `#1f2c0f` | Bloques internos de una tarjeta |
| `field` | `#2a3a14` | Barras de progreso, campos deshabilitados |

Sobre fondo `applegreen` el texto es `ink` para mantener contraste legible.

## 15.1 PWA y diseño móvil

La app se diseña primero para teléfono (probada a 360, 390 y 768 px de ancho, sin desbordes horizontales) y se instala como PWA.

- **Íconos:** generados a partir del logo en `frontend/public/icons/`:
  - `icon-*` cuadrados.
  - `maskable-*` con margen de zona segura para Android.
  - `apple-touch-icon.png` (180 × 180).
- **Manifiesto** (`public/manifest.json`): nombre agromIA, `display: standalone`, orientación vertical, colores de la paleta.
- **Pantalla completa con notch:** `viewport-fit=cover`; encabezado, contenido, login y modales usan `env(safe-area-inset-*)`.
- **Encabezado:** fijo arriba y en una sola fila en el teléfono, con botones de ícono (nueva parcela, alertas, actualizar, salir). Los textos aparecen en pantallas grandes.
- **Indicadores:** en el teléfono se muestran en una tira de cuatro. Las pestañas usan nombres cortos (Parcelas, Métricas, Instalaciones).
- **Modales:** en el teléfono son hojas que suben desde abajo (máximo 92 % de alto, con scroll interno) y bloquean el scroll de la página. Desde 640 px vuelven a ser una ventana centrada.
- **Modelado 3D en el teléfono:**
  - Cámara centrada en la maqueta y etiquetas compactas (nombre corto y humedad).
  - Leyenda en dos columnas y altura de 360 px.
  - Sin sombras y con resolución limitada a 2× para cuidar la batería.
- **Táctil:**
  - Botones y selectores de al menos 36 px de alto, sin resaltado al tocar y sin zoom por doble toque.
  - Campos de 16 px para que iOS no haga zoom al enfocarlos.
  - El zoom con dos dedos sigue permitido por accesibilidad.
- **Alturas:** se usa `dvh` para que la barra del navegador móvil no corte la pantalla.

## 16. Elementos eliminados

Se eliminó el apartado visible de Tinkercad y sus archivos de documentación:

- `docs/tinkercad/README.md`
- `docs/tinkercad/arduino_riego.ino`
- `docs/tinkercad/serial_bridge.js`
- `docs/tinkercad/serial_bridge.py`

El simulador actual vive dentro de la aplicación y no requiere Tinkercad.

## 17. Validación realizada

Validaciones ejecutadas:

```bash
cd frontend && npm run build
cd backend && npm run build
git diff --check
```

Se verificó:

- Compilación frontend.
- Compilación backend.
- Tipado TypeScript.
- Carga del dashboard.
- Carga del logo.
- Historial de cinco días.
- Pronóstico futuro.
- Cambio de automático a manual.
- Bloqueo de controles en automático.
- Habilitación de controles en manual.
- Edición de parcela.
- Cambio de tipo de cultivo.
- Cambio a parcela en descanso.
- Control de válvula.
- Dron con una parcela objetivo.
- Consumo de agua.
- Retorno lógico del dron a base.
- Eliminación del panel Tinkercad.

## 18. Limitaciones actuales y siguientes mejoras

La demo mantiene localmente algunas variables que todavía no son persistidas completamente en el backend:

- Modo global de riego.
- Estado operativo completo del dron.
- Misión activa del dron.
- Estado físico del simulador.

Para producción se recomienda:

1. Crear entidades y endpoints específicos para el dron.
2. Persistir el modo global en backend.
3. Mover el simulador físico a un servicio independiente o proceso MQTT.
4. Asociar cada lectura de sensor a una marca de tiempo y dispositivo real.
5. Agregar autenticación y autorización por usuario o cooperativa.
6. Añadir validación DTO con `class-validator`.
7. Configurar ESLint de forma no interactiva.
8. Revisar y actualizar dependencias vulnerables sin aplicar cambios incompatibles automáticamente.
9. Reemplazar el polling por WebSockets para telemetría de producción.

