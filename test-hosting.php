
<?php
// Test rápido para verificar si tu hosting soporta Node.js
// Ejecutar desde: http://tu-dominio.com/test-hosting.php

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test de Compatibilidad - ServyAuto Manager</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .result { padding: 15px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        h1 { color: #007bff; text-align: center; }
        .test { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🧪 Test de Compatibilidad del Hosting</h1>
    <p>Este test verifica si tu hosting puede ejecutar ServyAuto Manager.</p>

    <div class="test">
        <h3>📋 Información del Servidor:</h3>
        <div class="info">
            <strong>Sistema Operativo:</strong> <?php echo php_uname('s') . ' ' . php_uname('r'); ?><br>
            <strong>Servidor Web:</strong> <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Desconocido'; ?><br>
            <strong>Versión PHP:</strong> <?php echo PHP_VERSION; ?><br>
            <strong>Directorio:</strong> <?php echo __DIR__; ?>
        </div>
    </div>

    <div class="test">
        <h3>🔍 Verificando Node.js:</h3>
        <?php
        $nodeCheck = shell_exec('node --version 2>&1');
        if ($nodeCheck && strpos($nodeCheck, 'v') !== false) {
            echo "<div class='result success'>✅ <strong>Node.js DISPONIBLE:</strong> " . trim($nodeCheck) . "</div>";
            
            $npmCheck = shell_exec('npm --version 2>&1');
            if ($npmCheck && is_numeric(trim($npmCheck))) {
                echo "<div class='result success'>✅ <strong>NPM DISPONIBLE:</strong> v" . trim($npmCheck) . "</div>";
            } else {
                echo "<div class='result warning'>⚠️ <strong>NPM:</strong> No detectado o con problemas</div>";
            }
        } else {
            echo "<div class='result error'>❌ <strong>Node.js NO DISPONIBLE</strong><br>Tu hosting no soporta Node.js</div>";
        }
        ?>
    </div>

    <div class="test">
        <h3>⚙️ Verificando Comandos del Sistema:</h3>
        <?php
        if (function_exists('shell_exec') && !in_array('shell_exec', array_map('trim', explode(',', ini_get('disable_functions'))))) {
            echo "<div class='result success'>✅ <strong>shell_exec HABILITADO:</strong> Puedes ejecutar comandos</div>";
        } else {
            echo "<div class='result error'>❌ <strong>shell_exec DESHABILITADO:</strong> No puedes ejecutar comandos del sistema</div>";
        }

        if (function_exists('exec') && !in_array('exec', array_map('trim', explode(',', ini_get('disable_functions'))))) {
            echo "<div class='result success'>✅ <strong>exec HABILITADO</strong></div>";
        } else {
            echo "<div class='result warning'>⚠️ <strong>exec DESHABILITADO</strong></div>";
        }
        ?>
    </div>

    <div class="test">
        <h3>📁 Verificando Permisos:</h3>
        <?php
        $testDir = __DIR__ . '/test_permisos';
        if (!file_exists($testDir)) {
            if (mkdir($testDir, 0755)) {
                echo "<div class='result success'>✅ <strong>ESCRITURA:</strong> Permisos correctos</div>";
                rmdir($testDir);
            } else {
                echo "<div class='result error'>❌ <strong>ESCRITURA:</strong> Sin permisos para crear carpetas</div>";
            }
        }
        
        if (is_writable(__DIR__)) {
            echo "<div class='result success'>✅ <strong>DIRECTORIO:</strong> Escribible</div>";
        } else {
            echo "<div class='result error'>❌ <strong>DIRECTORIO:</strong> Solo lectura</div>";
        }
        ?>
    </div>

    <div class="test">
        <h3>🗄️ Test de Base de Datos:</h3>
        <?php
        if (file_exists(__DIR__ . '/app/.env')) {
            $env = file_get_contents(__DIR__ . '/app/.env');
            if (strpos($env, 'DATABASE_URL') !== false) {
                echo "<div class='result success'>✅ <strong>Configuración BD:</strong> Archivo .env encontrado</div>";
            } else {
                echo "<div class='result warning'>⚠️ <strong>Configuración BD:</strong> .env existe pero falta DATABASE_URL</div>";
            }
        } else {
            echo "<div class='result error'>❌ <strong>Configuración BD:</strong> Archivo .env no encontrado</div>";
        }
        ?>
    </div>

    <hr>

    <div class="test">
        <h3>📊 RESULTADO FINAL:</h3>
        <?php
        $compatible = true;
        $nodeAvailable = ($nodeCheck && strpos($nodeCheck, 'v') !== false);
        $commandsAvailable = (function_exists('shell_exec') && !in_array('shell_exec', array_map('trim', explode(',', ini_get('disable_functions')))));
        
        if ($nodeAvailable && $commandsAvailable) {
            echo "<div class='result success'>🎉 <strong>HOSTING COMPATIBLE</strong><br>Puedes usar el instalador web automático</div>";
            echo "<div class='info'><strong>Próximo paso:</strong> Ejecuta el archivo <strong>instalador-web.php</strong> desde tu navegador</div>";
        } else if (!$nodeAvailable && $commandsAvailable) {
            echo "<div class='result error'>❌ <strong>HOSTING NO COMPATIBLE</strong><br>Tu hosting no soporta Node.js</div>";
            echo "<div class='warning'><strong>Solución:</strong> Necesitas un hosting con soporte Node.js o un VPS</div>";
        } else if ($nodeAvailable && !$commandsAvailable) {
            echo "<div class='result warning'>⚠️ <strong>COMPATIBLE LIMITADO</strong><br>Node.js disponible pero comandos restringidos</div>";
            echo "<div class='info'><strong>Solución:</strong> Contacta a tu proveedor de hosting para habilitar shell_exec</div>";
        } else {
            echo "<div class='result error'>❌ <strong>HOSTING NO COMPATIBLE</strong><br>Faltan Node.js y permisos de comandos</div>";
            echo "<div class='warning'><strong>Solución:</strong> Necesitas cambiar a un hosting especializado en Node.js</div>";
        }
        ?>
    </div>

    <div class="test">
        <h3>🔗 Links Útiles:</h3>
        <div class="info">
            <a href="instalador-web.php" style="color: #007bff;">→ Ir al Instalador Web</a><br>
            <a href="instalar-sin-ssh.html" style="color: #007bff;">→ Ver Guía Completa</a><br>
            <a href="README_INSTALACION.md" style="color: #007bff;">→ Manual de Instalación</a>
        </div>
    </div>

</body>
</html>
