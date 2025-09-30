
#!/bin/bash

echo "🚀 Iniciando instalación de ServyAuto Manager v8.9..."

# Ir al directorio de la aplicación
cd /home/usuario/public_html/servyauto/app || cd ./app

echo "📦 Instalando dependencias..."
npm install

echo "🔧 Configurando Prisma..."
npx prisma generate

echo "🗄️ Aplicando migraciones de base de datos..."
npx prisma db push

echo "🏗️ Compilando aplicación..."
npm run build

echo "✅ Instalación completada!"
echo ""
echo "Para iniciar la aplicación ejecute:"
echo "npm run start"
echo ""
echo "La aplicación estará disponible en http://su-dominio.com:3000"
