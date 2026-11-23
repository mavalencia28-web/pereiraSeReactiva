const express = require("express");
const router = express.Router();

const verificarToken = require("../middleware/verificarToken");

router.get("/privada", verificarToken, (req, res) => {
    res.json({
        mensaje: "¡Acceso autorizado! Has iniciado sesión correctamente.",
        usuario: req.usuario
    });
});

module.exports = router;