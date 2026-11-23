
const mensaje = document.getElementById("mensajePublicaciones");
const lista = document.getElementById("listaPublicaciones");

const token = sessionStorage.getItem("token");

// Formatear el precio
function formatearPrecio(precio) {

    if (precio === null || precio === undefined || precio === "") {
        return "Consultar";
    }

    const valor = Number(precio);

    if (valor === 0) {
        return "Gratuito";
    }

    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(valor);

}


// Formatear la fecha
function formatearFecha(fecha) {

    if (!fecha) {
        return "No disponible";
    }

    const fechaFormateada = new Date(
        String(fecha).replace(" ", "T")
    );

    if (Number.isNaN(fechaFormateada.getTime())) {
        return "No disponible";
    }

    return fechaFormateada.toLocaleDateString("es-CO");

}


// Crear una celda de la tabla
function crearCelda(contenido) {

    const celda = document.createElement("td");
    celda.textContent = contenido;

    return celda;

}

// Mostrar las publicaciones
function mostrarPublicaciones(publicaciones) {

    lista.innerHTML = "";

    if (publicaciones.length === 0) {

        mensaje.textContent = "Todavía no has registrado publicaciones.";
        return;

    }

    mensaje.textContent =
        "Se encontraron " + publicaciones.length + " publicaciones.";

    publicaciones.forEach(publicacion => {

        const fila = document.createElement("tr");

        fila.appendChild(crearCelda(publicacion.nombre));
        fila.appendChild(crearCelda(publicacion.tipo));
        fila.appendChild(crearCelda(publicacion.categoria));
        fila.appendChild(crearCelda(formatearPrecio(publicacion.precio)));

        fila.appendChild(
            crearCelda(
                publicacion.cantidad === null
                    ? "No aplica"
                    : publicacion.cantidad
            )
        );

        const celdaEstado = document.createElement("td");
        const etiquetaEstado = document.createElement("span");

        etiquetaEstado.textContent = publicacion.estado;
        etiquetaEstado.className =
            "estado-publicacion estado-" +
            String(publicacion.estado).toLowerCase();

        celdaEstado.appendChild(etiquetaEstado);
        fila.appendChild(celdaEstado);

        fila.appendChild(
            crearCelda(formatearFecha(publicacion.fecha_publicacion))
        );

        lista.appendChild(fila);

    });

}

// Consultar publicaciones del comerciante
async function cargarPublicaciones() {

    if (!token) {

        window.location.href = "/login.html";
        return;

    }

    try {

        const respuesta = await fetch(
            "/api/publicaciones/mis-publicaciones",
            {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const resultado = await respuesta.json();

        if (respuesta.status === 401 || respuesta.status === 403) {

            sessionStorage.removeItem("token");
            sessionStorage.removeItem("usuario");

            window.location.href = "/login.html";
            return;

        }

        if (!respuesta.ok) {

            mensaje.textContent =
                resultado.mensaje || "No fue posible consultar las publicaciones.";

            return;

        }

        mostrarPublicaciones(resultado.publicaciones);

    } catch (error) {

        console.error("Error al consultar publicaciones:", error);

        mensaje.textContent =
            "No fue posible conectar con el servidor.";

    }

}

document.addEventListener("DOMContentLoaded", async function() {

    const sesionValida = await Auth.protegerPagina();

    if (!sesionValida) {
        return;
    }

});
// Ejecutar la consulta
cargarPublicaciones();