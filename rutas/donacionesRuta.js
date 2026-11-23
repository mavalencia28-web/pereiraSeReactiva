const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/verificarToken");
const verificarRol = require("../middleware/verificarRol");

const {
    registrarDonacion,
    obtenerMisDonaciones,
    obtenerDonaciones,
    cambiarEstadoDonacion
} = require("../controles/donacionesControlador");

// Cualquier usuario con sesión puede donar y ver SUS donaciones
router.post("/", verificarToken, registrarDonacion);
router.get("/mis-donaciones", verificarToken, obtenerMisDonaciones);

// SOLO ADMINISTRADOR: recibe, consulta y gestiona todas las donaciones
router.get(
    "/",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    obtenerDonaciones
);

router.put(
    "/:id/estado",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    cambiarEstadoDonacion
);

module.exports = router;
