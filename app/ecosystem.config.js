
module.exports = {
  apps: [{
    name: 'servyauto-manager',
    script: 'npm',
    args: 'start',
    cwd: '/ruta/a/tu/proyecto/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
