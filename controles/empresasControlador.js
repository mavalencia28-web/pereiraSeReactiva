const pool = require("../config/db");
const jwt = require("jsonwebtoken");


const registrarEmpresa = async (req, res) => {

    const {
        nit,
        nombre,
        descripcion,
        direccion,
        telefono,
        correo
    } = req.body;

    // Validar campos obligatorios
    if (!nit || !nombre || !direccion || !telefono || !correo) {
        return res.status(400).json({
            mensaje: "Completa todos los campos obligatorios."
        });
    }

    // Longitudes máximas según las columnas de la tabla empresas
    if (
        nit.length > 20 ||
        nombre.length > 120 ||
        direccion.length > 200 ||
        telefono.length > 20 ||
        correo.length > 120
    ) {
        return res.status(400).json({
            mensaje: "Uno o más campos superan la longitud permitida."
        });
    }

    // Obtener los datos del usuario autenticado
    const idUsuario = req.usuario.id_usuario;
    const identificadorToken = req.usuario.jti;
    const fechaExpiracion = req.usuario.exp;
    const fechaCreacion = req.usuario.iat;

    if (!identificadorToken || !fechaExpiracion || !fechaCreacion) {
        return res.status(401).json({
            mensaje: "La información de tu sesión no es válida."
        });
    }

    let conexion;
    let transaccionIniciada = false;

    try {

        conexion = await pool.getConnection();

        await conexion.beginTransaction();
        transaccionIniciada = true;

        // Comprobar que el NIT no esté registrado
        const [empresaExistente] = await conexion.execute(
            "SELECT id_empresa FROM empresas WHERE nit = ?",
            [nit.trim()]
        );

        if (empresaExistente.length > 0) {

            await conexion.rollback();
            transaccionIniciada = false;

            return res.status(409).json({
                mensaje: "Ya existe una empresa registrada con ese NIT."
            });
        }

        // Buscar el rol COMERCIANTE
        const [roles] = await conexion.execute(
            "SELECT id_rol FROM roles WHERE nombre = ?",
            ["COMERCIANTE"]
        );

        if (roles.length === 0) {

            await conexion.rollback();
            transaccionIniciada = false;

            return res.status(500).json({
                mensaje: "No se encontró el rol COMERCIANTE."
            });
        }

        // Registrar la empresa asociada al usuario autenticado
        const [resultado] = await conexion.execute(
            `INSERT INTO empresas
            (id_usuario, nit, nombre, descripcion, direccion, telefono, correo)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                idUsuario,
                nit.trim(),
                nombre.trim(),
                descripcion ? descripcion.trim() : null,
                direccion.trim(),
                telefono.trim(),
                correo.trim()
            ]
        );

        // Asignar COMERCIANTE sin eliminar los roles existentes
        await conexion.execute(
            `INSERT IGNORE INTO usuarios_roles (id_usuario, id_rol)
             VALUES (?, ?)`,
            [idUsuario, roles[0].id_rol]
        );

        // Consultar todos los roles actualizados del usuario
        const [rolesUsuario] = await conexion.execute(
            `SELECT r.nombre
             FROM usuarios_roles ur
             INNER JOIN roles r ON ur.id_rol = r.id_rol
             WHERE ur.id_usuario = ?`,
            [idUsuario]
        );

        const nombresRoles = rolesUsuario.map(rol => rol.nombre);

        // Generar un JWT actualizado conservando la sesión existente
        const nuevoToken = jwt.sign(
            {
                id_usuario: idUsuario,
                roles: nombresRoles,
                jti: identificadorToken,
                iat: fechaCreacion,
                exp: fechaExpiracion
            },
            process.env.JWT_SECRET
        );

        await conexion.commit();
        transaccionIniciada = false;

        return res.status(201).json({
            mensaje: "Empresa registrada correctamente. Está pendiente de verificación.",

            empresa: {
                id_empresa: resultado.insertId,
                nombre: nombre.trim(),
                estado_verificacion: "PENDIENTE"
            },

            token: nuevoToken
        });

    } catch (error) {

        if (conexion && transaccionIniciada) {
            await conexion.rollback();
        }

        console.error("Error al registrar empresa:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "El NIT o algún dato único ya está registrado."
            });
        }

        return res.status(500).json({
            mensaje: "Ocurrió un error al registrar la empresa."
        });

    } finally {

        if (conexion) {
            conexion.release();
        }

    }
};


// Consultar empresas pendientes de aprobación
const obtenerEmpresasPendientes = async (req, res) => {

    try {

        const [empresas] = await pool.execute(
            `SELECT
                e.id_empresa,
                e.nit,
                e.nombre,
                e.descripcion,
                e.direccion,
                e.telefono,
                e.correo,
                e.estado_verificacion,
                u.nombre AS nombre_usuario,
                u.apellido AS apellido_usuario,
                u.correo AS correo_usuario
             FROM empresas e
             INNER JOIN usuarios u
                ON e.id_usuario = u.id_usuario
             WHERE e.estado_verificacion = 'PENDIENTE'
             ORDER BY e.id_empresa ASC`
        );

        return res.status(200).json({
            mensaje: "Empresas pendientes consultadas correctamente.",
            empresas
        });

    } catch (error) {

        console.error("Error al consultar empresas pendientes:", error);

        return res.status(500).json({
            mensaje: "Error al consultar las empresas pendientes."
        });
    }
};

// Aprobar una empresa
const aprobarEmpresa = async (req, res) => {

    const idEmpresa = Number(req.params.id);

    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
        return res.status(400).json({
            mensaje: "El identificador de la empresa no es válido."
        });
    }

    try {

        const [resultado] = await pool.execute(
            `UPDATE empresas
             SET estado_verificacion = 'APROBADA'
             WHERE id_empresa = ?
             AND estado_verificacion = 'PENDIENTE'`,
            [idEmpresa]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "No se encontró una empresa pendiente de aprobación."
            });
        }

        return res.status(200).json({
            mensaje: "Empresa aprobada correctamente. El comerciante ya puede publicar."
        });

    } catch (error) {

        console.error("Error al aprobar empresa:", error);

        return res.status(500).json({
            mensaje: "No fue posible aprobar la empresa."
        });
    }
};


// Rechazar una empresa
const rechazarEmpresa = async (req, res) => {

    const idEmpresa = Number(req.params.id);

    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
        return res.status(400).json({
            mensaje: "El identificador de la empresa no es válido."
        });
    }

    try {

        const [resultado] = await pool.execute(
            `UPDATE empresas
             SET estado_verificacion = 'RECHAZADA'
             WHERE id_empresa = ?
             AND estado_verificacion = 'PENDIENTE'`,
            [idEmpresa]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "No se encontró una empresa pendiente de rechazo."
            });
        }

        return res.status(200).json({
            mensaje: "Empresa rechazada correctamente."
        });

    } catch (error) {

        console.error("Error al rechazar empresa:", error);

        return res.status(500).json({
            mensaje: "No fue posible rechazar la empresa."
        });
    }
};

module.exports = {
    registrarEmpresa,
    obtenerEmpresasPendientes,
    aprobarEmpresa,
    rechazarEmpresa
};
