require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'fogel',
    database: process.env.DB_NAME || 'to_lis',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
});

// Verificar conexión a la base de datos
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

// Ruta para registrar un nuevo usuario
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    console.log('Register Request:', req.body); // Log para depurar

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validación de formato de correo electrónico
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Correo electrónico inválido' });
    }

    // Validación de longitud de contraseña
    if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
        // Comprobar si el correo o el nombre de usuario ya existen
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        console.log('Usuarios existentes:', existingUser); // Log para depurar

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'El correo o el nombre de usuario ya están en uso' });
        }

        // Encriptar la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar el nuevo usuario en la base de datos
        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        const [result] = await pool.query(query, [username, email, hashedPassword]);

        res.status(201).json({ id: result.insertId, username, email });
    } catch (err) {
        console.error('❌ Error al registrar usuario:', err);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('Login Request:', req.body); // Log para verificar que se recibe la solicitud correctamente

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    try {
        // Verificar si el usuario existe en la base de datos
        const [user] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        console.log('Usuario encontrado en la base de datos:', user); // Log para verificar si el usuario existe en la DB

        if (user.length === 0) {
            return res.status(400).json({ error: 'Usuario no encontrado' });
        }

        // Aquí para depurar, verificamos la contraseña almacenada
        console.log('Contraseña encriptada en la base de datos:', user[0].password);
        
        // Comparar la contraseña en texto claro con la encriptada
        const isPasswordCorrect = await bcrypt.compare(password, user[0].password);
        console.log('Contraseña comparada:', password, user[0].password); // Log para verificar la comparación de contraseñas

        if (!isPasswordCorrect) {
            return res.status(400).json({ error: 'Contraseña incorrecta' });
        }

        // Generar un token JWT
        const secret = process.env.JWT_SECRET || 'tu_clave_secreta';
        const token = jwt.sign(
            { userId: user[0].id, username: user[0].username },
            secret,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Inicio de sesión exitoso', token });
    } catch (err) {
        console.error('❌ Error al iniciar sesión:', err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
