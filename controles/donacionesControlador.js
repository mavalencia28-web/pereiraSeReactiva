const pool = require("../config/db");

const MONTO_MAXIMO = 9999999999.99; // límite de DECIMAL(12,2)
const ESTADOS_DONACION = ["PENDIENTE", "CONFIRMADA", "RECHAZADA", "ENTREGADA"];

// Transiciones permitidas: nuevo estado -> estados desde los que se puede llegar
const TRANSICIONES = {
    CONFIRMADA: ["PENDIENTE"],
    RECHAZADA: ["PENDIENTE", "CONFIRMADA"],
    ENTREGADA: ["CONFIRMADA"]
};

// ==========================================
// REGISTRAR UNA DONACIÓN (USUARIO CON SESIÓN)
// ==========================================

const registrarDonacion = async (req, res) => {

    const {
        id_campana,
        tipo_donacion,
        tipo_donante,
        nombre_donante,
        nit_donante,
        monto,
        descripcion_especie
    } = req.body || {};

    const idCampana = Number(id_campana);

    if (!Number.isInteger(idCampana) || idCampana <= 0) {
        return res.status(400).json({ mensaje: "Selecciona una campaña válida." });
    }

    if (tipo_donacion !== "ECONOMICA" && tipo_donacion !== "ESPECIE") {
        return res.status(400).json({ mensaje: "El tipo de donación debe ser ECONOMICA o ESPECIE." });
    }

    if (tipo_donante !== "PERSONA" && tipo_donante !== "EMPRESA") {
        return res.status(400).json({ mensaje: "El tipo de donante debe ser PERSONA o EMPRESA." });
    }

    // Validar monto o descripción según el tipo de donación
    let montoFinal = null;
    let especieFinal = null;

    if (tipo_donacion === "ECONOMICA") {

        montoFinal = Number(monto);

        if (!Number.isFinite(montoFinal) || montoFinal <= 0 || montoFinal > MONTO_MAXIMO) {
            return res.status(400).json({ mensaje: "El monto debe ser un número mayor que cero." });
        }

    } else {

        if (typeof descripcion_especie !== "string" || descripcion_especie.trim().length === 0) {
            return res.status(400).json({ mensaje: "Describe lo que vas a donar en especie." });
        }

        if (descripcion_especie.trim().length > 1000) {
            return res.status(400).json({ mensaje: "La descripción no puede superar los 1000 caracteres." });
        }

        especieFinal = descripcion_especie.trim();
    }

    // Validar datos del donante
    let nombreFinal = typeof nombre_donante === "string" ? nombre_donante.trim() : "";
    let nitFinal = null;

    if (nombreFinal.length > 120) {
        return res.status(400).json({ mensaje: "El nombre del donante no puede superar los 120 caracteres." });
    }

    if (tipo_donante === "EMPRESA") {

        nitFinal = typeof nit_donante === "string" ? nit_donante.trim() : "";

        if (nombreFinal.length === 0 || nitFinal.length === 0) {
            return res.status(400).json({
                mensaje: "Si donas como empresa debes indicar el nombre y el NIT."
            });
        }

        if (nitFinal.length > 20) {
            return res.status(400).json({ mensaje: "El NIT no puede superar los 20 caracteres." });
        }
    }

    const idUsuario = req.usuario.id_usuario;

    try {

        // La campaña debe estar activa y dentro de sus fechas
        const [campanas] = await pool.execute(
            `SELECT id_campana, tipo_aceptacion
             FROM campanas
             WHERE id_campana = ?
             AND estado = 'ACTIVA'
             AND CURDATE() BETWEEN fecha_inicio AND fecha_fin`,
            [idCampana]
        );

        if (campanas.length === 0) {
            return res.status(404).json({
                mensaje: "La campaña no existe o ya no está recibiendo donaciones."
            });
        }

        const aceptacion = campanas[0].tipo_aceptacion;

        if (aceptacion !== "AMBAS" && aceptacion !== tipo_donacion) {
            return res.status(400).json({
                mensaje: aceptacion === "ECONOMICA"
                    ? "Esta campaña solo recibe donaciones económicas."
                    : "Esta campaña solo recibe donaciones en especie."
            });
        }

        // Si es persona y no escribió nombre, se usa el de su cuenta
        if (tipo_donante === "PERSONA" && nombreFinal.length === 0) {

            const [usuarios] = await pool.execute(
                "SELECT nombre, apellido FROM usuarios WHERE id_usuario = ?",
                [idUsuario]
            );

            if (usuarios.length > 0) {
                nombreFinal = (usuarios[0].nombre + " " + usuarios[0].apellido).trim();
            }
        }

        const [resultado] = await pool.execute(
            `INSERT INTO donaciones
                (id_usuario, id_campana, tipo_donacion, tipo_donante,
                 nombre_donante, nit_donante, monto, descripcion_especie)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idUsuario,
                idCampana,
                tipo_donacion,
                tipo_donante,
                nombreFinal || null,
                nitFinal,
                montoFinal,
                especieFinal
            ]
        );

        return res.status(201).json({
            mensaje: "¡Gracias! Tu donación quedó registrada y el administrador se pondrá en contacto contigo para coordinar la entrega.",
            id_donacion: resultado.insertId
        });

    } catch (error) {

        console.error("Error al registrar donación:", error);

        return res.status(500).json({
            mensaje: "Ocurrió un error al registrar la donación."
        });
    }
};

// ==========================================
// CONSULTAR MIS DONACIONES (USUARIO CON SESIÓN)
// Cada usuario solo ve las suyas.
// ==========================================

const obtenerMisDonaciones = async (req, res) => {

    try {

        const [donaciones] = await pool.execute(
            `SELECT
                d.id_donacion,
                d.tipo_donacion,
                d.monto,
                d.descripcion_especie,
                d.estado,
                d.fecha_registro,
                c.nombre AS campana
             FROM donaciones d
             INNER JOIN campanas c
                ON d.id_campana = c.id_campana
             WHERE d.id_usuario = ?
             ORDER BY d.id_donacion DESC`,
            [req.usuario.id_usuario]
        );

        return res.status(200).json({
            mensaje: "Tus donaciones fueron consultadas correctamente.",
            donaciones
        });

    } catch (error) {

        console.error("Error al consultar mis donaciones:", error);

        return res.status(500).json({
            mensaje: "Error al consultar tus donaciones."
        });
    }
};

// ==========================================
// ADMINISTRADOR: VER TODAS LAS DONACIONES
// ==========================================

const obtenerDonaciones = async (req, res) => {

    const { estado } = req.query;

    if (estado !== undefined && !ESTADOS_DONACION.includes(estado)) {
        return res.status(400).json({ mensaje: "El estado solicitado no es válido." });
    }

    try {

        let sql =
            `SELECT
                d.id_donacion,
                d.tipo_donacion,
                d.tipo_donante,
                d.nombre_donante,
                d.nit_donante,
                d.monto,
                d.descripcion_especie,
                d.estado,
                d.fecha_registro,
                c.id_campana,
                c.nombre AS campana,
                u.nombre AS nombre_usuario,
                u.apellido AS apellido_usuario,
                u.correo AS correo_usuario,
                u.telefono AS telefono_usuario
             FROM donaciones d
             INNER JOIN campanas c
                ON d.id_campana = c.id_campana
             INNER JOIN usuarios u
                ON d.id_usuario = u.id_usuario`;

        const parametros = [];

        if (estado) {
            sql += " WHERE d.estado = ?";
            parametros.push(estado);
        }

        // Primero las pendientes (las que requieren acción) y luego las más recientes
        sql += " ORDER BY (d.estado = 'PENDIENTE') DESC, d.fecha_registro DESC";

        const [donaciones] = await pool.execute(sql, parametros);

        return res.status(200).json({
            mensaje: "Donaciones consultadas correctamente.",
            donaciones
        });

    } catch (error) {

        console.error("Error al consultar donaciones:", error);

        return res.status(500).json({
            mensaje: "Error al consultar las donaciones."
        });
    }
};

// ==========================================
// ADMINISTRADOR: CAMBIAR ESTADO DE UNA DONACIÓN
// PENDIENTE -> CONFIRMADA / RECHAZADA
// CONFIRMADA -> ENTREGADA / RECHAZADA
// ==========================================

const cambiarEstadoDonacion = async (req, res) => {

    const idDonacion = Number(req.params.id);
    const { estado } = req.body || {};

    if (!Number.isInteger(idDonacion) || idDonacion <= 0) {
        return res.status(400).json({ mensaje: "El identificador de la donación no es válido." });
    }

    const estadosOrigen = TRANSICIONES[estado];

    if (!estadosOrigen) {
        return res.status(400).json({
            mensaje: "El nuevo estado debe ser CONFIRMADA, RECHAZADA o ENTREGADA."
        });
    }

    try {

        const marcadores = estadosOrigen.map(() => "?").join(", ");

        const [resultado] = await pool.execute(
            `UPDATE donaciones
             SET estado = ?
             WHERE id_donacion = ?
             AND estado IN (${marcadores})`,
            [estado, idDonacion, ...estadosOrigen]
        );

        if (resultado.affectedRows === 0) {
            return res.status(409).json({
                mensaje: "La donación no existe o no puede pasar a ese estado desde su estado actual."
            });
        }

        return res.status(200).json({
            mensaje: "Donación actualizada a " + estado + "."
        });

    } catch (error) {

        console.error("Error al cambiar el estado de la donación:", error);

        return res.status(500).json({
            mensaje: "No fue posible actualizar la donación."
        });
    }
};

module.exports = {
    registrarDonacion,
    obtenerMisDonaciones,
    obtenerDonaciones,
    cambiarEstadoDonacion
};
