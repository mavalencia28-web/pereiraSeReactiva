
const express = require("express");
const router = express.Router();

// Controladores de autenticación
const {
    iniciarSesion,
    cerrarSesion,
    verificarSesion
} = require("../controles/authControlador");

// Middleware para verificar el token y la sesión
const verificarToken = require("../middleware/verificarToken");

// POST: iniciar sesión
router.post("/login", iniciarSesion);

// POST: cerrar sesión
router.post("/logout", verificarToken, cerrarSesion);

// GET: comprobar si la sesión continúa activa
router.get("/verificar", verificarToken, verificarSesion);

module.exports = router;
