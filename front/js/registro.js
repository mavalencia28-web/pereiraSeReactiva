console.log("JavaScript del registro está funcionando");

const formulario = document.getElementById("formRegistro");
const respuesta = document.getElementById("respuesta");
const boton = document.getElementById("btnRegistrar");

formulario.addEventListener("submit", async function(event) {

    event.preventDefault();

    console.log("Se presionó Registrarse");

    respuesta.style.display = "block";
    respuesta.textContent = "Enviando información...";
    respuesta.className = "";

    const usuario = {
        nombre: document.getElementById("nombre").value.trim(),
        apellido: document.getElementById("apellido").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        password: document.getElementById("password").value,
        telefono: document.getElementById("telefono").value.trim()
    };

    boton.disabled = true;
    boton.textContent = "Registrando...";

    try {

        const peticion = await fetch("/api/usuarios/registrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(usuario)
        });

        const resultado = await peticion.json();

        console.log("Respuesta del servidor:", peticion.status);

        respuesta.textContent = resultado.mensaje;

        if (peticion.ok) {

            respuesta.className = "exito";
            formulario.reset();

        } else {

            respuesta.className = "error";

        }

    } catch (error) {

        console.error("Error:", error);

        respuesta.textContent =
            "No fue posible conectar con el servidor.";

        respuesta.className = "error";

    } finally {

        boton.disabled = false;
        boton.textContent = "Registrarse";

    }

});
