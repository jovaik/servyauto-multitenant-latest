
#!/bin/bash

echo "🔄 Iniciando ServyAuto Manager en modo producción..."

cd app

# Verificar si está ejecutándose y detenerlo
if pgrep -f "next start" > /dev/null; then
    echo "⏹️ Deteniendo instancia anterior..."
    pkill -f "next start"
    sleep 3
fi

# Iniciar en background
echo "🚀 Iniciando aplicación..."
nohup npm run start > ../logs/app.log 2>&1 &

echo "✅ Aplicación iniciada en background"
echo "📝 Logs disponibles en: logs/app.log"
echo "🌐 URL: http://tu-dominio.com:3000"

# Mostrar proceso
echo "📊 Proceso activo:"
ps aux | grep "next start" | grep -v grep
