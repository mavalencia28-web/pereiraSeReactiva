
// ==========================================
// CONFIGURACIÓN GENERAL DE AUTENTICACIÓN
// ==========================================

const Auth = {

    paginaLogin: "/login.html",

    // ======================================
    // OBTENER TOKEN
    // ======================================

    obtenerToken() {
        return sessionStorage.getItem("token");
    },

    // ======================================
    // OBTENER DATOS DEL USUARIO
    // ======================================

    obtenerUsuario() {

        const usuarioGuardado = sessionStorage.getItem("usuario");

        if (!usuarioGuardado) {
            return null;
        }

        try {

            const usuario = JSON.parse(usuarioGuardado);

            if (!usuario || !usuario.id_usuario) {
                return null;
            }

            return usuario;

        } catch (error) {

            console.error("Error al leer los datos del usuario:", error);

            return null;
        }
    },

    // ======================================
    // LIMPIAR DATOS DE SESIÓN
    // ======================================

    limpiarSesion() {

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");

    },

    // ======================================
    // VERIFICAR SESIÓN EN EL SERVIDOR
    // ======================================

    async verificarSesion() {

        const token = this.obtenerToken();
        const usuario = this.obtenerUsuario();

        if (!token || !usuario) {

            this.limpiarSesion();

            return false;
        }

        try {

            const respuesta = await fetch("/api/auth/verificar", {

                method: "GET",

                headers: {
                    "Authorization": "Bearer " + token
                },

                cache: "no-store"

            });

            if (respuesta.status === 401 || respuesta.status === 403) {

                this.limpiarSesion();

                return false;
            }

            if (!respuesta.ok) {

                throw new Error("No fue posible verificar la sesión.");
            }

            const resultado = await respuesta.json();

            if (!resultado.usuario) {

                this.limpiarSesion();

                return false;
            }

            sessionStorage.setItem(
                "usuario",
                JSON.stringify(resultado.usuario)
            );

            return true;

        } catch (error) {

            console.error("Error al verificar la sesión:", error);

            // Si no podemos comprobar la sesión, no permitimos mantener el acceso a la vista privada.
            this.limpiarSesion();

            return false;
        }
    },

    // ======================================
    // PROTEGER UNA PÁGINA
    // ======================================

    async protegerPagina() {

        const paginaProtegida =
            document.body.dataset.protegida === "true";

        if (!paginaProtegida) {
            return true;
        }

        // Mantener oculta la página mientras se verifica

        const sesionValida = await this.verificarSesion();

        if (!sesionValida) {

            this.limpiarSesion();

            // Recordar la página pedida para volver a ella después de iniciar sesión
            sessionStorage.setItem(
                "volverA",
                window.location.pathname + window.location.search
            );

            window.location.replace(this.paginaLogin);

            return false;
        }
        return true;
    },

    // ======================================
    // CERRAR SESIÓN
    // ======================================

    async cerrarSesion() {

        const token = this.obtenerToken();

        // Limpiar inmediatamente los datos locales para impedir que la navegación los reutilice.
        this.limpiarSesion();

        try {

            if (token) {

                const respuesta = await fetch("/api/auth/logout", {

                    method: "POST",

                    headers: {
                        "Authorization": "Bearer " + token
                    },

                    cache: "no-store"

                });

                if (!respuesta.ok) {

                    console.error(
                        "El servidor no confirmó el cierre de sesión."
                    );
                }
            }

        } catch (error) {

            console.error(
                "No fue posible contactar al servidor para cerrar sesión:",
                error
            );

        } finally {

            window.location.replace(this.paginaLogin);

        }
    }

};

// ==========================================
// COMPROBAR SESIÓN AL REGRESAR A UNA PÁGINA
// ==========================================

window.addEventListener("pageshow", function(evento) {

    const paginaProtegida =
        document.body.dataset.protegida === "true";

    if (paginaProtegida && evento.persisted) {
        Auth.protegerPagina();
    }

});