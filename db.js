const mysql = require('mysql2/promise'); 
const dotenv = require('dotenv');

dotenv.config()

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || 'fogel', 
    database: process.env.DB_NAME || 'to_lis', 
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

pool.getConnection()
    .then(connection => {
        console.log('Conexión a la base de datos establecida.');
        connection.release(); 
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err);
    });

module.exports = pool;
