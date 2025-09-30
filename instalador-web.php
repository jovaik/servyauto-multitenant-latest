
<?php
// Instalador Web para ServyAuto Manager v8.9
// Ejecutar desde: http://tu-dominio.com/ruta/instalador-web.php

set_time_limit(300); // 5 minutos máximo
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Detectar directorio actual
$currentDir = dirname(__FILE__);
$appDir = $currentDir . '/app';

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instalador ServyAuto Manager v8.9</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .command { background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0; font-family: monospace; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        .log { background: #000; color: #00ff00; padding: 15px; height: 300px; overflow-y: scroll; font-family: monospace; }
        h1 { color: #007bff; }
        h2 { color: #28a745; }
    </style>
</head>
<body>
    <h1>🚀 Instalador ServyAuto Manager v8.9</h1>
    
    <?php
    if (isset($_POST['action'])) {
        $action = $_POST['action'];
        echo "<div class='log' id='log'>";
        
        switch ($action) {
            case 'check':
                echo "<h2>🔍 Verificando Requisitos</h2>";
                checkRequirements();
                break;
                
            case 'install':
                echo "<h2>📦 Instalando Dependencias</h2>";
                installDependencies();
                break;
                
            case 'build':
                echo "<h2>🏗️ Compilando Aplicación</h2>";
                buildApplication();
                break;
                
            case 'start':
                echo "<h2>🚀 Iniciando Aplicación</h2>";
                startApplication();
                break;
                
            case 'full_install':
                echo "<h2>⚡ Instalación Completa</h2>";
                fullInstall();
                break;
        }
        
        echo "</div>";
    } else {
    ?>
    
    <div class="info">
        <strong>📁 Directorio actual:</strong> <?php echo $currentDir; ?><br>
        <strong>📱 Directorio de la app:</strong> <?php echo $appDir; ?><br>
        <strong>✅ Archivos detectados:</strong> <?php echo file_exists($appDir . '/package.json') ? 'SÍ' : 'NO'; ?>
    </div>
    
    <h2>Selecciona una opción:</h2>
    
    <form method="post" style="margin: 20px 0;">
        <button type="submit" name="action" value="check">🔍 Verificar Requisitos</button>
        <button type="submit" name="action" value="full_install" style="background: #28a745;">⚡ Instalación Completa (Recomendado)</button>
    </form>
    
    <details>
        <summary><strong>Instalación paso a paso (manual)</strong></summary>
        <form method="post">
            <button type="submit" name="action" value="install">📦 1. Instalar Dependencias</button>
            <button type="submit" name="action" value="build">🏗️ 2. Compilar App</button>
            <button type="submit" name="action" value="start">🚀 3. Iniciar App</button>
        </form>
    </details>
    
    <div class="warning">
        <strong>⚠️ Importante:</strong> Asegúrate de que Node.js esté instalado en tu hosting. Si no tienes acceso a comandos del servidor, contacta a tu proveedor de hosting.
    </div>
    
    <?php } ?>
    
    <hr>
    <p><strong>📞 ¿Problemas?</strong> Si este instalador no funciona, tu hosting podría no tener soporte para Node.js o necesitas una cuenta con más permisos.</p>
    
</body>
</html>

<?php
function logMessage($message, $type = 'info') {
    $timestamp = date('H:i:s');
    echo "<div style='color: " . ($type == 'error' ? '#ff6b6b' : ($type == 'success' ? '#51cf66' : '#74c0fc')) . ";'>[$timestamp] $message</div>";
    flush();
    ob_flush();
}

function executeCommand($command, $workDir = null) {
    logMessage("Ejecutando: $command", 'info');
    
    $fullCommand = $workDir ? "cd $workDir && $command" : $command;
    
    $descriptorspec = array(
        0 => array("pipe", "r"),
        1 => array("pipe", "w"), 
        2 => array("pipe", "w")
    );
    
    $process = proc_open($fullCommand, $descriptorspec, $pipes);
    
    if (is_resource($process)) {
        fclose($pipes[0]);
        
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        
        fclose($pipes[1]);
        fclose($pipes[2]);
        
        $return_value = proc_close($process);
        
        if ($output) {
            logMessage($output, 'success');
        }
        
        if ($error) {
            logMessage($error, 'error');
        }
        
        return $return_value == 0;
    }
    
    logMessage("Error al ejecutar el comando", 'error');
    return false;
}

function checkRequirements() {
    global $appDir;
    
    logMessage("🔍 Verificando Node.js...");
    executeCommand("node --version");
    
    logMessage("🔍 Verificando npm...");
    executeCommand("npm --version");
    
    logMessage("🔍 Verificando archivos del proyecto...");
    if (file_exists($appDir . '/package.json')) {
        logMessage("✅ package.json encontrado", 'success');
    } else {
        logMessage("❌ package.json NO encontrado", 'error');
    }
    
    if (file_exists($appDir . '/.env')) {
        logMessage("✅ .env encontrado", 'success');
    } else {
        logMessage("❌ .env NO encontrado", 'error');
    }
}

function installDependencies() {
    global $appDir;
    
    logMessage("📦 Instalando dependencias de npm...");
    if (executeCommand("npm install", $appDir)) {
        logMessage("✅ Dependencias instaladas correctamente", 'success');
        
        logMessage("🔧 Generando cliente Prisma...");
        if (executeCommand("npx prisma generate", $appDir)) {
            logMessage("✅ Cliente Prisma generado", 'success');
            
            logMessage("🗄️ Aplicando migraciones de BD...");
            if (executeCommand("npx prisma db push", $appDir)) {
                logMessage("✅ Base de datos configurada", 'success');
            } else {
                logMessage("⚠️ Problema con la base de datos", 'warning');
            }
        } else {
            logMessage("❌ Error generando Prisma", 'error');
        }
    } else {
        logMessage("❌ Error instalando dependencias", 'error');
    }
}

function buildApplication() {
    global $appDir;
    
    logMessage("🏗️ Compilando aplicación...");
    if (executeCommand("npm run build", $appDir)) {
        logMessage("✅ Aplicación compilada correctamente", 'success');
    } else {
        logMessage("❌ Error compilando aplicación", 'error');
    }
}

function startApplication() {
    global $appDir;
    
    logMessage("🚀 Iniciando aplicación...");
    logMessage("⚠️ Nota: La aplicación se iniciará en background", 'warning');
    
    // Intentar iniciar en background
    if (executeCommand("nohup npm run start > ../app.log 2>&1 &", $appDir)) {
        logMessage("✅ Aplicación iniciada", 'success');
        logMessage("🌐 Tu aplicación debería estar disponible en: http://tu-dominio.com:3000", 'success');
        logMessage("📝 Los logs se guardan en: app.log", 'info');
    } else {
        logMessage("❌ Error iniciando aplicación", 'error');
        logMessage("💡 Intenta ejecutar manualmente: npm run start", 'info');
    }
}

function fullInstall() {
    logMessage("⚡ Iniciando instalación completa...");
    
    checkRequirements();
    sleep(2);
    
    installDependencies();
    sleep(2);
    
    buildApplication();
    sleep(2);
    
    startApplication();
    
    logMessage("🎉 Instalación completada!", 'success');
}
?>
