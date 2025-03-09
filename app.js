const express = require("express");
const database = require('./db'); 

const app = express();


app.use(express.json()); 


app.get("/tareas", async (req, res) => {
    try {
        const conn = await database.getConnection();
        const [rows] = await conn.query("SELECT * FROM tareas"); 
        res.json(rows); 
        conn.release(); 
    } catch (err) {
        res.status(500).send("Error al conectar a la base de datos: " + err.message);
    }
});


app.post("/tareas", async (req, res) => {
    try {
        const { nombre, estado } = req.body; 
        if (!nombre) {
            return res.status(400).send("El campo 'nombre' es obligatorio");
        }

        const conn = await database.getConnection();
        const result = await conn.query("INSERT INTO tareas (name, estado) VALUES (?, ?)", [nombre, estado || false]);


        const newTarea = { id: result[0].insertId, name: nombre, estado: estado || false };
        res.status(201).json(newTarea); 
        conn.release(); 
    } catch (err) {
        res.status(500).send("Error al agregar tarea: " + err.message);
    }
});

app.get("/checkDbStatus", async (req, res) => {
    try {
        const connection = await database.getConnection();
        res.send("Conexión a la base de datos activa.");
        connection.release(); 
    } catch (err) {
        res.status(500).send("Error al conectar a la base de datos: " + err.message);
    }
});


app.listen(5000, () => {
    console.log("Servidor corriendo en http://localhost:5000");
});
