# Checklist de pruebas de seguridad de Sellix

Este documento sirve como control previo a cada lanzamiento. Las pruebas deben
realizarse primero en un proyecto Firebase de `staging`, con usuarios y datos de
prueba. No se deben ejecutar pruebas de carga contra produccion ni contra un
proyecto ajeno.

## Datos de la ejecucion

| Campo | Valor |
| --- | --- |
| Version o commit | Pendiente |
| Fecha | Pendiente |
| Responsable | Pendiente |
| URL evaluada | Pendiente |
| Proyecto Firebase | Pendiente |
| Navegadores/dispositivos | Pendiente |

Estados permitidos: `PENDIENTE`, `APROBADO`, `FALLIDO`, `NO APLICA`.

## Linea base local - 19/06/2026

| Estado | Comprobacion | Resultado |
| --- | --- | --- |
| APROBADO | `npm run build` | Compilacion de produccion completada |
| FALLIDO | `npm run lint` | 15 errores y 13 advertencias preexistentes |
| APROBADO | `git ls-files .env` | `.env` no esta rastreado |
| APROBADO | Busqueda de patrones de secretos | Sin coincidencias en archivos rastreados |
| FALLIDO | `npm audit --omit=dev --audit-level=high` | 14 avisos: 4 moderados, 8 altos y 2 criticos |

Los avisos de dependencias provienen principalmente de las cadenas de Firebase,
React Router y jsPDF/DOMPurify. `npm audit` reporta que varios no tienen arreglo
disponible en las versiones resueltas; deben revisarse por alcance real y volver
a evaluarse en cada actualizacion de dependencias. No ejecutar `npm audit fix
--force` sin revisar los cambios incompatibles que pueda introducir.

## 1. Preparacion y compilacion

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Ejecutar `npm run build` | Compila sin errores | Log de consola |
| PENDIENTE | Ejecutar `npm run lint` | No hay errores de seguridad o logica | Log de consola |
| PENDIENTE | Ejecutar `npm audit --omit=dev` | No hay vulnerabilidades altas o criticas en produccion | Reporte de npm |
| PENDIENTE | Ejecutar `git ls-files .env` | No devuelve archivos | Captura o log |
| PENDIENTE | Buscar secretos con `git grep -n -E "(PRIVATE_KEY|SECRET_KEY|serviceAccount|BEGIN PRIVATE KEY)"` | No encuentra secretos reales | Log revisado |
| PENDIENTE | Revisar DevTools > Network en el build de produccion | No se exponen contrasenas, tokens persistentes ni datos de otro negocio | Captura |

Las claves `VITE_FIREBASE_*` y la site key de reCAPTCHA son identificadores del
cliente, no secretos. Aun asi, la API key debe estar restringida por dominio en
Google Cloud y la autorizacion real debe depender de Auth, App Check y reglas.

## 2. Autenticacion y forced browsing

Probar cada URL en una ventana privada y luego con cada rol.

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Abrir `/admin`, `/venta`, `/tecnico` y `/super-admin` sin sesion | Redirige al login sin mostrar datos | Capturas |
| PENDIENTE | Empleado abre rutas `/admin/*` | Acceso denegado y sin lecturas sensibles en Network | Captura y Network |
| PENDIENTE | Tecnico abre `/admin/*` y `/venta` | Acceso denegado | Captura |
| PENDIENTE | Admin abre `/super-admin` | Acceso denegado | Captura |
| PENDIENTE | Modificar manualmente la URL a una ruta inexistente | Se muestra la pagina 404, sin error tecnico ni datos internos | Captura |
| PENDIENTE | Cerrar sesion y usar Atras/Adelante | Las pantallas protegidas no vuelven a mostrar informacion | Video corto |
| PENDIENTE | Alterar `rol`, `negocioId` o `sucursalId` desde DevTools | Firestore rechaza la operacion; el frontend no es la barrera principal | Error `permission-denied` |

## 3. Aislamiento multiempresa y reglas Firestore

