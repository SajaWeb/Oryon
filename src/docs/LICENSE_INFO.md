# Sistema de Gestión de Licencias - Oryon App

## Descripción General
El sistema de licencias controla el acceso a las funcionalidades del SaaS. Todas las empresas reciben 7 días de prueba gratuita al registrarse.

## Características Implementadas

### 1. Módulo de Licencias
- **Ubicación**: Accesible desde el sidebar (solo para administradores)
- **Funcionalidad**: 
  - Visualización del estado actual de la licencia
  - Selección de país (Colombia/Internacional)
  - Selección de plan de suscripción
  - Procesamiento de pagos

### 2. Planes Disponibles

| Plan | Duración | Precio USD | Precio COP |
|------|----------|------------|------------|
| 1 Mes | 30 días | $20 | $80,000 |
| 3 Meses | 90 días | $50 | $200,000 |
| 6 Meses | 180 días | $80 | $320,000 |
| 1 Año | 365 días | $150 | $600,000 |

**Todos los planes incluyen:**
- ✅ Facturas ilimitadas
- ✅ Productos ilimitados
- ✅ Órdenes de servicio ilimitadas
- ✅ Gestión de clientes
- ✅ Dashboard en tiempo real
- ✅ Reportes avanzados
- ✅ Usuarios ilimitados
- ✅ Soporte técnico

### 3. Métodos de Pago

#### Colombia - PSE
- Integración con pasarela PSE Colombia
- Pagos en pesos colombianos (COP)

#### Internacional - Paddle
- Integración con Paddle
- Pagos en dólares estadounidenses (USD)
- Acepta tarjetas de crédito/débito internacionales

### 4. Restricciones por Licencia Expirada

Cuando una licencia expira:
- **Administrador**: Ve un mensaje de alerta y debe acceder al módulo de licencias para renovar
- **Otros usuarios** (asesores/técnicos): No pueden acceder al sistema y ven un mensaje para contactar al administrador

### 5. Alertas de Vencimiento
- El sidebar muestra una alerta amarilla cuando quedan 7 días o menos
- Se muestra el número de días restantes
- Botón de acceso rápido para renovar

## Endpoints del Backend

### Crear Pago PSE
```
POST /make-server-4d437e50/license/pse/create
Authorization: Bearer {accessToken}
Body: {
  planId: string,
  amount: number,
  duration: number
}
```

### Crear Pago Paddle
```
POST /make-server-4d437e50/license/paddle/create
Authorization: Bearer {accessToken}
Body: {
  planId: string,
  amount: number,
  duration: number
}
```

### Webhook de Confirmación
```
POST /make-server-4d437e50/license/webhook
Body: {
  transactionId: string,
  status: 'approved' | 'completed' | 'failed' | 'cancelled'
}
```

### Activación Manual (Admin/Testing)
```
POST /make-server-4d437e50/license/activate
Authorization: Bearer {accessToken}
Body: {
  duration: number // días a agregar
}
```

## Flujo de Renovación

1. **Usuario accede al módulo de licencias**
2. **Selecciona su ubicación** (Colombia/Internacional)
3. **Elige un plan** según su necesidad
4. **Inicia el proceso de pago**
   - Se crea una transacción en estado "pending"
   - Se genera una URL de pago
5. **Completa el pago** en la pasarela externa
6. **Webhook confirma el pago**
   - La transacción se marca como "completed"
   - La fecha de expiración de la empresa se extiende
7. **Usuario regresa a la aplicación** con licencia activa

## Modo Demo

Para propósitos de testing, el sistema incluye un botón "Demo: Simular Pago Exitoso" que:
- Simula la confirmación del webhook sin necesidad de pago real
- Activa la licencia inmediatamente
- Útil para desarrollo y pruebas

**Nota**: En producción, este botón debe ser removido y los pagos deben procesarse a través de las pasarelas reales.

## Base de Datos

### Estructura de Company
```json
{
  "id": number,
  "name": string,
  "licenseExpiry": string (ISO date),
  "createdAt": string (ISO date)
}
```

### Estructura de Transaction
```json
{
  "id": string,
  "companyId": number,
  "planId": string,
  "amount": number,
  "duration": number,
  "status": "pending" | "completed" | "failed" | "cancelled",
  "paymentMethod": "pse" | "paddle",
  "createdAt": string (ISO date),
  "completedAt": string (ISO date, opcional)
}
```

## Integración con Pasarelas de Pago

### PSE (Colombia)
Para integrar con PSE real, necesitas:
1. Cuenta en PlacetoPay o similar
2. Credenciales API
3. Actualizar la URL de pago en el endpoint
4. Configurar webhook para recibir notificaciones

### Paddle (Internacional)
Para integrar con Paddle real, necesitas:
1. Cuenta de Paddle
2. Vendor ID y Auth Code
3. Crear productos en Paddle Dashboard
4. Configurar webhook en Paddle
5. Actualizar la URL de checkout

## Seguridad

- Solo administradores pueden acceder al módulo de licencias
- Los webhooks deben validar la firma/autenticidad en producción
- Las transacciones se almacenan con timestamp para auditoría
- La renovación extiende desde la fecha actual si está expirada, o desde la fecha de expiración si aún está vigente

## Próximos Pasos para Producción

1. ✅ Implementar validación de firma en webhooks
2. ✅ Configurar credenciales reales de PSE
3. ✅ Configurar credenciales reales de Paddle
4. ✅ Remover el botón de simulación de pago
5. ✅ Implementar envío de correos de confirmación
6. ✅ Agregar historial de transacciones en el módulo
7. ✅ Implementar facturación automática
