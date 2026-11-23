
const formulario = document.getElementById("formPublicacion");
const mensaje = document.getElementById("mensaje");
const boton = document.getElementById("btnPublicar");

const tipo = document.getElementById("tipo");
const contenedorCantidad = document.getElementById("contenedorCantidad");
const cantidad = document.getElementById("cantidad");

// Consultar el token
const token = sessionStorage.getItem("token");

// Comprobar si el usuario inició sesión
if (!token) {

    mensaje.textContent = "Debes iniciar sesión para registrar publicaciones.";

    formulario.querySelectorAll("input, select, textarea, button").forEach(elemento => {
        elemento.disabled = true;
    });

} else {

    cargarCategorias();

}


// Mostrar cantidad solamente cuando se selecciona PRODUCTO
tipo.addEventListener("change", function() {

    if (tipo.value === "PRODUCTO") {

        contenedorCantidad.style.display = "block";
        cantidad.required = true;

    } else {

        contenedorCantidad.style.display = "none";
        cantidad.required = false;
        cantidad.value = "";

    }

});


// Cargar categorías desde MySQL
async function cargarCategorias() {

    try {

        const respuesta = await fetch("/api/publicaciones/categorias");
        const resultado = await respuesta.json();

        const selectorCategoria = document.getElementById("categoria");

        selectorCategoria.innerHTML = '<option value="">Selecciona una categoría</option>';

        if (!respuesta.ok) {
            throw new Error(resultado.mensaje);
        }

        resultado.categorias.forEach(categoria => {

            const opcion = document.createElement("option");

            opcion.value = categoria.id_categoria;
            opcion.textContent = categoria.nombre;

            selectorCategoria.appendChild(opcion);

        });

        if (resultado.categorias.length === 0) {
            mensaje.textContent = "No hay categorías disponibles.";
        }

    } catch (error) {

        console.error("Error al cargar categorías:", error);

        mensaje.textContent = "No fue posible cargar las categorías.";

    }

}


// Registrar publicación
formulario.addEventListener("submit", async function(evento) {

    evento.preventDefault();

    const datosPublicacion = {

        id_categoria: document.getElementById("categoria").value,
        tipo: tipo.value,
        nombre: document.getElementById("nombre").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        precio: document.getElementById("precio").value,
        cantidad: tipo.value === "PRODUCTO"
            ? cantidad.value
            : null

    };

    boton.disabled = true;
    boton.textContent = "Registrando...";

    mensaje.textContent = "Enviando información...";

    try {

        const respuesta = await fetch("/api/publicaciones/registrar", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },

            body: JSON.stringify(datosPublicacion)

        });

        const resultado = await respuesta.json();

        mensaje.textContent = resultado.mensaje;

        if (!respuesta.ok) {
            return;
        }

        formulario.reset();

        contenedorCantidad.style.display = "none";
        cantidad.required = false;

    } catch (error) {

        console.error("Error al registrar publicación:", error);

        mensaje.textContent = "No fue posible conectar con el servidor.";

    } finally {

        boton.disabled = false;
        boton.textContent = "Registrar publicación";

    }

});
document.addEventListener("DOMContentLoaded", async function() {

    const sesionValida = await Auth.protegerPagina();

    if (!sesionValida) {
        return;
    }

    // Aquí continúa todo el código actual de la página

});

