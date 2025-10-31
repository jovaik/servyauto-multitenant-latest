#!/bin/bash

echo "🔍 Probando conexión con GSControl..."
echo ""

# Cargar variables de entorno
source .env

if [ -z "$GSCONTROL_API_KEY" ]; then
  echo "❌ GSCONTROL_API_KEY no está configurada"
  exit 1
fi

ENDPOINT="https://gscontrol.abacusai.app/api/integrations/sync"
EXTERNAL_ID="SERVYAUTO-TEST-$(date +%s)"

echo "Endpoint: $ENDPOINT"
echo "API Key: ${GSCONTROL_API_KEY:0:20}..."
echo ""

# Test 1: Crear transacción de prueba
echo "📤 Test 1: Creando transacción de prueba..."
echo "External ID: $EXTERNAL_ID"
echo ""

START=$(date +%s%3N)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $GSCONTROL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"transactions\": [{
      \"externalId\": \"$EXTERNAL_ID\",
      \"type\": \"INGRESO\",
      \"date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
      \"amount\": 10.50,
      \"description\": \"Test de sincronización ServyAuto\",
      \"documentType\": \"NO APLICA\"
    }]
  }")

END=$(date +%s%3N)
RESPONSE_TIME=$((END - START))

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "⏱️  Tiempo de respuesta: ${RESPONSE_TIME}ms"
echo "📊 Status HTTP: $HTTP_CODE"
echo "📝 Respuesta:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Sincronización exitosa!"
  echo ""
  
  # Test 2: Eliminar transacción de prueba
  echo "🗑️  Test 2: Eliminando transacción de prueba..."
  sleep 1
  
  START=$(date +%s%3N)
  
  DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$ENDPOINT" \
    -H "Authorization: Bearer $GSCONTROL_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"externalIds\": [\"$EXTERNAL_ID\"]
    }")
  
  END=$(date +%s%3N)
  DELETE_RESPONSE_TIME=$((END - START))
  
  DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
  DELETE_BODY=$(echo "$DELETE_RESPONSE" | sed '$d')
  
  echo "⏱️  Tiempo de respuesta: ${DELETE_RESPONSE_TIME}ms"
  echo "📊 Status HTTP: $DELETE_HTTP_CODE"
  echo "📝 Respuesta:"
  echo "$DELETE_BODY" | jq '.' 2>/dev/null || echo "$DELETE_BODY"
  echo ""
  
  if [ "$DELETE_HTTP_CODE" = "200" ]; then
    echo "✅ Eliminación exitosa!"
  else
    echo "⚠️  Error en eliminación"
  fi
else
  echo "❌ Error en sincronización"
fi