Preparar dos negocios de prueba, A y B, con un admin y una sucursal cada uno.

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Admin A consulta documentos de B por ID conocido | Firestore responde `permission-denied` | Log |
| PENDIENTE | Admin A intenta crear un documento con `negocioId` de B | Escritura rechazada | Log |
| PENDIENTE | Empleado cambia el `sucursalId` de una venta | Escritura rechazada | Log |
| PENDIENTE | Empleado intenta editar catalogo, usuarios o sucursales | Escritura rechazada | Log |
| PENDIENTE | Tecnico consulta pendientes que no sean de su negocio o giro | Lectura rechazada o resultado vacio segun las reglas | Log |
| PENDIENTE | Usuario no autenticado usa REST/SDK contra Firestore | Lectura y escritura rechazadas | Respuesta 403 |
| PENDIENTE | Venta offline se sincroniza despues de cambiar de usuario | Nunca se atribuye al usuario o negocio equivocado | Registro auditado |

Tambien se recomienda mantener pruebas automatizadas de reglas con Firebase
Emulator antes de modificar las reglas de produccion.

## 4. App Check y abuso automatizado

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Usar la aplicacion en todos los navegadores autorizados | App Check marca al menos 97% de solicitudes verificadas durante 24-48 h | Captura de consola |
| PENDIENTE | Abrir desde un dominio no autorizado | App Check no entrega un token valido | Log |
| PENDIENTE | Activar cumplimiento para Cloud Firestore en staging | La aplicacion normal funciona y solicitudes sin token son rechazadas | Captura y log |
| PENDIENTE | Repetir rapidamente login fallido | Firebase limita intentos; la UI no envia multiples solicitudes simultaneas | Network |
| PENDIENTE | Doble clic repetido en Cobrar/Agregar/Eliminar | Se registra una sola operacion | IDs y conteo en Firestore |
| PENDIENTE | Cortar internet mientras se pulsa Cobrar varias veces | Solo queda una venta offline por confirmacion | Cola local y Firestore |

App Check reduce clientes no autenticos, pero no sustituye rate limiting. Sin un
backend propio o Cloud Functions no existe un limite personalizado por usuario
para todas las escrituras. Esta limitacion debe registrarse como riesgo aceptado
hasta incorporar una capa de servidor.

## 5. Validacion de entradas y datos

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Ingresar valores vacios, negativos, cero y excesivamente grandes | La UI y las reglas rechazan valores invalidos | Capturas |
| PENDIENTE | Pegar HTML/JS en nombres, motivos y descripciones | Se muestra como texto; nunca se ejecuta | Captura |
| PENDIENTE | Usar cadenas de 1,000+ caracteres | Se rechazan o recortan segun el limite definido | Captura |
| PENDIENTE | Alterar precio, total, descuento o stock desde DevTools | Las reglas impiden cambios fuera del rol y estructura permitidos | Log |
| PENDIENTE | Reutilizar el mismo identificador de venta | No crea ventas duplicadas ni descuenta stock dos veces | Firestore |
| PENDIENTE | Intentar eliminar documentos auditables desde un rol no autorizado | Operacion rechazada | Log |

## 6. Privacidad y sesion

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Inspeccionar pantalla, errores y consola | No aparece correo del usuario, claves ni configuracion sensible | Captura |
| PENDIENTE | Cerrar sesion con ventas offline pendientes | Se advierte o sincroniza de forma segura; no migra datos a otra sesion | Video |
| PENDIENTE | Iniciar sesion como otro usuario en la misma PC | No ve cache ni datos del usuario anterior | Video |
| PENDIENTE | Dejar sesion inactiva el periodo definido por negocio | Se aplica la politica acordada de bloqueo/cierre de sesion | Video |
| PENDIENTE | Revisar PDF, Excel y ticket | Solo contienen datos necesarios y no exponen identificadores internos | Archivos de prueba |

## 7. Throttling de red y resiliencia offline

