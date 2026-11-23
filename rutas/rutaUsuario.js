const express = require("express");
const router = express.Router();

const {
    registrarUsuario
} = require("../controles/controladorUsuario");

// POST: registrar un usuario
router.post("/registrar", registrarUsuario);

module.exports = router;