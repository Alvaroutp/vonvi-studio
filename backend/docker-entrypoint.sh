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
