const mysql = require('mysql2/promise'); 
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); 

const app = express();
const port = 5000;


app.use(cors()); 
app.use(bodyParser.json()); 

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1', 
    user: process.env.DB_USER || 'root', 
    password: process.env.DB_PASSWORD || 'fogel',
    database: process.env.DB_NAME || 'to_lis', 
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a la base de datos establecida.');
        connection.release();
    } catch (err) {
        console.error('❌ Error al conectar a la base de datos:', err);
        process.exit(1); 
    }
})();


app.get('/tareas', async (req, res) => {
    try {
        const [tareas] = await pool.query("SELECT * FROM tareas");
        res.status(200).json(tareas);
    } catch (err) {
        console.error('❌ Error al obtener tareas:', err);
        res.status(500).json({ error: 'Error al obtener las tareas' });
    }
});


app.post('/tareas', async (req, res) => {
    const { nombre, estado } = req.body;

    if (!nombre || !estado) {
        return res.status(400).json({ error: 'Nombre y estado de la tarea son requeridos' });
    }

    try {
        const query = 'INSERT INTO tareas (nombre, estado) VALUES (?, ?)';
        const [result] = await pool.query(query, [nombre, estado]);

        
        res.status(201).json({ id: result.insertId, nombre, estado });
    } catch (err) {
        console.error('❌ Error al agregar tarea:', err);
        res.status(500).json({ error: 'Error al agregar la tarea' });
    }
});
app.listen(port, () => {
    console.log(`✅ Servidor escuchando en http://localhost:${port}`);
});
