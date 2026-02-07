# MoneyTransfer SaaS

Aplicación SaaS para gestión de transferencias de dinero con cumplimiento de normativa italiana.

## Características Principales

### Funcionalidad Core
- **Multi-tenant**: Cada negocio opera de forma completamente independiente
- **Cumplimiento Legal**: Validación automática del límite de 999€ cada 8 días según normativa italiana
- **Verificación Inter-Negocios**: Sistema que verifica transferencias previas en otros negocios participantes
- **Multi-idioma**: Español, Inglés e Italiano con traducciones completas

### Gestión de Clientes
- Registro completo de clientes con documentación
- Tipos de documento: Pasaporte, DNI/Cédula, Permiso de Residencia
- Almacenamiento opcional de imágenes de documentos
- Validación automática de vencimiento de documentos

### Sistema de Transferencias
- Validación en tiempo real de elegibilidad del cliente
- Control del límite legal de 999€ cada 8 días
- Verificación cruzada entre negocios participantes
- Información limitada compartida entre negocios (solo nombre negocio, monto, fecha)
- Historial completo de transferencias por cliente

### Dashboard y Reportes
- Métricas en tiempo real: clientes, transferencias, montos
- Estadísticas diarias y mensuales
- Clientes al límite de transferencia
- Documentos vencidos
- Alertas sin leer

### Sistema de Alertas Legales
- Alertas automáticas por límite excedido
- Notificaciones de documentos vencidos o próximos a vencer
- Niveles de severidad: Info, Warning, Critical
- Sistema de resolución y seguimiento

### Roles y Permisos
- **Admin**: Acceso completo, gestión de usuarios, configuración del negocio
- **Operador**: Gestión de clientes y transferencias

### Seguridad y Cumplimiento
- Autenticación segura con Supabase Auth
- Row Level Security (RLS) para aislamiento total entre negocios
- Registro de auditoría para cumplimiento GDPR
- Encriptación de datos sensibles
- Protección de datos personales

### Personalización
- Logo personalizado por negocio
- Colores de marca configurables
- Preferencias de idioma por usuario

## Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Iconos**: Lucide React

## Base de Datos

### Tablas Principales
- `businesses`: Información de los negocios (tenants)
- `business_users`: Usuarios asociados a negocios
- `clients`: Clientes de cada negocio
- `transfers`: Transferencias realizadas
- `transfer_validations`: Validaciones inter-negocios
- `legal_alerts`: Alertas legales y de cumplimiento
- `audit_logs`: Registro de auditoría GDPR

### Funciones de Base de Datos
- `check_transfer_eligibility()`: Valida si un cliente puede transferir
- `get_business_stats()`: Obtiene estadísticas del negocio
- `get_client_transfer_history()`: Historial de transferencias del cliente
- `calculate_next_allowed_date()`: Calcula próxima fecha permitida

## Configuración

1. Configurar variables de entorno en `.env`:
```
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

2. Instalar dependencias:
```bash
npm install
```

3. Ejecutar en desarrollo:
```bash
npm run dev
```

4. Construir para producción:
```bash
npm run build
```

## Normativa Italiana

El sistema implementa la normativa italiana que establece:
- **Límite de transferencia**: Máximo 999€ por operación
- **Periodo de espera**: Mínimo 8 días entre transferencias
- **Verificación cruzada**: Control entre todos los negocios participantes
- **Documentación**: Validación obligatoria de identidad

## Flujo de Trabajo

### Registro de Nuevo Negocio
1. Usuario se registra con email y contraseña
2. Proporciona nombre del negocio
3. Sistema crea cuenta de negocio y usuario admin
4. Puede personalizar logo y colores

### Registro de Cliente
1. Operador ingresa datos del cliente
2. Escanea/sube documentos de identidad
3. Sistema valida información
4. Cliente queda registrado en el negocio

### Proceso de Transferencia
1. Seleccionar cliente existente
2. Sistema verifica elegibilidad automáticamente
3. Consulta base de datos inter-negocios
4. Si está habilitado, permite ingresar detalles
5. Valida límite de 999€
6. Procesa y registra transferencia
7. Actualiza próxima fecha permitida

### Verificación Inter-Negocios
- Cliente identificado por número de documento
- Sistema busca en TODOS los negocios
- Muestra información limitada: negocio, monto, fecha, días restantes
- Protege privacidad: NO comparte datos personales completos

## Seguridad

### Row Level Security (RLS)
Todas las tablas tienen políticas RLS que garantizan:
- Usuarios solo acceden a datos de su negocio
- Verificaciones inter-negocios controladas
- Información limitada en consultas cruzadas

### Auditoría GDPR
- Registro de todas las operaciones sensibles
- Tracking de accesos a datos personales
- Trazabilidad completa para cumplimiento

## Soporte Multi-idioma

El sistema soporta tres idiomas:
- **Español (es)**: Idioma por defecto
- **English (en)**: Traducción completa
- **Italiano (it)**: Traducción completa

Usuarios pueden cambiar idioma desde su perfil.

## Modelo de Negocio SaaS

La aplicación está diseñada para ofrecerse como:
- Suscripción mensual por negocio
- Datos completamente aislados entre negocios
- Escalable para múltiples tenants
- Personalización por negocio
- Control de estado de suscripción

## Próximas Funcionalidades

- Exportación de reportes (PDF, Excel, CSV)
- Panel de auditoría completo
- Notificaciones por email
- Gestión de múltiples usuarios por negocio
- API para integraciones
- Dashboard de administrador global
