
const pool = require("../config/db");

// Consultar publicaciones visibles para todos
const obtenerPublicaciones = async (req, res) => {
    try {
        const [publicaciones] = await pool.execute(`
            SELECT
                p.id_publicacion,
                p.nombre,
                p.descripcion,
                p.tipo,
                p.precio,
                p.cantidad,
                p.fecha_publicacion,
                e.nombre AS empresa,
                e.telefono AS telefono_empresa,
                c.nombre AS categoria
            FROM publicaciones p
            INNER JOIN empresas e
                ON p.id_empresa = e.id_empresa
            INNER JOIN categorias c
                ON p.id_categoria = c.id_categoria
            WHERE p.estado = 'PUBLICADO'
                AND e.estado_verificacion = 'APROBADA'
                AND c.activa = 1
            ORDER BY p.fecha_publicacion DESC
            LIMIT 8
        `);

        res.status(200).json({
            mensaje: "Publicaciones consultadas correctamente.",
            publicaciones
        });

    } catch (error) {
        console.error("Error al consultar publicaciones:", error);

        res.status(500).json({
            mensaje: "Error al consultar las publicaciones."
        });
    }
};


// Consultar el detalle de una publicación (botón "Ver más")
const obtenerPublicacionPorId = async (req, res) => {

    const idPublicacion = Number(req.params.id);

    if (!Number.isInteger(idPublicacion) || idPublicacion <= 0) {
        return res.status(400).json({
            mensaje: "El identificador de la publicación no es válido."
        });
    }

    try {

        const [publicaciones] = await pool.execute(
            `SELECT
                p.id_publicacion,
                p.nombre,
                p.descripcion,
                p.tipo,
                p.precio,
                p.cantidad,
                p.fecha_publicacion,
                e.nombre AS empresa,
                e.descripcion AS descripcion_empresa,
                e.direccion AS direccion_empresa,
                e.telefono AS telefono_empresa,
                c.nombre AS categoria
             FROM publicaciones p
             INNER JOIN empresas e
                ON p.id_empresa = e.id_empresa
             INNER JOIN categorias c
                ON p.id_categoria = c.id_categoria
             WHERE p.id_publicacion = ?
             AND p.estado = 'PUBLICADO'
             AND e.estado_verificacion = 'APROBADA'
             AND c.activa = 1`,
            [idPublicacion]
        );

        if (publicaciones.length === 0) {
            return res.status(404).json({
                mensaje: "La publicación no existe o no está disponible."
            });
        }

        return res.status(200).json({
            mensaje: "Publicación consultada correctamente.",
            publicacion: publicaciones[0]
        });

    } catch (error) {

        console.error("Error al consultar la publicación:", error);

        return res.status(500).json({
            mensaje: "Error al consultar la publicación."
        });
    }
};


