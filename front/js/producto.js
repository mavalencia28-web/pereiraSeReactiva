// ==========================================
// DETALLE DE UN PRODUCTO O SERVICIO ("Ver más")
// La página recibe el identificador por la URL: /producto.html?id=5
// ==========================================

(function () {

    const mensaje = document.getElementById("mensajeDetalle");
    const tarjeta = document.getElementById("detalleProducto");

    function escribir(id, texto) {
        document.getElementById(id).textContent = texto;
    }

    async function cargarDetalle() {

        const id = new URLSearchParams(window.location.search).get("id");

        if (!id) {
            mensaje.textContent = "No se indicó qué publicación deseas ver.";
            return;
        }

        try {

            const respuesta = await fetch(
                "/api/publicaciones/" + encodeURIComponent(id)
            );

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                mensaje.textContent =
                    resultado.mensaje || "No fue posible consultar la publicación.";
                return;
            }

            const p = resultado.publicacion;

            document.title = p.nombre + " - Pereira se Reactiva";

            escribir("detalleTipo", p.tipo === "PRODUCTO" ? "Producto" : "Servicio");
            escribir("detalleCategoria", p.categoria);
            escribir("detalleNombre", p.nombre);
            escribir("detallePrecio", Utilidades.formatearPrecio(p.precio));

            if (p.tipo === "PRODUCTO") {

                escribir(
                    "detalleDisponibilidad",
                    Number(p.cantidad) > 0
                        ? "Disponibles: " + p.cantidad + " unidades"
                        : "Producto agotado"
                );

            } else {

                escribir("detalleDisponibilidad", "Servicio sujeto a disponibilidad del comercio");
            }

            escribir("detalleDescripcion", p.descripcion || "Sin descripción.");
            escribir("detalleEmpresa", "Comercio: " + p.empresa);
            escribir(
                "detalleDescripcionEmpresa",
                p.descripcion_empresa || ""
            );
            escribir("detalleDireccion", "Dirección: " + p.direccion_empresa);
            escribir("detalleTelefono", "Teléfono: " + p.telefono_empresa);

            // Botón de compra (redirige al WhatsApp del comercio)
            document
                .getElementById("detalleAcciones")
                .appendChild(Utilidades.crearBotonComprar(p));

            mensaje.hidden = true;
            tarjeta.hidden = false;

        } catch (error) {

            console.error("Error al cargar el detalle:", error);
            mensaje.textContent = "No fue posible conectar con el servidor.";
        }
    }

    document.addEventListener("DOMContentLoaded", cargarDetalle);

})();