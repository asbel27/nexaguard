# NexaGuard: web + escáner + paneles de cliente y administrador

Sin dependencias: solo necesitas **Node.js 18 o superior**. No hay que ejecutar `npm install`.

## Estructura

```
nexaguard/
├─ server.js        ← arranca todo (web, escáner y API)
├─ scanner.js       ← el escáner de sitios (solo lectura)
├─ app.js           ← cuentas, roles, planes, pagos, soporte, monitoreo
├─ paypal.js        ← cliente de la API de PayPal (pago automático, opcional)
├─ store.js         ← guarda los datos en data/db.json
├─ package.json     ← permite "npm start"
├─ .vscode/launch.json  ← permite arrancar con F5
├─ public/
│  ├─ index.html    ← la web pública (con el escáner)
│  └─ panel.html    ← los paneles de cliente y de administrador
└─ data/            ← se crea sola al arrancar (datos y copias de seguridad)
```

## Arrancar

En VS Code: Archivo → Abrir carpeta → la carpeta que contiene `server.js`. Luego, en la terminal:

```
npm start
```

- Web: http://localhost:8787
- Paneles: http://localhost:8787/panel

**La primera vez** se crea la cuenta de administrador y su contraseña se muestra **una sola vez** en la terminal.
Para elegir tú el correo y la contraseña:

```
# PowerShell (Windows)
$env:ADMIN_EMAIL="tu@correo.com"; $env:ADMIN_PASSWORD="UnaClaveLarga123"; npm start

# Mac / Linux
ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD=UnaClaveLarga123 npm start
```

Entra a `/panel` con esa cuenta y cámbiala en Ajustes.

## Cómo funciona

**Roles.** Cada persona ve solo lo suyo:

| | Cliente | Administrador |
|---|---|---|
| Resumen | Su plan, estado, avance del servicio, alertas | Clientes, pagos pendientes, ingresos, alertas de sitios infectados, solicitudes en espera |
| Sitios y análisis | Agrega sus sitios y los analiza (según su plan) | Ve los análisis de todos los clientes |
| Soporte | Abre solicitudes y conversa con el equipo | Responde y cambia el estado; las prioritarias van primero |
| Plan y pagos | Ve sus pedidos y pagos; puede pedir otro plan | Registra pagos, avanza el servicio, crea pedidos y clientes |
| Cuenta | Sus datos y contraseña | Instrucciones de pago, planes, exportar clientes (CSV) |

**Flujo de un cliente**

1. En la web pública elige un plan y crea su cuenta (o entra directo a `/panel`).
2. Su plan queda **pendiente de pago**: ve las instrucciones de pago, puede registrar su sitio y escribirte.
3. Tú registras el pago en su ficha (Clientes → cliente → Registrar pago). El plan pasa a **activo**.
4. Vas marcando el **avance del servicio** (4 etapas) y, al terminar, "Entregado".
5. Según el plan, conserva acceso tras la entrega (Rescate 14 días, Blindaje 30 días de garantía).
   En **Guardián**, la suscripción sigue activa mientras registres cada pago mensual.

**Qué incluye cada plan.** Se define en `app.js`, constante `PLANS` (precios, sitios, análisis por mes,
monitoreo, soporte prioritario, días de acceso tras la entrega). Cámbialos ahí y reinicia:

| Plan | Sitios | Análisis del escáner | Monitoreo automático | Soporte |
|---|---|---|---|---|
| Rescate | 1 | 3 al mes | No | Normal |
| Rescate + Blindaje | 1 | 10 al mes | No | Prioritario |
| Guardián | 1 | Ilimitados | **Sí, cada 24 h** | Prioritario |

El monitoreo de Guardián analiza solo los sitios del cliente y avisa en el panel del administrador cuando un
sitio pasa a "infectado" o "sospechoso". Funciona mientras el servidor esté encendido.

## Cobrar con PayPal (automático)

