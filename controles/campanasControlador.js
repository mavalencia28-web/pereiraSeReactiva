const pool = require("../config/db");

// ==========================================
// CONSTANTES Y FUNCIONES DE VALIDACIÓN
// ==========================================

const TIPOS_ACEPTACION = ["ECONOMICA", "ESPECIE", "AMBAS"];
const ESTADOS_CAMPANA = ["PENDIENTE", "ACTIVA", "FINALIZADA", "CANCELADA"];
const MONTO_MAXIMO = 9999999999.99; // límite de DECIMAL(12,2)

// Comprueba que el texto tenga formato AAAA-MM-DD y sea una fecha real
function esFechaValida(texto) {

    if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false;
    }

    const fecha = new Date(texto + "T00:00:00Z");

    return !Number.isNaN(fecha.getTime()) &&
        fecha.toISOString().slice(0, 10) === texto;
}

// Valida y limpia los datos de una campaña (sirve para crear y editar).
// Devuelve { error } si algo está mal o { datos } si todo es correcto.
function validarDatosCampana(cuerpo) {

    const {
        nombre,
        descripcion,
        tipo_aceptacion,
        meta_economica,
        fecha_inicio,
        fecha_fin
    } = cuerpo || {};

    if (typeof nombre !== "string" || nombre.trim().length === 0) {
        return { error: "El nombre de la campaña es obligatorio." };
    }

    if (nombre.trim().length > 120) {
        return { error: "El nombre no puede superar los 120 caracteres." };
    }

    if (typeof descripcion !== "string" || descripcion.trim().length === 0) {
        return { error: "La descripción de la campaña es obligatoria." };
    }

    if (descripcion.trim().length > 3000) {
        return { error: "La descripción no puede superar los 3000 caracteres." };
    }

    if (!TIPOS_ACEPTACION.includes(tipo_aceptacion)) {
        return { error: "El tipo de aceptación debe ser ECONOMICA, ESPECIE o AMBAS." };
    }

    if (!esFechaValida(fecha_inicio) || !esFechaValida(fecha_fin)) {
        return { error: "Las fechas deben tener el formato AAAA-MM-DD." };
    }

    if (fecha_fin < fecha_inicio) {
        return { error: "La fecha de finalización no puede ser anterior a la de inicio." };
    }

    // La meta solo aplica cuando la campaña recibe dinero
    let metaFinal = null;

    const hayMeta =
        meta_economica !== undefined &&
        meta_economica !== null &&
        meta_economica !== "";

    if (hayMeta) {

        if (tipo_aceptacion === "ESPECIE") {
            return { error: "Una campaña solo en especie no puede tener meta económica." };
        }

        metaFinal = Number(meta_economica);

        if (!Number.isFinite(metaFinal) || metaFinal <= 0 || metaFinal > MONTO_MAXIMO) {
            return { error: "La meta económica debe ser un número mayor que cero." };
        }
    }

    return {
        datos: {
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            tipo_aceptacion,
            meta_economica: metaFinal,
            fecha_inicio,
            fecha_fin
        }
    };
}

