
// ==========================================
// VERIFICAR LOS PERMISOS DEL USUARIO
// ==========================================

function verificarRol(...rolesPermitidos) {

    return (req, res, next) => {

        // Comprobar que el usuario haya sido autenticado
        if (!req.usuario) {
            return res.status(401).json({
                mensaje: "Debes iniciar sesión para realizar esta acción."
            });
        }

        // Obtener los roles del usuario desde el token
        const rolesUsuario = Array.isArray(req.usuario.roles)
            ? req.usuario.roles
            : [];

        // Comprobar si tiene al menos uno de los roles permitidos
        const tienePermiso = rolesUsuario.some(rol =>
            rolesPermitidos.includes(rol)
        );

        // Si no tiene permisos, denegar el acceso
        if (!tienePermiso) {
            return res.status(403).json({
                mensaje: "No tienes permisos para realizar esta acción."
            });
        }

        // Si tiene permisos, continuar con la ruta
        next();

    };

}

module.exports = verificarRol;