// Registrar un producto o servicio
const registrarPublicacion = async (req, res) => {

    const {
        id_categoria,
        tipo,
        nombre,
        descripcion,
        precio,
        cantidad
    } = req.body;

    // Validar campos obligatorios
    if (!id_categoria || !tipo || !nombre || !descripcion) {
        return res.status(400).json({
            mensaje: "Completa todos los campos obligatorios."
        });
    }

    // Validar tipo de publicación
    if (tipo !== "PRODUCTO" && tipo !== "SERVICIO") {
        return res.status(400).json({
            mensaje: "El tipo debe ser PRODUCTO o SERVICIO."
        });
    }

    // Validar categoría
    const categoriaId = Number(id_categoria);

    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
        return res.status(400).json({
            mensaje: "Selecciona una categoría válida."
        });
    }

    // Validar nombre y descripción
    if (nombre.trim().length === 0 || descripcion.trim().length === 0) {
        return res.status(400).json({
            mensaje: "El nombre y la descripción no pueden estar vacíos."
        });
    }

    // La columna nombre es VARCHAR(100) en la base de datos
    if (nombre.trim().length > 100) {
        return res.status(400).json({
            mensaje: "El nombre no puede superar los 100 caracteres."
        });
    }

    // El precio puede quedar vacío para indicar que se consulta
    let precioFinal = null;

    if (precio !== undefined && precio !== null && precio !== "") {

        precioFinal = Number(precio);

        if (!Number.isFinite(precioFinal) || precioFinal < 0) {
            return res.status(400).json({
                mensaje: "El precio debe ser un número igual o mayor que cero."
            });
        }
    }

    // La cantidad es obligatoria para productos
    let cantidadFinal = null;

    if (tipo === "PRODUCTO") {

        if (cantidad === undefined || cantidad === null || cantidad === "") {
            return res.status(400).json({
                mensaje: "Debes indicar la cantidad disponible del producto."
            });
        }

        cantidadFinal = Number(cantidad);

        if (!Number.isInteger(cantidadFinal) || cantidadFinal < 0) {
            return res.status(400).json({
                mensaje: "La cantidad debe ser un número entero igual o mayor que cero."
            });
        }
    }

    try {

        const idUsuario = req.usuario.id_usuario;

        // Comprobar que el usuario tenga una empresa aprobada
        const [empresas] = await pool.execute(
            `SELECT id_empresa
             FROM empresas
             WHERE id_usuario = ?
             AND estado_verificacion = 'APROBADA'
             LIMIT 1`,
            [idUsuario]
        );

        if (empresas.length === 0) {

            const [empresasUsuario] = await pool.execute(
                `SELECT estado_verificacion
                 FROM empresas
                 WHERE id_usuario = ?
                 LIMIT 1`,
                [idUsuario]
            );

            if (empresasUsuario.length === 0) {
                return res.status(403).json({
                    mensaje: "Primero debes registrar una empresa."
                });
            }

            return res.status(403).json({
                mensaje: "Tu empresa todavía no ha sido aprobada. Podrás publicar cuando el administrador la verifique."
            });
        }

        const idEmpresa = empresas[0].id_empresa;

        // Comprobar que la categoría exista y esté activa
        const [categorias] = await pool.execute(
            `SELECT id_categoria
             FROM categorias
             WHERE id_categoria = ?
             AND activa = 1`,
            [categoriaId]
        );

        if (categorias.length === 0) {
            return res.status(400).json({
                mensaje: "La categoría seleccionada no existe o está inactiva."
            });
        }

        // Registrar publicación con estado inicial PENDIENTE
        const [resultado] = await pool.execute(
            `INSERT INTO publicaciones
            (id_empresa, id_categoria, tipo, nombre, descripcion,
             precio, cantidad, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idEmpresa,
                categoriaId,
                tipo,
                nombre.trim(),
                descripcion.trim(),
                precioFinal,
                cantidadFinal,
                "PENDIENTE"
            ]
        );

        return res.status(201).json({
            mensaje: "Publicación registrada correctamente. Está pendiente de aprobación.",
            id_publicacion: resultado.insertId
        });

    } catch (error) {

        console.error("Error al registrar publicación:", error);

        return res.status(500).json({
            mensaje: "Ocurrió un error al registrar la publicación."
        });
    }
};


// Consultar las publicaciones de la empresa del usuario
const obtenerMisPublicaciones = async (req, res) => {

    try {

        const idUsuario = req.usuario.id_usuario;

        const [publicaciones] = await pool.execute(
            `SELECT
                p.id_publicacion,
                p.nombre,
                p.descripcion,
                p.tipo,
                p.precio,
                p.cantidad,
                p.estado,
                p.fecha_publicacion,
                c.nombre AS categoria
             FROM publicaciones p
             INNER JOIN empresas e
                ON p.id_empresa = e.id_empresa
             INNER JOIN categorias c
                ON p.id_categoria = c.id_categoria
             WHERE e.id_usuario = ?
             ORDER BY p.id_publicacion DESC`,
            [idUsuario]
        );

        res.status(200).json({
            mensaje: "Tus publicaciones fueron consultadas correctamente.",
            publicaciones
        });

    } catch (error) {

        console.error("Error al consultar mis publicaciones:", error);

        res.status(500).json({
            mensaje: "Error al consultar tus publicaciones."
        });
    }
};

// Consultar publicaciones pendientes de aprobación (administrador)
const obtenerPublicacionesPendientes = async (req, res) => {

    try {

        const [publicaciones] = await pool.execute(
            `SELECT
                p.id_publicacion,
                p.nombre,
                p.descripcion,
                p.tipo,
                p.precio,
                p.cantidad,
                p.fecha_publicacion,
                e.id_empresa,
                e.nombre AS empresa,
                e.nit,
                c.nombre AS categoria
             FROM publicaciones p
             INNER JOIN empresas e
                ON p.id_empresa = e.id_empresa
             INNER JOIN categorias c
                ON p.id_categoria = c.id_categoria
             WHERE p.estado = 'PENDIENTE'
             ORDER BY p.fecha_publicacion ASC`
        );

        res.status(200).json({
            mensaje: "Publicaciones pendientes consultadas correctamente.",
            publicaciones
        });

    } catch (error) {

        console.error("Error al consultar publicaciones pendientes:", error);

        res.status(500).json({
            mensaje: "Error al consultar las publicaciones pendientes."
        });
    }
};

// Aprobar una publicación (solo administrador)
const aprobarPublicacion = async (req, res) => {

    const idPublicacion = Number(req.params.id);

    if (!Number.isInteger(idPublicacion) || idPublicacion <= 0) {
        return res.status(400).json({
            mensaje: "El identificador de la publicación no es válido."
        });
    }

    try {

        const [resultado] = await pool.execute(
            `UPDATE publicaciones p
             INNER JOIN empresas e
                ON p.id_empresa = e.id_empresa
             SET p.estado = 'PUBLICADO'
             WHERE p.id_publicacion = ?
             AND p.estado = 'PENDIENTE'
             AND e.estado_verificacion = 'APROBADA'`,
            [idPublicacion]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "No se encontró una publicación pendiente o su empresa no está aprobada."
            });
        }

        return res.status(200).json({
            mensaje: "Publicación aprobada correctamente."
        });

    } catch (error) {

        console.error("Error al aprobar publicación:", error);

        return res.status(500).json({
            mensaje: "No fue posible aprobar la publicación."
        });
    }
};


// Rechazar una publicación (solo administrador)
const rechazarPublicacion = async (req, res) => {

    const idPublicacion = Number(req.params.id);

    if (!Number.isInteger(idPublicacion) || idPublicacion <= 0) {
        return res.status(400).json({
            mensaje: "El identificador de la publicación no es válido."
        });
    }

    try {

        const [resultado] = await pool.execute(
            `UPDATE publicaciones
             SET estado = 'INACTIVO'
             WHERE id_publicacion = ?
             AND estado = 'PENDIENTE'`,
            [idPublicacion]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "No se encontró una publicación pendiente con ese identificador."
            });
        }

        return res.status(200).json({
            mensaje: "Publicación rechazada correctamente."
        });

    } catch (error) {

        console.error("Error al rechazar publicación:", error);

        return res.status(500).json({
            mensaje: "No fue posible rechazar la publicación."
        });
    }
};

const obtenerCategorias = async (req, res) => {

    try {

        const [categorias] = await pool.execute(
            `SELECT id_categoria, nombre
             FROM categorias
             WHERE activa = 1
             ORDER BY nombre ASC`
        );

        res.status(200).json({
            mensaje: "Categorías consultadas correctamente.",
            categorias
        });

    } catch (error) {

        console.error("Error al consultar categorías:", error);

        res.status(500).json({
            mensaje: "Error al consultar las categorías."
        });
    }
};


module.exports = {
    obtenerPublicaciones,
    obtenerPublicacionPorId,
    registrarPublicacion,
    obtenerMisPublicaciones,
    obtenerCategorias,
    obtenerPublicacionesPendientes,
    aprobarPublicacion,
    rechazarPublicacion
};
