// ==========================================
// PÁGINA PARA REALIZAR DONACIONES
// ==========================================

(function () {

    const formulario = document.getElementById("formDonacion");
    const mensaje = document.getElementById("mensaje");
    const botonDonar = document.getElementById("btnDonar");

    const selectCampana = document.getElementById("campana");
    const descripcionCampana = document.getElementById("descripcionCampana");
    const selectTipoDonacion = document.getElementById("tipoDonacion");
    const selectTipoDonante = document.getElementById("tipoDonante");

    const bloqueMonto = document.getElementById("bloqueMonto");
    const bloqueEspecie = document.getElementById("bloqueEspecie");
    const bloqueNit = document.getElementById("bloqueNit");

    const listaMisDonaciones = document.getElementById("listaMisDonaciones");

    let campanas = [];

    // ======================================
    // SESIÓN CADUCADA
    // ======================================

    function sesionCaducada() {
        Auth.limpiarSesion();
        window.location.replace(Auth.paginaLogin);
    }

    // ======================================
    // CAMPAÑAS DISPONIBLES
    // ======================================

    async function cargarCampanas() {

        try {

            const respuesta = await fetch("/api/campanas");
            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.mensaje);
            }

            campanas = resultado.campanas;

            selectCampana.replaceChildren();

            if (campanas.length === 0) {

                const opcion = document.createElement("option");
                opcion.value = "";
                opcion.textContent = "No hay campañas activas";
                selectCampana.appendChild(opcion);

                botonDonar.disabled = true;
                mensaje.textContent = "Por ahora no hay campañas que reciban donaciones.";
                return;
            }

            campanas.forEach(campana => {

                const opcion = document.createElement("option");
                opcion.value = campana.id_campana;
                opcion.textContent = campana.nombre;

                selectCampana.appendChild(opcion);
            });

            // Preseleccionar la campaña indicada en la URL (?campana=3)
            const idUrl = new URLSearchParams(window.location.search).get("campana");

            if (idUrl && campanas.some(c => String(c.id_campana) === idUrl)) {
                selectCampana.value = idUrl;
            }

            actualizarFormulario();

        } catch (error) {

            console.error("Error al cargar campañas:", error);
            mensaje.textContent = "No fue posible cargar las campañas.";
        }
    }

    // ======================================
    // ADAPTAR EL FORMULARIO A LA CAMPAÑA ELEGIDA
    // ======================================

    function campanaSeleccionada() {
        return campanas.find(c => String(c.id_campana) === selectCampana.value);
    }

    function agregarOpcion(select, valor, texto) {

        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;

        select.appendChild(opcion);
    }

    function actualizarFormulario() {

        const campana = campanaSeleccionada();

        if (!campana) {
            return;
        }

        descripcionCampana.textContent = campana.descripcion;

        // Solo se ofrecen los tipos de donación que la campaña acepta
        const tipoAnterior = selectTipoDonacion.value;

        selectTipoDonacion.replaceChildren();

        if (campana.tipo_aceptacion !== "ESPECIE") {
            agregarOpcion(selectTipoDonacion, "ECONOMICA", "Donación económica");
        }

        if (campana.tipo_aceptacion !== "ECONOMICA") {
            agregarOpcion(selectTipoDonacion, "ESPECIE", "Donación en especie");
        }

        if ([...selectTipoDonacion.options].some(o => o.value === tipoAnterior)) {
            selectTipoDonacion.value = tipoAnterior;
        }

        actualizarCampos();
    }

    function actualizarCampos() {

        const esEconomica = selectTipoDonacion.value === "ECONOMICA";
        const esEmpresa = selectTipoDonante.value === "EMPRESA";

        bloqueMonto.hidden = !esEconomica;
        bloqueEspecie.hidden = esEconomica;
        bloqueNit.hidden = !esEmpresa;
    }

    selectCampana.addEventListener("change", actualizarFormulario);
    selectTipoDonacion.addEventListener("change", actualizarCampos);
    selectTipoDonante.addEventListener("change", actualizarCampos);

    // ======================================
    // REGISTRAR LA DONACIÓN
    // ======================================

    formulario.addEventListener("submit", async function (evento) {

        evento.preventDefault();

        const token = Auth.obtenerToken();

        if (!token) {
            sesionCaducada();
            return;
        }

        const esEconomica = selectTipoDonacion.value === "ECONOMICA";
        const esEmpresa = selectTipoDonante.value === "EMPRESA";

        const datos = {
            id_campana: selectCampana.value,
            tipo_donacion: selectTipoDonacion.value,
            tipo_donante: selectTipoDonante.value,
            nombre_donante: document.getElementById("nombreDonante").value.trim(),
            nit_donante: esEmpresa
                ? document.getElementById("nitDonante").value.trim()
                : null,
            monto: esEconomica
                ? document.getElementById("monto").value
                : null,
            descripcion_especie: esEconomica
                ? null
                : document.getElementById("descripcionEspecie").value.trim()
        };

        botonDonar.disabled = true;
        mensaje.textContent = "Registrando donación...";

        try {

            const respuesta = await fetch("/api/donaciones", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify(datos)
            });

            const resultado = await respuesta.json();

            if (respuesta.status === 401 || respuesta.status === 403) {
                sesionCaducada();
                return;
            }

            mensaje.textContent = resultado.mensaje;

            if (!respuesta.ok) {
                return;
            }

            const campanaActual = selectCampana.value;

            formulario.reset();
            selectCampana.value = campanaActual;
            actualizarFormulario();

            cargarMisDonaciones();

        } catch (error) {

            console.error("Error al registrar la donación:", error);
            mensaje.textContent = "No fue posible conectar con el servidor.";

        } finally {

            botonDonar.disabled = campanas.length === 0;
        }
    });

    // ======================================
    // MIS DONACIONES
    // ======================================

    function crearCelda(texto) {

        const celda = document.createElement("td");
        celda.textContent = texto;

        return celda;
    }

    async function cargarMisDonaciones() {

        const token = Auth.obtenerToken();

        try {

            const respuesta = await fetch("/api/donaciones/mis-donaciones", {
                headers: { "Authorization": "Bearer " + token }
            });

            if (respuesta.status === 401 || respuesta.status === 403) {
                sesionCaducada();
                return;
            }

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.mensaje);
            }

            listaMisDonaciones.replaceChildren();

            if (resultado.donaciones.length === 0) {

                const fila = document.createElement("tr");
                const celda = crearCelda("Todavía no has registrado donaciones.");
                celda.colSpan = 5;

                fila.appendChild(celda);
                listaMisDonaciones.appendChild(fila);
                return;
            }

            resultado.donaciones.forEach(d => {

                const fila = document.createElement("tr");

                fila.appendChild(crearCelda(d.campana));
                fila.appendChild(crearCelda(
                    d.tipo_donacion === "ECONOMICA" ? "Económica" : "En especie"
                ));
                fila.appendChild(crearCelda(
                    d.tipo_donacion === "ECONOMICA"
                        ? Utilidades.formatearDinero(d.monto)
                        : d.descripcion_especie
                ));

                const celdaEstado = document.createElement("td");
                const etiqueta = document.createElement("span");

                etiqueta.textContent = d.estado;
                etiqueta.className =
                    "estado-publicacion estado-" + d.estado.toLowerCase();

                celdaEstado.appendChild(etiqueta);
                fila.appendChild(celdaEstado);

                fila.appendChild(crearCelda(Utilidades.formatearFecha(d.fecha_registro)));

                listaMisDonaciones.appendChild(fila);
            });

        } catch (error) {

            console.error("Error al consultar mis donaciones:", error);

            listaMisDonaciones.replaceChildren();

            const fila = document.createElement("tr");
            const celda = crearCelda("No fue posible cargar tus donaciones.");
            celda.colSpan = 5;

            fila.appendChild(celda);
            listaMisDonaciones.appendChild(fila);
        }
    }

    // ======================================
    // INICIO DE LA PÁGINA
    // ======================================

    document.addEventListener("DOMContentLoaded", async function () {

        const sesionValida = await Auth.protegerPagina();

        if (!sesionValida) {
            return;
        }

        cargarCampanas();
        cargarMisDonaciones();
    });

})();
