const pool = require("../config/db");
const bcrypt = require("bcrypt");

// Registrar un nuevo usuario
const registrarUsuario = async (req, res) => {
    const { nombre, apellido, correo, password, telefono } = req.body;

    // 1. Validar que los campos obligatorios estén completos
    if (!nombre || !apellido || !correo || !password) {
        return res.status(400).json({
            mensaje: "Nombre, apellido, correo y contraseña son obligatorios."
        });
    }

    // 2. Validar formato del correo
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoValido.test(correo)) {
        return res.status(400).json({
            mensaje: "El correo electrónico no tiene un formato válido."
        });
    }

    // 3. Validar longitud de la contraseña
    if (password.length < 8) {
        return res.status(400).json({
            mensaje: "La contraseña debe tener mínimo 8 caracteres."
        });
    }

    // 4. Validar longitudes de los campos
    if (
        nombre.length > 60 || apellido.length > 60 || correo.length > 120 || (telefono && telefono.length > 20)
    ) {
        return res.status(400).json({
            mensaje: "Uno o más campos superan la longitud permitida."
        });
    }

    let conexion;

    try {
        conexion = await pool.getConnection();

        // 5. Comprobar si el correo ya existe
        const [usuariosExistentes] = await conexion.execute(
            "SELECT id_usuario FROM usuarios WHERE correo = ?",
            [correo]
        );

        if (usuariosExistentes.length > 0) {
            return res.status(409).json({
                mensaje: "Este correo electrónico ya está registrado."
            });
        }

        // 6. Encriptar la contraseña mediante bcrypt
        const passwordHash = await bcrypt.hash(password, 12);

        // 7. Iniciar transacción
        await conexion.beginTransaction();

        // 8. Insertar el usuario
        const [resultado] = await conexion.execute(
            `INSERT INTO usuarios
            (nombre, apellido, correo, password_hash, telefono)
            VALUES (?, ?, ?, ?, ?)`,
            [nombre, apellido, correo, passwordHash, telefono || null]
        );

        const idUsuario = resultado.insertId;

        // 9. Consultar el rol COMPRADOR
        const [roles] = await conexion.execute(
            "SELECT id_rol FROM roles WHERE nombre = ?",
            ["COMPRADOR"]
        );

        if (roles.length === 0) {
            throw new Error("No existe el rol COMPRADOR en la base de datos.");
        }

        // 10. Asignar el rol al usuario
        await conexion.execute(
            `INSERT INTO usuarios_roles (id_usuario, id_rol)
             VALUES (?, ?)`,
            [idUsuario, roles[0].id_rol]
        );

        // 11. Confirmar los cambios
        await conexion.commit();

        return res.status(201).json({
            mensaje: "Usuario registrado correctamente.",
            usuario: {
                id_usuario: idUsuario,
                nombre,
                apellido,
                correo,
                rol: "COMPRADOR"
            }
        });

    } catch (error) {
        // Si ocurre un error, deshacer los cambios
        if (conexion) {
            await conexion.rollback();
        }

        console.error("Error al registrar usuario:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "El correo electrónico ya se encuentra registrado."
            });
        }

        return res.status(500).json({
            mensaje: "Ocurrió un error al registrar el usuario."
        });

    } finally {
        if (conexion) {
            conexion.release();
        }
    }
};

module.exports = {
    registrarUsuario
};
