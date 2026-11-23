// ======================================
// ELEMENTOS DE LA PÁGINA
// ======================================

const listaPublicaciones = document.getElementById("lista-publicaciones");
const opcionesAcceso = document.getElementById("opcionesAcceso");

// ======================================
// CONTROL DE SESIÓN EN PÁGINA PRINCIPAL
// ======================================

async function comprobarSesion() {

    if (!opcionesAcceso) {
        console.warn("No se encontró el elemento opcionesAcceso.");
        return;
    }

    // Comprobar si existe una sesión almacenada
    const token = Auth.obtenerToken();
    const usuario = Auth.obtenerUsuario();

    // Si no hay datos de sesión, mostrar acceso público
    if (!token || !usuario) {
        Auth.limpiarSesion();
        mostrarAccesoPublico();
        return;
    }

    // Verificar que la sesión siga siendo válida en el servidor
    const sesionValida = await Auth.verificarSesion();

    if (!sesionValida) {
        Auth.limpiarSesion();
        mostrarAccesoPublico();
        return;
    }

    // Mostrar opciones para usuarios autenticados
    mostrarAccesoUsuario();
}

// ======================================
// OPCIONES PARA VISITANTES
// ======================================

function mostrarAccesoPublico() {

    opcionesAcceso.replaceChildren();

    const enlaceLogin = document.createElement("a");
    enlaceLogin.href = "/login.html";
    enlaceLogin.className = "btn-login";
    enlaceLogin.textContent = "Iniciar sesión";

    const enlaceRegistro = document.createElement("a");
    enlaceRegistro.href = "/registro.html";
    enlaceRegistro.className = "btn-registro";
    enlaceRegistro.textContent = "Registrarse";

    opcionesAcceso.append(enlaceLogin, enlaceRegistro);
}

// ======================================
// OPCIONES PARA USUARIOS AUTENTICADOS
// ======================================

function mostrarAccesoUsuario() {

    opcionesAcceso.replaceChildren();

    const enlacePanel = document.createElement("a");
    enlacePanel.href = "/panel.html";
    enlacePanel.className = "btn-login";
    enlacePanel.textContent = "Mi panel";

    const botonCerrar = document.createElement("button");
    botonCerrar.type = "button";
    botonCerrar.className = "btn-cerrar-sesion";
    botonCerrar.textContent = "Cerrar sesión";

    botonCerrar.addEventListener("click", async function() {

        botonCerrar.disabled = true;

        await Auth.cerrarSesion();

    });

    opcionesAcceso.append(enlacePanel, botonCerrar);
}


// ======================================
// CARGAR PUBLICACIONES
// ======================================

async function cargarPublicaciones() {

    try {

        const respuesta = await fetch("/api/publicaciones");

        if (!respuesta.ok) {
            throw new Error("No fue posible consultar las publicaciones.");
        }

        const datos = await respuesta.json();

        listaPublicaciones.replaceChildren();

        if (datos.publicaciones.length === 0) {

            const mensaje = document.createElement("p");
            mensaje.textContent = "Todavía no hay publicaciones disponibles.";

            listaPublicaciones.appendChild(mensaje);
            return;

        }

        datos.publicaciones.forEach(publicacion => {

            const tarjeta = document.createElement("article");
            tarjeta.className = "producto";

            const titulo = document.createElement("h3");
            titulo.textContent = publicacion.nombre;

            const descripcion = document.createElement("p");
            descripcion.textContent =
                publicacion.descripcion || "Sin descripción.";

            const empresa = document.createElement("p");
            empresa.textContent = "Comercio: " + publicacion.empresa;

            const categoria = document.createElement("p");
            categoria.textContent = "Categoría: " + publicacion.categoria;

            const tipo = document.createElement("p");
            tipo.textContent = "Tipo: " + publicacion.tipo;

            const precio = document.createElement("p");

            if (publicacion.precio === null) {

                precio.textContent = "Precio: Consultar con el comercio";

            } else if (Number(publicacion.precio) === 0) {

                precio.textContent = "Precio: Gratuito";

            } else {

                precio.textContent = "Precio: $" +
                    Number(publicacion.precio).toLocaleString("es-CO");

            }

            // Botones: "Ver más" (detalle) y "Comprar" (WhatsApp del comercio)
            const acciones = document.createElement("div");
            acciones.className = "producto-acciones";

            const botonVerMas = document.createElement("a");
            botonVerMas.href = "/producto.html?id=" + publicacion.id_publicacion;
            botonVerMas.className = "btn-secundario";
            botonVerMas.textContent = "Ver más";

            acciones.append(
                botonVerMas,
                Utilidades.crearBotonComprar(publicacion)
            );

            tarjeta.append(
                titulo,
                descripcion,
                empresa,
                categoria,
                tipo,
                precio,
                acciones
            );

            listaPublicaciones.appendChild(tarjeta);

        });

    } catch (error) {

        console.error(error);

        listaPublicaciones.textContent =
            "No fue posible cargar las publicaciones.";

    }

}

// ======================================
// INICIALIZAR PÁGINA PRINCIPAL
// ======================================

document.addEventListener("DOMContentLoaded", function() {
    comprobarSesion();
    cargarPublicaciones();
    Campanas.cargar(document.getElementById("lista-campanas"));
});