// Valida que el identificador recibido en la URL sea un entero positivo
function obtenerIdValido(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Fragmento SQL que calcula lo recaudado (solo donaciones confirmadas o entregadas)
const SQL_RECAUDADO = `
    COALESCE((
        SELECT SUM(d.monto)
        FROM donaciones d
        WHERE d.id_campana = c.id_campana
        AND d.tipo_donacion = 'ECONOMICA'
        AND d.estado IN ('CONFIRMADA', 'ENTREGADA')
    ), 0) AS recaudado`;

// ==========================================
// CAMPAÑAS PÚBLICAS (SIN INICIAR SESIÓN)
// ==========================================

const obtenerCampanasActivas = async (req, res) => {

    try {

        const [campanas] = await pool.execute(
            `SELECT
                c.id_campana,
                c.nombre,
                c.descripcion,
                c.tipo_aceptacion,
                c.meta_economica,
                DATE_FORMAT(c.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
                DATE_FORMAT(c.fecha_fin, '%Y-%m-%d') AS fecha_fin,
                ${SQL_RECAUDADO}
             FROM campanas c
             WHERE c.estado = 'ACTIVA'
             AND CURDATE() BETWEEN c.fecha_inicio AND c.fecha_fin
             ORDER BY c.fecha_fin ASC`
        );

        return res.status(200).json({
            mensaje: "Campañas consultadas correctamente.",
            campanas
        });

    } catch (error) {

        console.error("Error al consultar campañas activas:", error);

        return res.status(500).json({
            mensaje: "Error al consultar las campañas."
        });
    }
};

// ==========================================
// ADMINISTRADOR: LISTAR TODAS LAS CAMPAÑAS
// ==========================================

const obtenerTodasLasCampanas = async (req, res) => {

    try {

        const [campanas] = await pool.execute(
            `SELECT
                c.id_campana,
                c.nombre,
                c.descripcion,
                c.tipo_aceptacion,
                c.meta_economica,
                DATE_FORMAT(c.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
                DATE_FORMAT(c.fecha_fin, '%Y-%m-%d') AS fecha_fin,
                c.estado,
                (SELECT COUNT(*) FROM donaciones d
                  WHERE d.id_campana = c.id_campana) AS total_donaciones,
                (SELECT COUNT(*) FROM donaciones d
                  WHERE d.id_campana = c.id_campana
                  AND d.estado = 'PENDIENTE') AS donaciones_pendientes,
                ${SQL_RECAUDADO}
             FROM campanas c
             ORDER BY c.id_campana DESC`
        );

        return res.status(200).json({
            mensaje: "Campañas consultadas correctamente.",
            campanas
        });

    } catch (error) {

        console.error("Error al consultar campañas (admin):", error);

        return res.status(500).json({
            mensaje: "Error al consultar las campañas."
        });
    }
};

// ==========================================
// ADMINISTRADOR: CREAR CAMPAÑA
// ==========================================

const crearCampana = async (req, res) => {

    const resultadoValidacion = validarDatosCampana(req.body);

    if (resultadoValidacion.error) {
        return res.status(400).json({ mensaje: resultadoValidacion.error });
    }

    const d = resultadoValidacion.datos;

    // El administrador puede crearla directamente activa (por defecto)
    let estado = "ACTIVA";

    if (req.body.estado !== undefined) {

        if (!ESTADOS_CAMPANA.includes(req.body.estado)) {
            return res.status(400).json({ mensaje: "El estado de la campaña no es válido." });
        }

        estado = req.body.estado;
    }

    try {

        const [resultado] = await pool.execute(
            `INSERT INTO campanas
                (id_usuario, nombre, descripcion, tipo_aceptacion,
                 meta_economica, fecha_inicio, fecha_fin, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.usuario.id_usuario,
                d.nombre,
                d.descripcion,
                d.tipo_aceptacion,
                d.meta_economica,
                d.fecha_inicio,
                d.fecha_fin,
                estado
            ]
        );

        return res.status(201).json({
            mensaje: "Campaña creada correctamente.",
            id_campana: resultado.insertId
        });

    } catch (error) {

        console.error("Error al crear campaña:", error);

        return res.status(500).json({
            mensaje: "Ocurrió un error al crear la campaña."
        });
    }
};

// ==========================================
// ADMINISTRADOR: EDITAR CAMPAÑA
// ==========================================

const actualizarCampana = async (req, res) => {

    const idCampana = obtenerIdValido(req.params.id);

    if (!idCampana) {
        return res.status(400).json({ mensaje: "El identificador de la campaña no es válido." });
    }

    const resultadoValidacion = validarDatosCampana(req.body);

    if (resultadoValidacion.error) {
        return res.status(400).json({ mensaje: resultadoValidacion.error });
    }

    const d = resultadoValidacion.datos;

    try {

        // Si ya hay donaciones económicas no se puede dejar la campaña solo en especie
        if (d.tipo_aceptacion === "ESPECIE") {

            const [economicas] = await pool.execute(
                `SELECT COUNT(*) AS total FROM donaciones
                 WHERE id_campana = ? AND tipo_donacion = 'ECONOMICA'`,
                [idCampana]
            );

            if (economicas[0].total > 0) {
                return res.status(409).json({
                    mensaje: "La campaña ya tiene donaciones económicas; no puede cambiarse a solo especie."
                });
            }
        }

        if (d.tipo_aceptacion === "ECONOMICA") {

            const [especie] = await pool.execute(
                `SELECT COUNT(*) AS total FROM donaciones
                 WHERE id_campana = ? AND tipo_donacion = 'ESPECIE'`,
                [idCampana]
            );

            if (especie[0].total > 0) {
                return res.status(409).json({
                    mensaje: "La campaña ya tiene donaciones en especie; no puede cambiarse a solo económica."
                });
            }
        }

        const [resultado] = await pool.execute(
            `UPDATE campanas
             SET nombre = ?, descripcion = ?, tipo_aceptacion = ?,
                 meta_economica = ?, fecha_inicio = ?, fecha_fin = ?
             WHERE id_campana = ?`,
            [
                d.nombre,
                d.descripcion,
                d.tipo_aceptacion,
                d.meta_economica,
                d.fecha_inicio,
                d.fecha_fin,
                idCampana
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: "No se encontró la campaña." });
        }

        return res.status(200).json({ mensaje: "Campaña actualizada correctamente." });

    } catch (error) {

        console.error("Error al actualizar campaña:", error);

        return res.status(500).json({
            mensaje: "Ocurrió un error al actualizar la campaña."
        });
    }
};

// ==========================================
// ADMINISTRADOR: CAMBIAR ESTADO DE LA CAMPAÑA
// ==========================================

const cambiarEstadoCampana = async (req, res) => {

    const idCampana = obtenerIdValido(req.params.id);
    const { estado } = req.body || {};

    if (!idCampana) {
        return res.status(400).json({ mensaje: "El identificador de la campaña no es válido." });
    }

    if (!ESTADOS_CAMPANA.includes(estado)) {
        return res.status(400).json({ mensaje: "El estado de la campaña no es válido." });
    }

    try {

        const [resultado] = await pool.execute(
            "UPDATE campanas SET estado = ? WHERE id_campana = ?",
            [estado, idCampana]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: "No se encontró la campaña." });
        }

        return res.status(200).json({
            mensaje: "Estado de la campaña actualizado a " + estado + "."
        });

    } catch (error) {

        console.error("Error al cambiar el estado de la campaña:", error);

        return res.status(500).json({
            mensaje: "No fue posible cambiar el estado de la campaña."
        });
    }
};

// ==========================================
// ADMINISTRADOR: ELIMINAR CAMPAÑA
// ==========================================

const eliminarCampana = async (req, res) => {

    const idCampana = obtenerIdValido(req.params.id);

    if (!idCampana) {
        return res.status(400).json({ mensaje: "El identificador de la campaña no es válido." });
    }

    try {

        const [resultado] = await pool.execute(
            "DELETE FROM campanas WHERE id_campana = ?",
            [idCampana]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensaje: "No se encontró la campaña." });
        }

        return res.status(200).json({ mensaje: "Campaña eliminada correctamente." });

    } catch (error) {

        // La FK de donaciones es ON DELETE RESTRICT: protege el historial
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                mensaje: "La campaña tiene donaciones registradas y no puede eliminarse. Puedes cancelarla o finalizarla."
            });
        }

        console.error("Error al eliminar campaña:", error);

        return res.status(500).json({
            mensaje: "No fue posible eliminar la campaña."
        });
    }
};

module.exports = {
    obtenerCampanasActivas,
    obtenerTodasLasCampanas,
    crearCampana,
    actualizarCampana,
    cambiarEstadoCampana,
    eliminarCampana
};
