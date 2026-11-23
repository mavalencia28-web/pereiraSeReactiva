
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

require("dotenv").config();

const pool = require("./config/db");

const rutaUsuario = require("./rutas/rutaUsuario");
const authRuta = require("./rutas/authRuta");
const pruebaRutas = require("./rutas/pruebaRutas");
const publicacionesRuta = require("./rutas/publicacionesRuta");
const empresasRuta = require("./rutas/empresasRuta");
const campanasRuta = require("./rutas/campanasRuta");
const donacionesRuta = require("./rutas/donacionesRuta");

const app = express();

// ==========================================
// MIDDLEWARES GENERALES
// ==========================================

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Evitar que el navegador almacene páginas HTML en caché
app.use((req, res, next) => {

    const esPaginaHTML =
        req.path === "/" ||
        req.path.toLowerCase().endsWith(".html");

    if (esPaginaHTML) {
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private"
        );

        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }

    next();

});

// ==========================================
// ARCHIVOS DEL FRONTEND
// ==========================================

app.use(express.static(path.join(__dirname, "front")));

// ==========================================
// RUTAS DE LA API
// ==========================================

app.use("/api/prueba", pruebaRutas);
app.use("/api/usuarios", rutaUsuario);
app.use("/api/auth", authRuta);
app.use("/api/publicaciones", publicacionesRuta);
app.use("/api/empresas", empresasRuta);
app.use("/api/campanas", campanasRuta);
app.use("/api/donaciones", donacionesRuta);

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "front", "index.html"));
});

// ==========================================
// RUTA PRINCIPAL DE LA API
// ==========================================

app.get("/api", (req, res) => {
    res.json({
        mensaje: "Bienvenido a Pereira se Reactiva",
        estado: "Servidor funcionando correctamente"
    });
});

// ==========================================
// COMPROBAR CONEXIÓN CON MYSQL
// ==========================================

app.get("/api/estado-db", async (req, res) => {

    let conexion;

    try {

        conexion = await pool.getConnection();

        await conexion.ping();

        res.json({
            mensaje: "Conexión exitosa con MySQL",
            baseDatos: process.env.DB_NAME
        });

    } catch (error) {

        console.error("Error de conexión:", error.message);

        res.status(500).json({
            mensaje: "No fue posible conectar con MySQL"
        });

    } finally {

        // Liberar la conexión incluso si ocurre un error
        if (conexion) {
            conexion.release();
        }

    }

});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});