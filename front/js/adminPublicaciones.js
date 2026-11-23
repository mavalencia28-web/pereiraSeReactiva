const mensaje = document.getElementById("mensajeAdmin");
const lista = document.getElementById("listaPendientes");

const token = sessionStorage.getItem("token");
const usuarioGuardado = sessionStorage.getItem("usuario");

// Verificar que exista una sesión
if (!token || !usuarioGuardado) {
    window.location.href = "/login.html";
}

// Verificar que el usuario tenga el rol administrador
let usuario = null;

try {
    usuario = JSON.parse(usuarioGuardado);

} catch (error) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    window.location.href = "/login.html";
}

if (usuario && !usuario.roles.includes("ADMINISTRADOR")) {
    alert("No tienes permisos para acceder al panel administrativo.");
    window.location.href = "/panel.html";
}


// Formatear los precios
function formatearPrecio(precio) {

    if (precio === null || precio === undefined || precio === "") {
        return "Consultar";
    }

    if (Number(precio) === 0) {
        return "Gratuito";
    }

    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(precio));
}


// Crear una celda de la tabla
function crearCelda(contenido) {

    const celda = document.createElement("td");
    celda.textContent = contenido;

    return celda;
}


// Mostrar las publicaciones pendientes
function mostrarPublicaciones(publicaciones) {

    lista.innerHTML = "";

    if (publicaciones.length === 0) {
        mensaje.textContent = "No hay publicaciones pendientes de aprobación.";
        return;
    }

    mensaje.textContent = "Hay " + publicaciones.length +
        " publicaciones pendientes de revisión.";

    publicaciones.forEach(publicacion => {

        const fila = document.createElement("tr");

        fila.appendChild(crearCelda(publicacion.nombre));
        fila.appendChild(crearCelda(publicacion.empresa));
        fila.appendChild(crearCelda(publicacion.categoria));
        fila.appendChild(crearCelda(publicacion.tipo));
        fila.appendChild(crearCelda(formatearPrecio(publicacion.precio)));

        const celdaAcciones = document.createElement("td");

        const botonAprobar = document.createElement("button");
        botonAprobar.textContent = "Aprobar";
        botonAprobar.className = "btn-aprobar";
        botonAprobar.dataset.id = publicacion.id_publicacion;
        botonAprobar.dataset.accion = "aprobar";

        const botonRechazar = document.createElement("button");
        botonRechazar.textContent = "Rechazar";
        botonRechazar.className = "btn-rechazar";
        botonRechazar.dataset.id = publicacion.id_publicacion;
        botonRechazar.dataset.accion = "rechazar";

        celdaAcciones.appendChild(botonAprobar);
        celdaAcciones.appendChild(botonRechazar);

        fila.appendChild(celdaAcciones);

        lista.appendChild(fila);
    });
}


// Consultar publicaciones pendientes
async function cargarPublicaciones() {

    if (!token || !usuario || !usuario.roles.includes("ADMINISTRADOR")) {
        return;
    }

    try {

        const respuesta = await fetch("/api/publicaciones/pendientes", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.status === 401 || respuesta.status === 403) {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("usuario");
            window.location.href = "/login.html";
            return;
        }

        if (!respuesta.ok) {
            mensaje.textContent = resultado.mensaje;
            return;
        }

        mostrarPublicaciones(resultado.publicaciones);

    } catch (error) {

        console.error("Error al cargar publicaciones:", error);
        mensaje.textContent = "No fue posible consultar las publicaciones.";
    }
}


// Aprobar o rechazar una publicación
async function gestionarPublicacion(id, accion) {

    if (accion === "rechazar") {

        const confirmar = confirm(
            "¿Estás seguro de que deseas rechazar esta publicación?"
        );

        if (!confirmar) {
            return;
        }
    }

    const ruta = accion === "aprobar"
        ? "/api/publicaciones/aprobar/" + id
        : "/api/publicaciones/rechazar/" + id;

    try {

        const respuesta = await fetch(ruta, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultado = await respuesta.json();

        if (respuesta.status === 401 || respuesta.status === 403) {
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("usuario");
            window.location.href = "/login.html";
            return;
        }

        if (!respuesta.ok) {
            alert(resultado.mensaje);
            return;
        }

        alert(resultado.mensaje);

        // Actualizar la tabla
        cargarPublicaciones();

    } catch (error) {

        console.error("Error al gestionar publicación:", error);
        alert("No fue posible conectar con el servidor.");
    }
}


// Detectar clics en los botones de la tabla
lista.addEventListener("click", function(evento) {

    const boton = evento.target.closest("button");

    if (!boton) {
        return;
    }

    const id = boton.dataset.id;
    const accion = boton.dataset.accion;

    gestionarPublicacion(id, accion);
});


// Cerrar sesión
document.getElementById("btnCerrarSesion").addEventListener("click", function() {

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    window.location.href = "/index.html";
});


// Cargar información al abrir la página
if (usuario && usuario.roles.includes("ADMINISTRADOR")) {
    cargarPublicaciones();
}

document.addEventListener("DOMContentLoaded", async function() {

    const sesionValida = await Auth.protegerPagina();

    if (!sesionValida) {
        return;
    }

});