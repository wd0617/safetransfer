# 🔒 Sistema de Seguridad - SafeTransfer

## Descripción General

SafeTransfer implementa un sistema de seguridad multinivel diseñado para proteger datos sensibles, prevenir accesos no autorizados y detectar actividades fraudulentas en tiempo real.

---

## 🛡️ Características de Seguridad Implementadas

### 1. **Autenticación Robusta**

#### Protección contra Fuerza Bruta
- **Seguimiento de intentos fallidos**: Todos los intentos de inicio de sesión fallidos se registran con IP, dispositivo y timestamp
- **Bloqueo automático**: Después de 5 intentos fallidos en 15 minutos, la cuenta se bloquea temporalmente por 60 minutos
- **Notificaciones de seguridad**: Se generan alertas automáticas para patrones sospechosos

#### Validación de Cuenta
```typescript
// Antes de cada inicio de sesión:
- Verificar si la cuenta está bloqueada
- Validar credenciales con Supabase Auth
- Registrar intento fallido si es necesario
- Trackear sesión exitosa con información del dispositivo
```

### 2. **Gestión de Sesiones Seguras**

#### Seguimiento de Dispositivos
Cada sesión incluye:
- **Token único de sesión**
- **Dirección IP**
- **User Agent** (navegador/dispositivo)
- **Device Fingerprint** (huella digital única del dispositivo)
- **Última actividad**
- **Fecha de expiración**

#### Múltiples Sesiones Activas
- Los usuarios pueden ver todas sus sesiones activas
- Capacidad de invalidar sesiones remotamente
- Detección automática de inicio de sesión desde nueva ubicación

### 3. **Control de Acceso Basado en Roles (RBAC)**

#### Roles Disponibles:
- **SuperAdmin**: Acceso completo al sistema, gestión de negocios, monitoreo de seguridad
- **Admin**: Gestión completa del negocio propio
- **Operator**: Operaciones diarias (crear clientes, transferencias)

#### Validación de Permisos:
```typescript
// Antes de operaciones sensibles:
await validateBusinessAccess(userId, businessId);
await validateRole(userId, 'admin'); // o 'operator'
```

### 4. **Rate Limiting**

Límites implementados por tipo de acción:

| Acción | Máx. Intentos | Ventana de Tiempo |
|--------|---------------|-------------------|
| Login | 5 | 15 minutos |
| Password Reset | 3 | 60 minutos |
| Transfer Creation | 10 | 60 minutos |
| Data Export | 5 | 60 minutos |
| Sensitive View | 50 | 60 minutos |

### 5. **Auditoría Completa**

#### Logs de Acceso a Datos Sensibles
Se registra automáticamente:
- **Quién** accedió (user_id)
- **Qué** tipo de datos (client, transfer, document)
- **Cuándo** (timestamp preciso)
- **Desde dónde** (IP address)
- **Por qué** (razón de acceso opcional)
- **Resultado** (si se devolvieron datos)

#### Tipos de Acciones Auditadas:
- `view` - Visualización de datos
- `export` - Exportación de datos
- `modify` - Modificación de datos
- `delete` - Eliminación de datos

### 6. **Detección de Fraude**

#### Patrones Monitoreados:

**Actividad de Transferencias Inusuales**
```typescript
// Se genera alerta si:
- Monto es 3x mayor que el promedio del cliente
- Múltiples transferencias en corto período
- Transferencia cerca del límite legal (€999)
```

**Exportación Masiva de Datos**
```typescript
// Se genera alerta si:
- 5+ exportaciones en 1 hora
- Exportación de datos de múltiples clientes
- Acceso desde ubicación inusual
```

**Inicio de Sesión Sospechoso**
```typescript
// Se genera alerta si:
- Login desde nueva ubicación geográfica
- Múltiples IPs en corto período
- Cambio drástico en user agent
```

### 7. **Alertas de Seguridad en Tiempo Real**

