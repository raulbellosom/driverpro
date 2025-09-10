1. Qué se agrega (solo lo necesario)
   1.1 En driverpro.trip (modelo existente)

Campos nuevos:

is_recharge_trip (Boolean) → etiqueta en UI: “Viaje con recarga (origen en zona)”.

zone_origin (Selection/Char opcional) → si quieres etiquetar “Aeropuerto / Otra zona / Ninguna” (solo para filtros/reportes).

Comportamiento mínimo:

Al iniciar o confirmar un viaje:

Si is_recharge_trip = True → crear un driverpro.card_credit consume (monto -1), related_trip_id = este viaje. Dejarlo posted (o draft y postear al completar, como prefieras).

Validar saldo con lo que ya tienes (balance_logical + validaciones de card_credit).

Para viajes dropoff (no origen de zona) → no hacer consumo.

Esto respeta tu esquema: el consumo se registra con driverpro.card_credit (no toco tu legacy movement), y el viaje solo marca si requiere recarga.

1.2 “Entré a zona a buscar cliente (≤2h)” — sin crear un modelo nuevo

Usaremos solo driverpro.card_credit en borrador para no introducir tablas nuevas:

Nuevos campos en driverpro.card_credit:

is_wait_entry (Boolean) → marca que el movimiento corresponde a “entrada para buscar cliente”.

wait_started_at (Datetime)

wait_limit_minutes (Integer, default p. ej. 120; configurable por ir.config_parameter)

Flujo:

Botón en app del chofer: “Entré a zona a buscar” → crea UN card_credit:

move_type = 'consume', amount = -1, state = 'draft',

is_wait_entry = True, wait_started_at = now, wait_limit_minutes = config.

Botón: “Conseguí cliente” → al crear/iniciar un viaje de origen en zona, reutilizas ese draft:

Lo vinculas al viaje (related_trip_id) y lo pones en posted. (Si el viaje ya posteó su propio consume, simplemente cancela/elimina el draft para no duplicar).

Botón: “Salir sin cliente”:

Si now - wait_started_at ≤ wait_limit_minutes → cancelar (eliminar) el draft (no afecta saldo y deja rastro en chatter si quieres).

Si > wait_limit_minutes → postear el consume (queda cobrada la recarga).

Sin cron obligatorio: todo se resuelve con las acciones del chofer. (Opcional: un aviso a t-15/t-5 podría añadirse luego).

Ventaja: no agregamos un modelo de “sesión” ni “log”; el único registro es un card_credit en borrador que se convierte o se desecha según el desenlace. Tu vista y seguridad de card_credit ya están avanzadas.

2. Cambios por archivo (breve y puntual)
   2.1 models/trip.py

Añadir is_recharge_trip = fields.Boolean(...).

En el método que ya uses para “iniciar/confirmar” viaje (p. ej. action_start o similar):

Si is_recharge_trip:

Buscar si existe un card_credit draft con is_wait_entry=True del mismo chofer/vehículo/tarjeta reciente → si sí, completar ese (set related_trip_id y post()).

Si no existe draft → crear nuevo card_credit consume posted con related_trip_id=this.

No tocar legacy driverpro.card.movement.

2.2 models/card_credit.py (ya existe)

Agregar campos: is_wait_entry, wait_started_at, wait_limit_minutes.

Pequeñas ayudas:

Método start_wait(card_id, limit_minutes) → crea el draft consume con flags.

Método finish_wait(success: bool):

Si success → post y opcionalmente setear related_trip_id si ya lo tienes.

Si sin cliente y dentro de tiempo → unlink (draft).

Si sin cliente y fuera de tiempo → post (consume).

Mantener tus validaciones actuales (monto negativo para consume, no eliminar posted, etc.).

2.3 Vistas (mínimos)

Trip form: checkbox “Viaje con recarga (origen en zona)”.

Driver app (portal/API):

Endpoint POST /wait/start → llama a CardCredit.start_wait(...).

Endpoint POST /wait/finish → indica success=True/False.

(Opcional) un contador simple en UI, sin lógica server-side adicional.

2.4 Parámetros (ir.config_parameter)

zone.wait_limit_minutes (default 120).

(Opcional) zone.wait_alerts_minutes (p. ej. “15,5”) — solo si más adelante quieres notificaciones.

3. Reglas de negocio resultantes (simples)

Viaje con recarga:

Checkbox ON → consume -1 con card_credit (posted). Si existía draft por “entré a zona”, se reutiliza.

Entré a zona a buscar (≤2h):

Crea draft consume (-1) con marca de espera y timestamp.

Si consiguió cliente → ese draft se postea (o se reutiliza al marcar viaje con recarga).

Si sale sin cliente:

Dentro del límite → se elimina el draft (no afecta saldo).

Fuera del límite → se postea el consume (se cobra).

4. Por qué esto cumple con lo que pediste

Formularios sencillos: solo un checkbox en viaje y dos botones en el flujo del chofer (“Entré a zona”, “Salir sin cliente/Conseguí cliente”).

Sin nuevos modelos: nos apoyamos en lo que ya tienes:

Tarjeta: driverpro.card con saldo lógico y smart buttons.

Movimientos: driverpro.card_credit con draft/posted, relación a viaje y vistas listas.

Auditable: los consumos confirmados quedan en posted; los intentos sin cliente no afectan saldo y pueden borrarse al ser drafts (si quieres rastro, podemos postear un mensaje en chatter antes de borrar).

5. Checklist final (rápido)

Campo is_recharge_trip en driverpro.trip + lógica de consumo al iniciar/confirmar viaje.

Campos is_wait_entry, wait_started_at, wait_limit_minutes en driverpro.card_credit + helpers start_wait/finish_wait.

Endpoint(s) mínimos para chofer: start wait / finish wait.

Param zone.wait_limit_minutes (default 120).

Vista de viaje: checkbox “Viaje con recarga”.

(Opcional) UI contador en PWA y aviso simple (sin cron).
