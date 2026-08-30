#!/bin/sh
# Genera config.js dentro del contenedor a partir de variables de entorno.
# Así nunca hace falta escribir la contraseña dentro del código ni subirla a Git.
set -e

cat > config.js << CONFIGEOF
module.exports = {
    puerto: ${PUERTO:-3000},
    bd: {
        host: '${DB_HOST:-mysql}',
        user: '${DB_USER:-root}',
        password: '${DB_PASSWORD}',
        database: '${DB_NAME:-vonvi_studio}'
    }
};
CONFIGEOF

exec node servidor.js
