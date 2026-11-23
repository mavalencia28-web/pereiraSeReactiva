// ==========================================
// CAMPAÑAS DE DONACIÓN (parte pública)
// Se usa en la página principal y en el panel
// de los usuarios con sesión iniciada.
// ==========================================

const Campanas = {

    textoAceptacion(tipo) {

        if (tipo === "ECONOMICA") {
            return "Acepta donaciones económicas";
        }

        if (tipo === "ESPECIE") {
            return "Acepta donaciones en especie";
        }

        return "Acepta donaciones económicas y en especie";
    },

    crearTarjeta(campana) {

        const tarjeta = document.createElement("article");
        tarjeta.className = "campana";

        const titulo = document.createElement("h3");
        titulo.textContent = campana.nombre;

        const descripcion = document.createElement("p");
        descripcion.className = "campana-descripcion";
        descripcion.textContent = campana.descripcion;

        const aceptacion = document.createElement("p");
        aceptacion.className = "campana-dato";
        aceptacion.textContent = this.textoAceptacion(campana.tipo_aceptacion);

        const vigencia = document.createElement("p");
        vigencia.className = "campana-dato";
        vigencia.textContent =
            "Vigente hasta el " + Utilidades.formatearFecha(campana.fecha_fin);

        tarjeta.append(titulo, descripcion, aceptacion, vigencia);

        // Barra de progreso si la campaña tiene meta económica
        if (campana.meta_economica !== null) {

            const meta = Number(campana.meta_economica);
            const recaudado = Number(campana.recaudado);

            const barra = document.createElement("progress");
            barra.max = meta;
            barra.value = Math.min(recaudado, meta);

            const textoMeta = document.createElement("p");
            textoMeta.className = "campana-dato";
            textoMeta.textContent =
                Utilidades.formatearDinero(recaudado) + " de " +
                Utilidades.formatearDinero(meta);

            tarjeta.append(barra, textoMeta);
        }

        const botonDonar = document.createElement("a");
        botonDonar.href = "/donar.html?campana=" + campana.id_campana;
        botonDonar.className = "btn-principal";
        botonDonar.textContent = "Donar";

        tarjeta.appendChild(botonDonar);

        return tarjeta;
    },

    async cargar(contenedor) {

        if (!contenedor) {
            return;
        }

        try {

            const respuesta = await fetch("/api/campanas");

            if (!respuesta.ok) {
                throw new Error("No fue posible consultar las campañas.");
            }

            const datos = await respuesta.json();

            contenedor.replaceChildren();

            if (datos.campanas.length === 0) {

                const mensaje = document.createElement("p");
                mensaje.textContent =
                    "Por ahora no hay campañas activas. ¡Vuelve pronto!";

                contenedor.appendChild(mensaje);
                return;
            }

            datos.campanas.forEach(campana => {
                contenedor.appendChild(this.crearTarjeta(campana));
            });

        } catch (error) {

            console.error(error);

            contenedor.textContent = "No fue posible cargar las campañas.";
        }
    }

};