Si activas PayPal, al elegir un plan se abre directamente el botón de pago. En cuanto la persona
paga, el sistema **crea su cuenta sola** (con el nombre y el correo que confirma PayPal) y su plan
queda **activo al instante**, sin que tengas que registrar nada a mano. Si ya tenía una cuenta con
ese correo, el pago se asocia a esa cuenta en vez de crear una repetida. Todo el dinero pasa
directamente de tu cliente a tu cuenta de PayPal; este sistema nunca lo retiene.

**Para activarlo**, crea una app en https://developer.paypal.com/dashboard/applications (es gratis)
y copia su Client ID y su Secret. Luego arranca así:

```
# PowerShell (Windows)
$env:PAYPAL_CLIENT_ID="tu_client_id"; $env:PAYPAL_CLIENT_SECRET="tu_secret"; $env:PAYPAL_MODE="sandbox"; npm start

# Mac / Linux
PAYPAL_CLIENT_ID=tu_client_id PAYPAL_CLIENT_SECRET=tu_secret PAYPAL_MODE=sandbox npm start
```

- **Pruébalo primero en `sandbox`**: son cuentas de PayPal de mentira para hacer compras de prueba,
  sin dinero real. El propio panel de desarrollador de PayPal te da un comprador y un vendedor de
  prueba. Cuando confirmes que todo funciona, cambia `PAYPAL_MODE=live` y usa las credenciales de
  tu app en modo real (`live`, no `sandbox`, dentro del panel de PayPal).
- **Nunca escribas el Secret dentro de ningún archivo del proyecto** ni lo compartas por chat o
  correo: solo va como variable de entorno, como en el ejemplo de arriba. Si alguna vez se expone
  por accidente, entra al panel de PayPal y genera uno nuevo (regenerarlo no afecta al Client ID).
- Sin estas variables, la web sigue funcionando exactamente igual que antes: el botón de PayPal no
  aparece y las cuentas se manejan con el flujo manual (el cliente se registra, tú registras su pago).
- **Verificación de seguridad**: antes de activar un pago, el servidor vuelve a consultar a PayPal
  para confirmar que el cobro se completó y que el monto coincide exactamente con el del plan. Un
  clic repetido o un reintento del navegador nunca cobra ni activa dos veces.

## Otros medios de pago

- **Binance Card**: no se integra por separado. Es una tarjeta de débito que usan tus clientes para
  gastar su saldo de Binance; para tu negocio llega como un cobro normal de Visa o Mastercard. En
  cuanto aceptas tarjetas por PayPal, ya la aceptas también.
- **Binance Pay**: tiene una API para negocios, pero exige que la cuenta de Binance del vendedor
  pase antes una verificación de comercio (KYB) directamente con Binance. Si la obtienes, se puede
  agregar con la misma lógica que PayPal (este proyecto ya separa el "cliente de pago" del resto
  del código en `paypal.js`, así que sumar otro proveedor no requiere rehacer nada).

## Lo que este sistema NO hace (y conviene saberlo)

- **Sin PayPal activado, no cobra.** Los pagos se registran a mano (transferencia, efectivo, etc.).
- **No envía correos.** Los avisos aparecen en los paneles. No hay recuperación automática de contraseña:
  el administrador restablece la contraseña desde la ficha del cliente y le entrega una temporal.
- **No guarda contraseñas de los sitios de tus clientes.** Pídeselas por un canal seguro y no las anotes en el sistema.
- **Un solo servidor.** Los datos viven en `data/db.json`, suficiente para cientos de clientes. Si creces,
  se migra a una base de datos.

## Datos y privacidad

- Los datos están en `data/db.json` (permisos solo para el propietario). Se hace una copia diaria en `data/backups/` (las últimas 14). **Respalda esa carpeta.**
- Las contraseñas se guardan con `scrypt` (nunca en texto plano) y las sesiones con hash.
- El administrador puede **eliminar a un cliente y todos sus datos** (Clientes → cliente → Eliminar).
- El registro pide aceptar el tratamiento de datos. Redacta tu aviso de privacidad y tus términos según la ley de tu país.

