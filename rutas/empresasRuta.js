const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/verificarToken");

const verificarRol = require("../middleware/verificarRol");

const {
    registrarEmpresa,
    obtenerEmpresasPendientes,
    aprobarEmpresa,
    rechazarEmpresa
} = require("../controles/empresasControlador");

router.post("/registrar", verificarToken, registrarEmpresa);

// Consultar empresas pendientes (solo administrador)
router.get(
    "/pendientes",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    obtenerEmpresasPendientes
);

// Aprobar empresa (solo administrador)
router.put(
    "/aprobar/:id",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    aprobarEmpresa
);

// Rechazar empresa (solo administrador)
router.put(
    "/rechazar/:id",
    verificarToken,
    verificarRol("ADMINISTRADOR"),
    rechazarEmpresa
);

module.exports = router;
