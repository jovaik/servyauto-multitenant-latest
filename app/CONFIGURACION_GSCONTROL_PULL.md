
# 🔄 Configuración Sincronización PULL con GSControl

## ¿Qué es la sincronización PULL?

GSControl consultará periódicamente a ServyAuto para obtener TODAS las transacciones y mantenerlas sincronizadas:
- **Agregar** transacciones nuevas
- **Actualizar** transacciones modificadas  
- **Eliminar** transacciones que ya no existen

Esto complementa la sincronización PUSH (cuando ServyAuto envía cambios inmediatamente).

---

## 📋 Requisitos Previos

1. **API Key de GSControl**: Ya configurada en `.env`
   ```bash
   GSCONTROL_API_KEY=gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a
   ```

2. **Token de seguridad para cron** (recomendado para producción):
   ```bash
   CRON_SECRET_TOKEN=tu-token-secreto-aqui
   ```

3. **URL de la aplicación**:
   ```bash
   NEXT_PUBLIC_APP_URL=https://app.servyauto.com
   ```

---

## 🚀 Métodos de Ejecución

### Opción 1: Ejecutar Manualmente desde la Aplicación

Desde el navegador (como administrador):
```javascript
// Abrir consola del navegador y ejecutar:
fetch('/api/integrations/gscontrol-pull-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json()).then(console.log)
```

### Opción 2: Ejecutar con Script de Node.js

```bash
cd /home/ubuntu/servyauto_manager_v89/app
node scripts/gscontrol-pull-sync-cron.js
```

### Opción 3: Configurar Cron Job (Linux/Mac)

Editar crontab:
```bash
crontab -e
```

Agregar línea para ejecutar cada 5 minutos:
```bash
*/5 * * * * cd /home/ubuntu/servyauto_manager_v89/app && node scripts/gscontrol-pull-sync-cron.js >> /home/ubuntu/servyauto_manager_v89/logs/gscontrol-sync.log 2>&1
```

Agregar línea para ejecutar cada 10 minutos:
```bash
*/10 * * * * cd /home/ubuntu/servyauto_manager_v89/app && node scripts/gscontrol-pull-sync-cron.js >> /home/ubuntu/servyauto_manager_v89/logs/gscontrol-sync.log 2>&1
```

### Opción 4: Configurar PM2 con Cron

```bash
pm2 start scripts/gscontrol-pull-sync-cron.js --name gscontrol-sync --cron "*/5 * * * *"
```

### Opción 5: Configurar Servicio Externo (UptimeRobot, Cron-Job.org)

Configurar un servicio externo que llame cada 5-10 minutos a:
```
POST https://app.servyauto.com/api/integrations/gscontrol-pull-sync
Headers:
  Authorization: Bearer TU_CRON_SECRET_TOKEN
```

---

## 📊 Formato de Datos Enviados a GSControl

```json
{
  "transactions": [
    {
      "externalId": "factura-123",
      "type": "INGRESO",
      "date": "2025-10-31T10:30:00Z",
      "amount": 150.50,
      "description": "FACTURA: FAC-2025-0001 - Juan Pérez",
      "ivaRate": 21,
      "metadata": {
        "numeroFactura": "FAC-2025-0001",
        "cliente": "Juan Pérez",
        "metodoPago": "EFECTIVO",
        "tipo": "FACTURA"
      }
    },
    {
      "externalId": "gasto-456",
      "type": "GASTO",
      "date": "2025-10-31T14:20:00Z",
      "amount": 50.00,
      "description": "Compra de materiales - Proveedor ABC",
      "ivaRate": 21,
      "metadata": {
        "categoria": "MATERIALES",
        "proveedor": "Proveedor ABC",
        "metodoPago": "TPV_SUMUP"
      }
    }
  ],
  "source": "ServyAuto",
  "syncTimestamp": "2025-10-31T15:00:00Z"
}
```

---

## ✅ Verificar que Funciona

### 1. Probar endpoint manualmente:
```bash
curl -X POST http://localhost:3000/api/integrations/gscontrol-pull-sync \
  -H "Authorization: Bearer tu-token-aqui" \
  -H "Content-Type: application/json"
```

### 2. Ver logs de sincronización:
```bash
# Si usas PM2:
pm2 logs servyauto

# Si usas cron:
tail -f /home/ubuntu/servyauto_manager_v89/logs/gscontrol-sync.log
```

### 3. Verificar en GSControl:
- Ir a GSControl → Transacciones
- Verificar que aparecen todas las transacciones de ServyAuto
- Hacer una prueba: eliminar una factura en ServyAuto y esperar 5-10 minutos
- Verificar que se eliminó también en GSControl

---

## 🔧 Troubleshooting

### Error: "No autorizado"
- Verificar que el token CRON_SECRET_TOKEN esté configurado correctamente
- Verificar que el header Authorization se esté enviando correctamente

### Error: "GSControl respondió con error"
- Verificar que GSCONTROL_API_KEY sea correcto
- Verificar que el endpoint de GSControl esté disponible
- Revisar formato de datos enviados

### No se sincronizan todas las transacciones
- Verificar que las transacciones tengan fecha dentro del año actual
- Revisar logs para ver si hay errores de formato

---

## 📝 Notas Importantes

1. **Frecuencia recomendada**: 5-10 minutos
   - Más frecuente → Mayor sincronización, más carga en servidor
   - Menos frecuente → Menos carga, pero datos menos actualizados

2. **Año de sincronización**: Actualmente solo sincroniza el año en curso
   - Para sincronizar años anteriores, modificar `startOfYear` y `endOfYear` en `gscontrol-pull-sync.ts`

3. **Cierres de caja**: Actualmente NO se incluyen en la sincronización PULL
   - Si se desea incluirlos, agregar lógica similar a facturas/gastos

4. **Seguridad**: Siempre usar HTTPS en producción y tokens fuertes

---

## 🎯 Próximos Pasos Recomendados

1. ✅ Configurar variable `CRON_SECRET_TOKEN` en `.env`
2. ✅ Probar sincronización manualmente desde el navegador
3. ✅ Configurar cron job o PM2 para ejecución automática
4. ✅ Monitorear logs durante las primeras ejecuciones
5. ✅ Verificar en GSControl que todo se sincronice correctamente