Usar DevTools > Network, perfiles `Slow 3G` y `Offline`.

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Login con Slow 3G | Hay estado de carga y no se duplican solicitudes | Video y Network |
| PENDIENTE | Buscar/agregar productos con Slow 3G | La interfaz sigue utilizable y usa cache cuando corresponde | Video |
| PENDIENTE | Realizar varias ventas offline | Se liberan los botones y cada venta se guarda una sola vez | Video |
| PENDIENTE | Recuperar conexion despues de varias ventas | Se sincronizan todas una vez y se conserva el orden/auditoria | Firestore |
| PENDIENTE | Abrir y cerrar la PWA mientras esta offline | El inventario cacheado sigue disponible y no se pierden ventas | Video |
| PENDIENTE | Simular conexion intermitente durante sincronizacion | No hay stock doblemente descontado ni ventas duplicadas | Firestore |

## 8. Carga y estres controlados

Ejecutar unicamente en staging, con presupuesto y alertas de cuota configurados.
Comenzar con carga pequena y detenerse si aumenta la tasa de errores o el costo.

| Estado | Prueba | Criterio de aprobacion | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | 5 usuarios concurrentes por 10 minutos | Error menor a 1%; p95 menor a 2 s en operaciones en linea | Reporte |
| PENDIENTE | 20 usuarios concurrentes por 10 minutos | Sin duplicados, bloqueo de UI ni perdida de datos | Reporte |
| PENDIENTE | Pico gradual de 5 a 50 usuarios | Degrada de forma controlada y se recupera al bajar carga | Grafica |
| PENDIENTE | Lectura de inventario grande de prueba | Solo se leen documentos del tenant/sucursal necesarios | Firestore Usage |
| PENDIENTE | Corte con volumen historico alto | Completa sin bloquear el navegador ni exceder cuotas | Video y metricas |
| PENDIENTE | Alcanzar un limite de cuota controlado | La UI muestra un error comprensible y permite reintentar | Captura |

No usar cuentas reales ni probar denegacion de servicio. Antes de cada ejecucion,
definir: maximo de usuarios, duracion, lecturas/escrituras estimadas, costo maximo
y condicion de parada.

## 9. Hosting, cabeceras y WAF

Estas pruebas aplican cuando Sellix tenga dominio y hosting de produccion.

| Estado | Prueba | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| PENDIENTE | Forzar HTTP | Redirige siempre a HTTPS | Captura |
| PENDIENTE | Revisar TLS | Certificado valido y protocolos actuales | Reporte |
| PENDIENTE | Revisar cabeceras | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy` y politica de frames | Reporte |
| PENDIENTE | Solicitudes con patrones XSS/SQLi/path traversal al hosting | WAF registra y bloquea sin afectar trafico legitimo | Evento WAF |
| PENDIENTE | Rafaga desde una IP de prueba | Rate limit responde 429 y luego se recupera | Log |
| PENDIENTE | Acceso desde dominios no autorizados | Firebase/Google rechaza el origen segun la configuracion | Log |
| PENDIENTE | Escaneo pasivo con OWASP ZAP | Sin hallazgos altos o criticos | Reporte ZAP |

Una PWA alojada directamente en Firebase no incorpora por si sola un WAF
configurable. Para aprobar esta seccion se necesita una capa frontal compatible,
por ejemplo Cloudflare, y reglas ajustadas al trafico real.

## 10. Criterio de salida

Una version puede promoverse a produccion cuando:

- No existen resultados `FALLIDO` de severidad alta o critica.
- Forced browsing y aislamiento multiempresa estan aprobados para todos los roles.
- App Check esta aplicado a Firestore despues de observar trafico legitimo.
- No hay secretos versionados ni vulnerabilidades altas/criticas sin aceptar.
- Las ventas online y offline no se duplican bajo doble clic o red intermitente.
- Existe respaldo/exportacion probado y un procedimiento de recuperacion.
- Los riesgos pendientes tienen responsable, fecha y mitigacion documentados.

## Registro de hallazgos

| ID | Severidad | Prueba | Hallazgo | Responsable | Fecha limite | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | Pendiente | Pendiente | Pendiente | Pendiente | Pendiente | Abierto |