## Seguridad incorporada

- Cookies `HttpOnly` + `SameSite=Lax` (y `Secure` con HTTPS). Protección anti-CSRF (cabecera propia + verificación de origen).
- Límite de intentos de acceso, de registros y de solicitudes. Mensaje único para "correo o contraseña incorrectos".
- Aislamiento total entre clientes: cada consulta comprueba a quién pertenece el dato.
- El panel se sirve con Content-Security-Policy y sin poder incrustarse en otras webs. Todo texto se muestra como texto (sin HTML), así que los mensajes de los clientes no pueden ejecutar código.
- El escáner bloquea redes privadas, metadatos de la nube y redirecciones peligrosas (anti-SSRF).

## Publicarlo en internet

1. Un servidor con Node.js 18+ (VPS o servicio que ejecute Node) y **HTTPS** (nginx, Caddy o el proveedor). Manténlo activo con pm2 o systemd.
2. Detrás de un proxy: `TRUST_PROXY=1`. Si las cookies no se marcan como seguras, añade `SECURE_COOKIE=1`.
3. La web y los paneles deben servirse **desde el mismo dominio** (el servidor ya lo hace). Poner la web en un hosting y el servidor en otro dominio no admite cuentas.
4. Configura tus datos de contacto (WhatsApp, correo) en `public/index.html` (bloque `CONFIG`).

## Variables de entorno (todas opcionales)

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | 8787 | Puerto |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | (se genera) | Cuenta de administrador inicial |
| `DATA_DIR` | ./data | Dónde se guardan los datos |
| `SECURE_COOKIE` | automático | `1` fuerza cookies solo-HTTPS |
| `TRUST_PROXY` | 0 | `1` si hay proxy/Cloudflare delante |
| `RATE_PER_HOUR` | 8 | Análisis públicos por IP y hora (escáner de la web) |
| `MAX_CONCURRENT` | 4 | Análisis simultáneos |
| `SAFE_BROWSING_KEY` | (vacío) | Clave de Google Safe Browsing (opcional) |
| `ENABLE_DNSBL` | 1 | `0` desactiva la consulta a Spamhaus DBL |
| `DNS_SERVERS` | 1.1.1.1,8.8.8.8 | DNS públicos que usa el escáner (`off` = los del sistema) |
| `PARCHE_ALLOW_PRIVATE` | 0 | Solo para probar en tu PC un WordPress local. **Nunca en un servidor público** |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | (vacío) | Credenciales de tu app de PayPal. Sin ellas, el pago automático queda desactivado |
| `PAYPAL_MODE` | sandbox | `sandbox` para pruebas sin dinero real, `live` para cobros reales |

## Escáner de sitios

Ver la sección "Escanea tu sitio ahora" de la web y el panel del cliente. Solo ve lo público: no lee los archivos
dentro del servidor ni la base de datos, y compara versiones (no consulta bases de vulnerabilidades).
Un resultado "limpio" significa "no vimos nada desde fuera". Solo se debe analizar sitios propios o con autorización.

## Pruebas realizadas

Se verificaron con pruebas automáticas: cuentas y sesiones, aislamiento entre clientes (intentos de acceder a datos
ajenos), límites por plan, pagos y activación, soporte, monitoreo automático, borrado de datos, y los paneles y la web
en un navegador real (escritorio y móvil). La integración de PayPal se probó contra un servidor de PayPal simulado
(creación de cuenta automática, reutilizar cuenta existente por correo, rechazo si el monto no coincide, y que un
pago nunca se active dos veces), incluida la interfaz completa en el navegador. **No se pudo probar contra los
servidores reales de PayPal ni de WordPress.org** por no tener acceso a internet en este entorno: antes de cobrar
de verdad, haz una compra de prueba completa en modo `sandbox`.
