// ==========================================
// ELEMENTOS DE LA PÁGINA
// ==========================================

const formulario = document.getElementById("formEmpresa");
const mensaje = document.getElementById("mensaje");
const avisoSesion = document.getElementById("avisoSesion");
const opcionesAcceso = document.getElementById("opcionesAccesoEmpresa");

// ==========================================
// MOSTRAR AVISO PARA USUARIOS SIN SESIÓN
// ==========================================

function mostrarAvisoSesion() {

    formulario.hidden = true;
    avisoSesion.hidden = false;

}

// ==========================================
// MOSTRAR FORMULARIO A USUARIOS AUTENTICADOS
// ==========================================

function mostrarFormularioEmpresa() {

    formulario.hidden = false;
    avisoSesion.hidden = true;

}

// ==========================================
// CONFIGURAR ENCABEZADO
// ==========================================

function mostrarAccesoPublico() {

    opcionesAcceso.replaceChildren();

    const enlaceInicio = document.createElement("a");
    enlaceInicio.href = "/";
    enlaceInicio.textContent = "Inicio";

    const enlaceLogin = document.createElement("a");
    enlaceLogin.href = "/login.html";
    enlaceLogin.textContent = "Iniciar sesión";

    opcionesAcceso.append(enlaceInicio, enlaceLogin);

}

function mostrarAccesoUsuario() {

    opcionesAcceso.replaceChildren();

    const enlaceInicio = document.createElement("a");
    enlaceInicio.href = "/";
    enlaceInicio.textContent = "Inicio";

    const enlacePanel = document.createElement("a");
    enlacePanel.href = "/panel.html";
    enlacePanel.textContent = "Mi panel";

    const botonCerrar = document.createElement("button");
    botonCerrar.type = "button";
    botonCerrar.className = "btn-cerrar-sesion";
    botonCerrar.textContent = "Cerrar sesión";

    botonCerrar.addEventListener("click", async function() {

        botonCerrar.disabled = true;

        await Auth.cerrarSesion();

    });

    opcionesAcceso.append(enlaceInicio, enlacePanel, botonCerrar);

}

// ==========================================
// COMPROBAR SESIÓN AL CARGAR LA PÁGINA
// ==========================================

document.addEventListener("DOMContentLoaded", async function() {

    const sesionValida = await Auth.verificarSesion();

    if (!sesionValida) {

        mostrarAvisoSesion();
        mostrarAccesoPublico();

        return;
    }

    mostrarFormularioEmpresa();
    mostrarAccesoUsuario();

});

// ==========================================
// REGISTRAR COMERCIO
// ==========================================

formulario.addEventListener("submit", async function(evento) {

    evento.preventDefault();

    const token = Auth.obtenerToken();

    if (!token) {

        Auth.limpiarSesion();
        mostrarAvisoSesion();
        mostrarAccesoPublico();

        mensaje.textContent =
            "Tu sesión ha finalizado. Debes iniciar sesión para continuar.";

        return;
    }

    const datosEmpresa = {

        nit: document.getElementById("nit").value.trim(),
        nombre: document.getElementById("nombre").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        direccion: document.getElementById("direccion").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        correo: document.getElementById("correo").value.trim()

    };

    const boton = formulario.querySelector("button[type='submit']");

    boton.disabled = true;
    mensaje.textContent = "Registrando comercio...";

    try {

        const respuesta = await fetch("/api/empresas/registrar", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },

            body: JSON.stringify(datosEmpresa)

        });

        const resultado = await respuesta.json();

        if (respuesta.status === 401 || respuesta.status === 403) {

            Auth.limpiarSesion();

            mostrarAvisoSesion();
            mostrarAccesoPublico();

            mensaje.textContent =
                "Tu sesión ha expirado o no tienes autorización. Inicia sesión nuevamente.";

            return;
        }

        if (!respuesta.ok) {

            mensaje.textContent =
                resultado.mensaje || "No fue posible registrar el comercio.";

            return;
        }

        // Actualizar el token si el servidor entrega uno nuevo
        if (resultado.token) {

            sessionStorage.setItem("token", resultado.token);

        }

        // Actualizar los datos del usuario y sus roles
        await Auth.verificarSesion();

        mensaje.textContent =
            resultado.mensaje || "Comercio registrado correctamente.";

        formulario.reset();

    } catch (error) {

        console.error("Error al registrar el comercio:", error);

        mensaje.textContent =
            "No fue posible conectar con el servidor.";

    } finally {

        boton.disabled = false;

    }

});