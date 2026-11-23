const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/verificarToken");
const verificarRol = require("../middleware/verificarRol");

const {
    obtenerCampanasActivas,
    obtenerTodasLasCampanas,
    crearCampana,
    actualizarCampana,
    cambiarEstadoCampana,
    eliminarCampana
} = require("../controles/campanasControlador");

// PÚBLICA: campañas activas (se ven sin iniciar sesión)
router.get("/", obtenerCampanasActivas);

// SOLO ADMINISTRADOR
// (esta ruta va antes de las rutas con :id)
router.get(
    "/admin",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    obtenerTodasLasCampanas
);

router.post(
    "/",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    crearCampana
);

router.put(
    "/:id/estado",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    cambiarEstadoCampana
);

router.put(
    "/:id",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    actualizarCampana
);

router.delete(
    "/:id",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    eliminarCampana
);

module.exports = router;
