
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// ==========================================
// VERIFICAR TOKEN Y ESTADO DE LA SESIÓN
// ==========================================

async function verificarToken(req, res, next) {

    const encabezado = req.headers.authorization;

    // Comprobar que se haya enviado el token
    if (!encabezado) {
        return res.status(401).json({
            mensaje: "No se proporcionó un token de acceso."
        });
    }

    // Comprobar el formato: Bearer TOKEN
    const partes = encabezado.split(" ");

    if (
        partes.length !== 2 ||
        partes[0].toLowerCase() !== "bearer" ||
        !partes[1]
    ) {
        return res.status(401).json({
            mensaje: "Formato de token incorrecto."
        });
    }

    const token = partes[1];

    try {

        // Verificar la firma y la fecha de expiración del JWT
        const datosUsuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Comprobar que el token tenga identificador de sesión
        if (!datosUsuario.jti || !datosUsuario.id_usuario) {
            return res.status(403).json({
                mensaje: "El token no contiene información de sesión válida."
            });
        }

        // Comprobar en MySQL que la sesión siga activa
        const [sesiones] = await pool.execute(
            `SELECT s.id_sesion
             FROM sesiones s
             INNER JOIN usuarios u
                ON s.id_usuario = u.id_usuario
             WHERE s.identificador_token = ?
             AND s.id_usuario = ?
             AND s.revocada = FALSE
             AND s.fecha_expiracion > UTC_TIMESTAMP()
             AND u.activo = TRUE
             LIMIT 1`,
            [
                datosUsuario.jti,
                datosUsuario.id_usuario
            ]
        );

        // Si no existe una sesión activa, denegar el acceso
        if (sesiones.length === 0) {
            return res.status(401).json({
                mensaje: "Tu sesión ha sido cerrada, ha expirado o no es válida. Inicia sesión nuevamente."
            });
        }

        // Guardar los datos del usuario para utilizarlos
        // en los siguientes controladores y middlewares
        req.usuario = datosUsuario;

        // Continuar con la ruta solicitada
        next();

    } catch (error) {

        // Los errores de JWT se manejan como tokens inválidos
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(403).json({
                mensaje: "El token no es válido o ha expirado."
            });
        }

        // Los errores de conexión o consulta a MySQL
        // no deben confundirse con un token inválido
        console.error(
            "Error al verificar la sesión:",
            error.message
        );

        return res.status(500).json({
            mensaje: "No fue posible verificar el estado de tu sesión."
        });

    }

}

module.exports = verificarToken;
