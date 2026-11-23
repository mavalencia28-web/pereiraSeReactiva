
// ==========================================
// LIMPIAR CAMPOS DEL INICIO DE SESIÓN
// ==========================================

function limpiarFormularioLogin() {

    const correo = document.getElementById("correo");
    const password = document.getElementById("password");

    if (correo) {
        correo.value = "";
    }

    if (password) {
        password.value = "";
    }

}

// ==========================================
// COMPROBAR SI YA EXISTE UNA SESIÓN
// ==========================================

document.addEventListener("DOMContentLoaded", async function() {

    const token = Auth.obtenerToken();
    const usuario = Auth.obtenerUsuario();

    if (token && usuario) {

        // Comprobar que la sesión siga activa en el servidor
        const sesionValida = await Auth.verificarSesion();

        if (sesionValida) {

            window.location.replace("/panel.html");

        } else {

            Auth.limpiarSesion();
            limpiarFormularioLogin();

        }

    } else {

        // Evitar conservar información incompleta
        Auth.limpiarSesion();
        limpiarFormularioLogin();

    }

});

// ==========================================
// ELEMENTOS DEL FORMULARIO
// ==========================================

const formulario = document.getElementById("formLogin");
const respuesta = document.getElementById("respuesta");
const boton = document.getElementById("btnLogin");

// ==========================================
// INICIAR SESIÓN
// ==========================================

formulario.addEventListener("submit", async function(event) {

    event.preventDefault();

    // Comprobar nuevamente que no exista otra sesión
    if (sessionStorage.getItem("token")) {

        respuesta.textContent =
            "Ya tienes una sesión iniciada. Cierra sesión antes de ingresar con otra cuenta.";

        respuesta.className = "error";

        return;

    }

    respuesta.style.display = "block";
    respuesta.textContent = "Verificando información...";
    respuesta.className = "";

    const datos = {
        correo: document.getElementById("correo").value.trim(),
        password: document.getElementById("password").value
    };

    boton.disabled = true;
    boton.textContent = "Ingresando...";

    try {

        const peticion = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const resultado = await peticion.json();

        if (peticion.ok) {

            // Guardar token y datos del usuario
            sessionStorage.setItem("token", resultado.token);

            sessionStorage.setItem(
                "usuario",
                JSON.stringify(resultado.usuario)
            );

            respuesta.textContent = resultado.mensaje;
            respuesta.className = "exito";

            // Volver a la página que el usuario intentaba abrir (si existe)
            const destino = sessionStorage.getItem("volverA");
            sessionStorage.removeItem("volverA");

            const destinoSeguro =
                destino && destino.startsWith("/") && !destino.startsWith("//")
                    ? destino
                    : "/panel.html";

            window.location.replace(destinoSeguro);

        } else {

            respuesta.textContent = resultado.mensaje;
            respuesta.className = "error";

        }

    } catch (error) {

        console.error("Error:", error);

        respuesta.textContent =
            "No fue posible conectar con el servidor.";

        respuesta.className = "error";

    } finally {

        boton.disabled = false;
        boton.textContent = "Iniciar sesión";

    }

});

// ==========================================
// LIMPIAR FORMULARIO AL REGRESAR A LOGIN
// ==========================================

window.addEventListener("pageshow", function(evento) {

    // Limpiar los campos cuando la página se muestra
    // nuevamente, incluyendo cuando se restaura desde memoria.

    limpiarFormularioLogin();

});
