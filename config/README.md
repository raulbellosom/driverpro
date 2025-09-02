# Configuración de Ambientes - DriverPro

## Archivos de Configuración

### Desarrollo Local

- **Archivo**: `config/odoo.dev.conf` (versionado en Git)
- **Características**:
  - `workers = 2` (para debugging)
  - `proxy_mode = True`
  - Puertos locales: 18069, 18072
  - Logs detallados

### Producción

- **Archivo**: `config/odoo.conf` (NO versionado, ignorado por Git)
- **Características**:
  - Workers optimizados
  - Configuración segura
  - Puertos estándar: 8069, 8072

## Cómo Usar

### 1. Desarrollo Local

```bash
# El .env por defecto usa desarrollo
ENVIRONMENT=development
ODOO_CONFIG_FILE=odoo.dev.conf

# Levantar containers
docker compose up -d
```

### 2. Producción

```bash
# 1. Crear config/odoo.conf manualmente (no se versiona)
cp config/odoo.dev.conf config/odoo.conf

# 2. Editar config/odoo.conf con valores de producción:
#    - Cambiar contraseñas
#    - Ajustar workers
#    - Configurar proxy_mode, etc.

# 3. Crear .env para producción
ENVIRONMENT=production
ODOO_CONFIG_FILE=odoo.conf
# ... otras variables de producción

# 4. Levantar
docker compose up -d
```

## Ventajas de este Enfoque

✅ **Seguridad**: `odoo.conf` con credenciales reales no se versiona  
✅ **Flexibilidad**: Un solo `docker-compose.yml` para ambos ambientes  
✅ **Simplicidad**: Solo cambiar variables en `.env`  
✅ **Versionado**: `odoo.dev.conf` se mantiene en Git como referencia

## Variables de Ambiente Clave

- `ENVIRONMENT`: `development` | `production`
- `ODOO_CONFIG_FILE`: `odoo.dev.conf` | `odoo.conf`
- `ODOO_HTTP_PORT`: `18069` (dev) | `8069` (prod)
- `ODOO_LONGPOLLING_PORT`: `18072` (dev) | `8072` (prod)
