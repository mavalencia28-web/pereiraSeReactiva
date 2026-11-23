
const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/verificarToken");

const verificarRol = require("../middleware/verificarRol");

const {
    obtenerPublicaciones,
    obtenerPublicacionPorId,
    registrarPublicacion,
    obtenerMisPublicaciones,
    obtenerCategorias,
    obtenerPublicacionesPendientes,
    aprobarPublicacion,
    rechazarPublicacion
} = require("../controles/publicacionControlador");

// Consultar publicaciones públicas
router.get("/", obtenerPublicaciones);

// Registrar una publicación (requiere iniciar sesión)
router.post("/registrar", verificarToken, registrarPublicacion);

// Consultar publicaciones propias (requiere iniciar sesión)
router.get("/mis-publicaciones", verificarToken, obtenerMisPublicaciones);

// Consultar categorías activas
router.get("/categorias", obtenerCategorias);

router.get(
    "/prueba-admin",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    (req, res) => {
        res.json({
            mensaje: "Acceso autorizado. Eres administrador."
        });
    }
);

// Consultar publicaciones pendientes (solo administrador)
router.get(
    "/pendientes",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    obtenerPublicacionesPendientes
);

// Aprobar publicación (solo administrador)
router.put(
    "/aprobar/:id",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    aprobarPublicacion
);

// Rechazar publicación (solo administrador)
router.put(
    "/rechazar/:id",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    rechazarPublicacion
);

// Consultar el detalle de una publicación (pública).
// IMPORTANTE: va al final para que "/categorias", "/pendientes", etc no sean interpretadas como un :id.
router.get("/:id", obtenerPublicacionPorId);

module.exports = router;