# DriverPro – Visión General del Proyecto

DriverPro es una solución integral para la gestión de flotillas de transporte, diseñada para complementar y extender las capacidades del módulo estándar de Flota (fleet) de Odoo. El objetivo principal es ofrecer un control avanzado sobre tarjetas de recarga de viajes, asignaciones dinámicas de vehículos a choferes, y un sistema robusto de registro y seguimiento de viajes, todo ello con una arquitectura moderna y flexible.

## Componentes del Proyecto

- **Módulo Odoo (`custom-addons/driverpro/`)**: Extiende Odoo para la administración interna, permitiendo a los administradores gestionar vehículos, tarjetas, recargas, asignaciones y viajes, con seguridad y reglas de acceso avanzadas.
- **Backend API para Choferes (`back/`)**: Servicio independiente que actúa como intermediario entre el cliente de choferes y la API de Odoo, asegurando que los conductores solo accedan a la información y acciones permitidas.
- **Frontend para Choferes (`front/`)**: Aplicación React/Vite que ofrece una interfaz moderna y sencilla para los choferes, permitiéndoles gestionar sus viajes sin acceder al panel administrativo de Odoo.

## Propósito y Alcance

- **Administradores**: Usan Odoo para la gestión completa de la flotilla, recargas, asignaciones y reportes.
- **Choferes**: Acceden únicamente al cliente externo (no al panel de Odoo), donde pueden ver sus asignaciones, iniciar y gestionar viajes, y consultar su historial.

## Seguridad

- Los choferes se autentican mediante usuarios tipo "portal" o "interno limitado" en Odoo, pero solo acceden a la API a través del cliente externo.
- El acceso a Odoo UI está restringido para choferes; solo pueden interactuar mediante la API y el cliente dedicado.
- Se implementan grupos y reglas de acceso estrictas para garantizar la privacidad y seguridad de la información.

## Flujo General

1. El administrador configura vehículos, tarjetas y recargas en Odoo.
2. El chofer inicia sesión en el cliente DriverPro.
3. El sistema valida la asignación chofer ↔ vehículo ↔ tarjeta.
4. El chofer puede crear, iniciar, pausar, reanudar, finalizar o cancelar viajes, todo desde el cliente externo.
5. El consumo de créditos y la gestión de estados de viaje se realiza automáticamente según las reglas del negocio.

## Estructura del Repositorio

```
driverpro/
├─ back/                  # Backend API del cliente de choferes
├─ front/                 # Frontend React/Vite para choferes
├─ config/                # Configuraciones (nginx, envs, etc.)
├─ custom-addons/
│  └─ driverpro/          # Módulo Odoo principal
│     ├─ __manifest__.py
│     ├─ __init__.py
│     ├─ models/
│     ├─ security/
│     ├─ views/
│     ├─ data/
│     └─ controllers/
├─ odoo-source/           # Core de Odoo (ignorado en Git si no se usa)
└─ docker-compose.yml     # Stack de Odoo
```

## Próximos Pasos

- Implementar modelos y lógica en el módulo Odoo.
- Desarrollar la API backend y el frontend para choferes.
- Integrar autenticación segura y reglas de acceso.
- Crear reportes y métricas avanzadas.

---

Para más detalles sobre los modelos, flujos y endpoints, consulta el archivo `ProDriver_Contexto.md`.
