#!/usr/bin/env bash
set -e
# Carga variables desde el .env en la raíz si existe
if [ -f ../.env ]; then
  set -a
  . ../.env
  set +a
fi

: "${DB_HOST:=localhost}"
: "${DB_USER:=root}"
: "${DB_PASSWORD:=}" 
: "${DB_NAME:=vonvi_studio}"
: "${PUERTO:=3000}"

echo "Iniciando servidor con:" 
echo "  DB_HOST=$DB_HOST DB_USER=$DB_USER DB_NAME=$DB_NAME PUERTO=$PUERTO"

node servidor.js