#### Tipos de Alertas:

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| `suspicious_login` | High | Login desde ubicación inusual |
| `multiple_failed_logins` | High | 5+ intentos fallidos |
| `unusual_transfer_pattern` | Medium | Transferencia anómala |
| `data_export` | High | Exportación masiva de datos |
| `privilege_escalation` | Critical | Cambio de permisos |
| `account_locked` | Medium | Cuenta bloqueada automáticamente |

### 8. **Recuperación de Contraseña Asistida**

#### Para Usuarios Normales:
- Sistema estándar de reset por email (próximamente)

#### Para SuperAdmin:
- **Asistencia directa**: El SuperAdmin puede resetear contraseñas
- **Registro completo**: Cada reset asistido se registra en auditoría
- **Alerta de seguridad**: Se genera alerta de "privilege_escalation"
- **Verificación de identidad**: SuperAdmin debe verificar identidad antes de proceder

**Flujo de Reset Asistido:**
1. Negocio contacta a SuperAdmin
2. SuperAdmin verifica identidad del solicitante
3. SuperAdmin accede a "Recuperación de Contraseña" en panel
4. Ingresa email y nueva contraseña
5. Sistema valida usuario existe y está activo
6. Contraseña se actualiza
7. Se registra en `password_reset_requests` con flag `assisted_by_superadmin`
8. Se crea alerta de seguridad automática

### 9. **Protección de Datos Sensibles**

#### Cifrado en Tránsito:
- Todas las comunicaciones usan HTTPS/TLS
- Headers de seguridad configurados

#### Acceso Restringido:
- Row Level Security (RLS) en todas las tablas
- Políticas estrictas por negocio
- SuperAdmin tiene acceso global auditado

#### GDPR Compliance:
- Registro detallado de acceso a datos personales
- Justificación requerida para accesos sensibles
- Capacidad de auditoría completa

---

## 📊 Tablas de Seguridad

### `security_sessions`
Todas las sesiones activas del sistema

### `failed_login_attempts`
Histórico de intentos de login fallidos

### `account_lockouts`
Cuentas temporalmente bloqueadas

### `rate_limit_tracking`
Control de límites de uso por acción

### `password_reset_requests`
Registro de todos los resets de contraseña

### `security_alerts`
Alertas de seguridad generadas automáticamente

### `sensitive_data_access_log`
Log completo de acceso a datos sensibles (GDPR)

---

## 🎯 Para SuperAdmins

### Dashboard de Seguridad

Acceso: **SuperAdmin Panel → Seguridad**

**Métricas Visibles:**
- Alertas críticas sin resolver
- Alertas de alta prioridad
- Cuentas bloqueadas actualmente
- Intentos de login fallidos recientes

**Acciones Disponibles:**
- Resolver alertas de seguridad
- Desbloquear cuentas manualmente
- Ver detalles de intentos fallidos
- Exportar logs de seguridad

### Recuperación de Contraseña

Acceso: **SuperAdmin Panel → Recuperación de Contraseña**

**Precauciones:**
⚠️ Esta es una acción de alto privilegio
⚠️ Siempre verificar identidad antes de proceder
⚠️ Todas las acciones quedan registradas
⚠️ Se generan alertas automáticas

**Proceso Recomendado:**
1. Solicitar identificación oficial del negocio
2. Verificar datos de registro (email, nombre de negocio)
3. Confirmar que la solicitud es legítima
4. Proceder con el reset
5. Confirmar con el negocio que el reset fue exitoso

---

## 🔧 Para Desarrolladores

### Uso del Hook de Seguridad

```typescript
import { useSecurity } from '../hooks/useSecurity';

function MyComponent() {
  const { logDataAccess, reportSuspiciousActivity } = useSecurity();

  const handleViewClient = async (clientId: string) => {
    // Registrar acceso a datos sensibles
    await logDataAccess('view', 'client', clientId);

    // ... mostrar datos del cliente
  };

  const handleExportData = async () => {
    await logDataAccess('export', 'client', clientId, 'Generación de reporte mensual');

    // ... exportar datos
  };

  const handleSuspiciousAction = async () => {
    await reportSuspiciousActivity(
      'Usuario intentó acceder a datos de otro negocio',
      'high'
    );
  };
}
```

