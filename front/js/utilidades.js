// ==========================================
// FUNCIONES COMPARTIDAS POR VARIAS PÁGINAS
// ==========================================

const Utilidades = {

    // ======================================
    // PRECIOS Y DINERO
    // ======================================

    formatearPrecio(precio) {

        if (precio === null || precio === undefined || precio === "") {
            return "Consultar con el comercio";
        }

        if (Number(precio) === 0) {
            return "Gratuito";
        }

        return this.formatearDinero(precio);
    },

    formatearDinero(valor) {

        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0
        }).format(Number(valor) || 0);
    },

    // ======================================
    // FECHAS
    // Acepta "AAAA-MM-DD" o "AAAA-MM-DD HH:MM:SS"
    // ======================================

    formatearFecha(texto) {

        if (!texto) {
            return "No disponible";
        }

        const partes = String(texto).slice(0, 10).split("-");

        if (partes.length !== 3) {
            return "No disponible";
        }

        const fecha = new Date(
            Number(partes[0]),
            Number(partes[1]) - 1,
            Number(partes[2])
        );

        if (Number.isNaN(fecha.getTime())) {
            return "No disponible";
        }

        return fecha.toLocaleDateString("es-CO");
    },

    // ======================================
    // WHATSAPP
    // Convierte el teléfono del comercio al formato internacional que necesita wa.me (solo dígitos, con indicativo de país).
    // Devuelve null si no parece un celular colombiano válido (por ejemplo, un fijo no sirve para WhatsApp).
    // ======================================

    normalizarTelefonoWhatsApp(telefono) {

        let digitos = String(telefono || "").replace(/\D/g, "");

        // Quitar prefijo internacional 00
        if (digitos.startsWith("00")) {
            digitos = digitos.slice(2);
        }

        // Celular colombiano sin indicativo: 3XXXXXXXXX
        if (digitos.length === 10 && digitos.startsWith("3")) {
            return "57" + digitos;
        }

        // Celular colombiano con indicativo: 573XXXXXXXXX
        if (digitos.length === 12 && digitos.startsWith("573")) {
            return digitos;
        }

        return null;
    },

    crearEnlaceWhatsApp(publicacion) {

        const numero = this.normalizarTelefonoWhatsApp(
            publicacion.telefono_empresa
        );

        if (!numero) {
            return null;
        }

        const accion = publicacion.tipo === "SERVICIO"
            ? "contratar este servicio"
            : "comprar este producto";

        const texto =
            "Hola " + publicacion.empresa + ", vi \"" + publicacion.nombre +
            "\" en Pereira se Reactiva y quiero " + accion +
            ". ¿Me das más información?";

        return "https://wa.me/" + numero + "?text=" + encodeURIComponent(texto);
    },

    // ======================================
    // BOTÓN "COMPRAR" (lleva al WhatsApp del comercio)
    // Devuelve el elemento listo para insertar en la página.
    // ======================================

    crearBotonComprar(publicacion) {

        // Producto sin existencias
        if (publicacion.tipo === "PRODUCTO" && Number(publicacion.cantidad) === 0) {

            const agotado = document.createElement("span");
            agotado.className = "btn-agotado";
            agotado.textContent = "Agotado";

            return agotado;
        }

        const enlace = this.crearEnlaceWhatsApp(publicacion);

        if (!enlace) {

            const sinWhatsApp = document.createElement("span");
            sinWhatsApp.className = "aviso-sin-whatsapp";
            sinWhatsApp.textContent = "Este comercio no registró un WhatsApp válido.";

            return sinWhatsApp;
        }

        const boton = document.createElement("a");
        boton.href = enlace;
        boton.target = "_blank";
        boton.rel = "noopener noreferrer";
        boton.className = "btn-whatsapp";
        boton.textContent = "Comprar";

        return boton;
    }

};
