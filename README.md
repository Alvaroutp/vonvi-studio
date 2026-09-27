# Vonvi Studio - Local Run

Opciones para ejecutar el proyecto localmente.

Requisitos
- Node 20 (npm)
- MySQL 8

1) Importar base de datos

```bash
mysql -u root -p < backend/sql/base_datos.sql
mysql -u root -p vonvi_studio < backend/sql/datos.sql
```

2) Instalar dependencias

```bash
cd backend
npm install
```

3) Iniciar servidor

```bash
DB_PASSWORD=vonvi123 DB_HOST=localhost DB_USER=root DB_NAME=vonvi_studio node servidor.js
```

4) Ejecutar tests

```bash
npm test
```

Docker

```bash
docker compose up --build
```
