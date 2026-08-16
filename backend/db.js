// =====================================================================
//  CONEXIÓN A MYSQL
//  Los demás archivos solo hacen:  const db = require('./db');
// =====================================================================

const mysql = require('mysql2');
const config = require('./config');

// createPool en vez de createConnection.
// Un "pool" mantiene varias conexiones abiertas y las va prestando.
// Con una sola conexión, si dos personas entran a la vez, una espera.
const pool = mysql.createPool(config.bd);

// .promise() nos deja usar async/await en vez de funciones anidadas.
module.exports = pool.promise();