
document.addEventListener("DOMContentLoaded", async function() {

    // ==========================================
    // PROTEGER ACCESO AL PANEL
    // ==========================================

    const sesionValida = await Auth.protegerPagina();

    if (!sesionValida) {
        return;
    }

    // ==========================================
    // OBTENER DATOS DEL USUARIO
    // ==========================================

    const usuario = Auth.obtenerUsuario();

    const saludo = document.getElementById("saludo");
    const botonCerrarSesion = document.getElementById("btnCerrarSesion");

    if (!usuario) {
        Auth.limpiarSesion();
        window.location.replace("/login.html");
        return;
    }

    // ==========================================
    // CAMPAÑAS DE DONACIÓN ACTIVAS (al inicio del panel)
    // ==========================================

    Campanas.cargar(document.getElementById("lista-campanas"));

    // ==========================================
    // MOSTRAR SALUDO
    // ==========================================

    if (saludo) {
        saludo.textContent =
            "¡Bienvenido/a, " + usuario.nombre + "!";
    }

    // ==========================================
    // MOSTRAR OPCIONES SEGÚN LOS ROLES
    // ==========================================


const rolesUsuario = [];

if (Array.isArray(usuario.roles)) {

    usuario.roles.forEach(function(rol) {

        const nombreRol = typeof rol === "string"
            ? rol
            : rol.nombre || rol.rol || "";

        if (nombreRol) {
            rolesUsuario.push(nombreRol.toUpperCase());
        }

    });

}

// Compatibilidad con respuestas que utilizan un solo rol
if (usuario.rol && typeof usuario.rol === "string") {

    rolesUsuario.push(usuario.rol.toUpperCase());

}


    const tarjetas = document.querySelectorAll("[data-roles]");

    tarjetas.forEach(function(tarjeta) {

        const rolesPermitidos = tarjeta.dataset.roles
            .split(",")
            .map(rol => rol.trim().toUpperCase());

        const tienePermiso = rolesPermitidos.some(function(rol) {
            return rolesUsuario.includes(rol);
        });

        tarjeta.style.display = tienePermiso ? "" : "none";

    });

    // ==========================================
    // CERRAR SESIÓN
    // ==========================================

    if (botonCerrarSesion) {

        botonCerrarSesion.addEventListener("click", async function() {

            botonCerrarSesion.disabled = true;

            await Auth.cerrarSesion();

        });

    }

});