### Validar Acceso a Negocio

```typescript
import { validateBusinessAccess, validateRole } from '../lib/security';

// Antes de operaciones sensibles:
const hasAccess = await validateBusinessAccess(userId, businessId);
if (!hasAccess) {
  throw new Error('Access denied');
}

// Validar rol específico:
const isAdmin = await validateRole(userId, 'admin');
if (!isAdmin) {
  throw new Error('Admin privileges required');
}
```

### Verificar Rate Limit

```typescript
import { checkRateLimit } from '../lib/security';

const { allowed, resetAt } = await checkRateLimit(userId, 'transfer_create');

if (!allowed) {
  throw new Error(`Rate limit exceeded. Try again at ${resetAt}`);
}

// Proceder con la operación...
```

### Generar Alerta de Seguridad

```typescript
import { createSecurityAlert } from '../lib/security';

await createSecurityAlert({
  alert_type: 'unusual_api_activity',
  severity: 'medium',
  user_id: userId,
  business_id: businessId,
  description: 'Usuario realizó 50 consultas en 1 minuto',
  metadata: {
    query_count: 50,
    time_window: '1 minute',
  },
});
```

---

## 📈 Métricas y Monitoreo

### KPIs de Seguridad

Monitorear regularmente:
- **Tasa de intentos fallidos**: < 5% de total de logins
- **Cuentas bloqueadas**: < 1% de usuarios activos
- **Alertas críticas sin resolver**: 0
- **Tiempo de resolución de alertas**: < 24 horas
- **Exportaciones de datos**: Revisar justificaciones

### Revisión de Logs

**Frecuencia Recomendada:**
- Alertas críticas: Inmediato
- Alertas altas: Diario
- Intentos fallidos: Semanal
- Acceso a datos sensibles: Mensual (auditoría completa)

---

## 🚨 Respuesta a Incidentes

### Cuenta Comprometida

1. **Bloquear inmediatamente** desde panel de seguridad
2. **Invalidar todas las sesiones** del usuario
3. **Revisar accesos recientes** en logs de auditoría
4. **Contactar al negocio** para verificar actividad
5. **Resetear contraseña** después de verificar identidad
6. **Documentar el incidente** en sistema de tickets

### Exportación Sospechosa

1. **Revisar alerta** en dashboard de seguridad
2. **Verificar justificación** en logs de acceso
3. **Contactar al usuario** si es necesario
4. **Bloquear cuenta** si se confirma actividad maliciosa
5. **Reportar a autoridades** si aplica

### Múltiples Intentos de Acceso

1. **Revisar IPs de origen** en failed_login_attempts
2. **Identificar patrón** (bot, ataque dirigido, etc)
3. **Bloquear IPs** si es necesario (nivel de firewall)
4. **Notificar al negocio** afectado
5. **Fortalecer contraseñas** si son débiles

---

## ✅ Checklist de Seguridad

### Diario
- [ ] Revisar alertas críticas
- [ ] Verificar cuentas bloqueadas inusuales

### Semanal
- [ ] Revisar intentos fallidos de login
- [ ] Verificar patrones de transferencias inusuales
- [ ] Revisar exportaciones de datos

### Mensual
- [ ] Auditoría completa de accesos a datos sensibles
- [ ] Revisar usuarios inactivos
- [ ] Verificar permisos y roles
- [ ] Actualizar políticas de seguridad

### Trimestral
- [ ] Revisión completa de seguridad
- [ ] Pruebas de penetración
- [ ] Actualización de documentación
- [ ] Capacitación de equipo

---

## 📞 Contacto de Seguridad

Para reportar incidentes de seguridad o vulnerabilidades:
- **Email**: security@safetransfer.com (configurar)
- **Escalación**: SuperAdmin panel → Mensajes
- **Urgente**: Contactar directamente al equipo de desarrollo

---

## 🔄 Actualizaciones

Este documento se actualiza con cada mejora de seguridad implementada.

**Última actualización**: 2025-01-06
**Versión**: 1.0.0
