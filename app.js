// app.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Inicializar Express
const app = express();
app.use(bodyParser.json());

// Configuración de la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'fogel',
    database: process.env.DB_NAME || 'to_lis'
});

const promisePool = pool.promise();

// Middleware para verificar JWT
const verifyToken = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_clave_secreta');
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(400).json({ msg: 'Token is not valid' });
    }
};

// Ruta de registro
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Verificar si el correo ya existe
    const [user] = await promisePool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (user.length > 0) {
        return res.status(400).json({ msg: 'Email already exists' });
    }

    // Cifrar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar el nuevo usuario
    const result = await promisePool.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
    const newUserId = result[0].insertId;

    // Generar JWT
    const token = jwt.sign({ userId: newUserId }, process.env.JWT_SECRET || 'mi_clave_secreta', { expiresIn: '1h' });

    res.json({ token });
});

// Ruta de login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Buscar el usuario por email
    const [user] = await promisePool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (user.length === 0) {
        return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Verificar la contraseña
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Generar JWT
    const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET || 'mi_clave_secreta', { expiresIn: '1h' });

    res.json({ token });
});

// Ruta para obtener las tareas
app.get('/tasks', verifyToken, async (req, res) => {
    const userId = req.userId;
    const [tasks] = await promisePool.execute('SELECT * FROM tasks WHERE user_id = ?', [userId]);
    res.json(tasks);
});

// Ruta para agregar una tarea
app.post('/tasks', verifyToken, async (req, res) => {
    const { title, description, deadline } = req.body;
    const userId = req.userId;

    // Insertar la nueva tarea
    await promisePool.execute('INSERT INTO tasks (title, description, deadline, user_id) VALUES (?, ?, ?, ?)', [title, description, deadline, userId]);
    res.status(201).json({ msg: 'Task added successfully' });
});

// Iniciar el servidor
app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
