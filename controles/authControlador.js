const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");

// ==========================================
// INICIAR SESIÓN
// ==========================================

const iniciarSesion = async (req, res) => {

    const { correo, password } = req.body;

    // Validar campos obligatorios
    if (!correo || !password) {
        return res.status(400).json({
            mensaje: "Debes ingresar el correo y la contraseña."
        });
    }

    try {

        // Verificar que exista la clave para firmar los tokens
        if (!process.env.JWT_SECRET) {
            console.error("No está configurada la variable JWT_SECRET.");

            return res.status(500).json({
                mensaje: "Error de configuración del servidor."
            });
        }

        // Buscar usuario y sus roles
        const [usuarios] = await pool.execute(
            `SELECT
                u.id_usuario,
                u.nombre,
                u.apellido,
                u.correo,
                u.password_hash,
                u.activo,
                r.nombre AS rol
            FROM usuarios u
            LEFT JOIN usuarios_roles ur
                ON u.id_usuario = ur.id_usuario
            LEFT JOIN roles r
                ON ur.id_rol = r.id_rol
            WHERE u.correo = ?`,
            [correo.trim()]
        );

        // Comprobar si existe el usuario
        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        const usuario = usuarios[0];

        // Comprobar si la cuenta está activa
        if (!usuario.activo) {
            return res.status(403).json({
                mensaje: "Tu cuenta se encuentra desactivada."
            });
        }

        // Comparar contraseña con el hash almacenado
        const passwordCorrecta = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        // Obtener todos los roles del usuario
        const roles = [
            ...new Set(
                usuarios
                    .map(u => u.rol)
                    .filter(rol => rol !== null)
            )
        ];

        // Crear un identificador único para esta sesión
        const identificadorToken = randomUUID();

        // Generar token JWT
        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                roles: roles
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "2h",
                jwtid: identificadorToken
            }
        );

        // Obtener la fecha de expiración del token
        const datosToken = jwt.decode(token);

        const fechaExpiracion = new Date(datosToken.exp * 1000)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

        // Registrar la sesión en MySQL
        await pool.execute(
            `INSERT INTO sesiones (
                id_usuario,
                identificador_token,
                fecha_expiracion
            ) VALUES (?, ?, ?)`,
            [
                usuario.id_usuario,
                identificadorToken,
                fechaExpiracion
            ]
        );

        // Responder al frontend
        return res.status(200).json({
            mensaje: "Inicio de sesión exitoso.",
            token: token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                roles: roles
            }
        });

    } catch (error) {

        console.error("Error al iniciar sesión:", error.message);

        return res.status(500).json({
            mensaje: "Ocurrió un error al iniciar sesión."
        });

    }

};


// ==========================================
// CERRAR SESIÓN
// ==========================================

const cerrarSesion = async (req, res) => {

    try {

        // El middleware verificará el token antes de llegar aquí.
        // Su identificador único se encuentra en req.usuario.jti.

        const identificadorToken = req.usuario.jti;
        const idUsuario = req.usuario.id_usuario;

        if (!identificadorToken || !idUsuario) {
            return res.status(400).json({
                mensaje: "No fue posible identificar la sesión."
            });
        }

        // Marcar la sesión como revocada en MySQL
        const [resultado] = await pool.execute(
            `UPDATE sesiones
             SET revocada = TRUE
             WHERE identificador_token = ?
             AND id_usuario = ?
             AND revocada = FALSE`,
            [
                identificadorToken,
                idUsuario
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(401).json({
                mensaje: "La sesión ya se encuentra cerrada o no es válida."
            });
        }

        return res.status(200).json({
            mensaje: "Sesión cerrada correctamente."
        });

    } catch (error) {

        console.error("Error al cerrar sesión:", error.message);

        return res.status(500).json({
            mensaje: "Ocurrió un error al cerrar la sesión."
        });

    }

};

// ==========================================
// VERIFICAR SESIÓN ACTUAL
// ==========================================

const verificarSesion = async (req, res) => {

    try {

        // El middleware verificarToken ya comprobó que el token y la sesión sean válidos.

        const idUsuario = req.usuario.id_usuario;

        // Consultar nuevamente los datos actuales del usuario
        const [usuarios] = await pool.execute(
            `SELECT
                id_usuario,
                nombre,
                apellido,
                correo
             FROM usuarios
             WHERE id_usuario = ?
             AND activo = TRUE
             LIMIT 1`,
            [idUsuario]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: "La cuenta no se encuentra disponible."
            });
        }

        // Obtener los roles actuales desde la base de datos
        const [rolesUsuario] = await pool.execute(
            `SELECT r.nombre AS rol
             FROM usuarios_roles ur
             INNER JOIN roles r
                ON ur.id_rol = r.id_rol
             WHERE ur.id_usuario = ?`,
            [idUsuario]
        );

        const roles = rolesUsuario.map(item => item.rol);

        return res.status(200).json({
            mensaje: "Sesión válida.",
            usuario: {
                ...usuarios[0],
                roles: roles
            }
        });

    } catch (error) {

        console.error("Error al verificar sesión:", error.message);

        return res.status(500).json({
            mensaje: "No fue posible verificar la sesión."
        });

    }

};

// ==========================================
// EXPORTAR FUNCIONES
// ==========================================

module.exports = {
    iniciarSesion,
    cerrarSesion,
    verificarSesion
};