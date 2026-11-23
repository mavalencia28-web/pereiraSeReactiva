// ==========================================
// ADMINISTRACIÓN DE CAMPAÑAS (SOLO ADMINISTRADOR)
// CRUD: crear, listar, editar, cambiar estado y eliminar
// ==========================================

(function () {

    const formulario = document.getElementById("formCampana");
    const tituloFormulario = document.getElementById("tituloFormulario");
    const mensajeFormulario = document.getElementById("mensajeFormulario");
    const mensajeAdmin = document.getElementById("mensajeAdmin");
    const lista = document.getElementById("listaCampanas");

    const campoNombre = document.getElementById("nombre");
    const campoDescripcion = document.getElementById("descripcion");
    const campoTipo = document.getElementById("tipoAceptacion");
    const campoMeta = document.getElementById("metaEconomica");
    const contenedorMeta = document.getElementById("campoMeta");
    const campoInicio = document.getElementById("fechaInicio");
    const campoFin = document.getElementById("fechaFin");

    const botonGuardar = document.getElementById("btnGuardar");
    const botonCancelarEdicion = document.getElementById("btnCancelarEdicion");

    const TEXTO_ACEPTACION = {
        ECONOMICA: "Económica",
        ESPECIE: "En especie",
        AMBAS: "Ambas"
    };

    let campanas = [];
    let idEnEdicion = null;

    // ======================================
    // PETICIONES CON TOKEN
    // ======================================

    async function peticion(url, metodo, cuerpo) {

        const opciones = {
            method: metodo,
            headers: { "Authorization": "Bearer " + Auth.obtenerToken() }
        };

        if (cuerpo !== undefined) {
            opciones.headers["Content-Type"] = "application/json";
            opciones.body = JSON.stringify(cuerpo);
        }

        const respuesta = await fetch(url, opciones);

        if (respuesta.status === 401) {
            Auth.limpiarSesion();
            window.location.replace(Auth.paginaLogin);
            throw new Error("Sesión no válida");
        }

        const resultado = await respuesta.json();

        return { ok: respuesta.ok, resultado };
    }

    // ======================================
    // FORMULARIO
    // ======================================

    // Una campaña solo en especie no puede tener meta económica
    function ajustarCampoMeta() {

        const soloEspecie = campoTipo.value === "ESPECIE";

        contenedorMeta.hidden = soloEspecie;

        if (soloEspecie) {
            campoMeta.value = "";
        }
    }

    campoTipo.addEventListener("change", ajustarCampoMeta);

    function salirDeEdicion() {

        idEnEdicion = null;

        formulario.reset();
        ajustarCampoMeta();

        tituloFormulario.textContent = "Nueva campaña";
        botonGuardar.textContent = "Crear campaña";
        botonCancelarEdicion.hidden = true;
    }

    botonCancelarEdicion.addEventListener("click", function () {
        salirDeEdicion();
        mensajeFormulario.textContent = "";
    });

    function iniciarEdicion(campana) {

        idEnEdicion = campana.id_campana;

        campoNombre.value = campana.nombre;
        campoDescripcion.value = campana.descripcion;
        campoTipo.value = campana.tipo_aceptacion;
        campoMeta.value = campana.meta_economica === null
            ? ""
            : Math.round(Number(campana.meta_economica));
        campoInicio.value = campana.fecha_inicio;
        campoFin.value = campana.fecha_fin;

        ajustarCampoMeta();

        tituloFormulario.textContent = "Editar campaña";
        botonGuardar.textContent = "Guardar cambios";
        botonCancelarEdicion.hidden = false;

        mensajeFormulario.textContent = "";

        formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    formulario.addEventListener("submit", async function (evento) {

        evento.preventDefault();

        const datos = {
            nombre: campoNombre.value.trim(),
            descripcion: campoDescripcion.value.trim(),
            tipo_aceptacion: campoTipo.value,
            meta_economica: campoMeta.value === "" ? null : campoMeta.value,
            fecha_inicio: campoInicio.value,
            fecha_fin: campoFin.value
        };

        botonGuardar.disabled = true;
        mensajeFormulario.textContent = "Guardando...";

        try {

            const editando = idEnEdicion !== null;

            const { ok, resultado } = await peticion(
                editando ? "/api/campanas/" + idEnEdicion : "/api/campanas",
                editando ? "PUT" : "POST",
                datos
            );

            mensajeFormulario.textContent = resultado.mensaje;

            if (ok) {
                salirDeEdicion();
                cargarCampanas();
            }

        } catch (error) {

            console.error("Error al guardar la campaña:", error);
            mensajeFormulario.textContent = "No fue posible conectar con el servidor.";

        } finally {

            botonGuardar.disabled = false;
        }
    });

    // ======================================
    // TABLA DE CAMPAÑAS
    // ======================================

    function crearCelda(texto) {

        const celda = document.createElement("td");
        celda.textContent = texto;

        return celda;
    }

    function crearBoton(texto, clase, accion, id) {

        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = texto;
        boton.className = clase;
        boton.dataset.accion = accion;
        boton.dataset.id = id;

        return boton;
    }

    function mostrarCampanas() {

        lista.replaceChildren();

        if (campanas.length === 0) {

            const fila = document.createElement("tr");
            const celda = crearCelda("Todavía no hay campañas registradas.");
            celda.colSpan = 8;

            fila.appendChild(celda);
            lista.appendChild(fila);
            return;
        }

        campanas.forEach(c => {

            const fila = document.createElement("tr");

            fila.appendChild(crearCelda(c.nombre));
            fila.appendChild(crearCelda(TEXTO_ACEPTACION[c.tipo_aceptacion]));
            fila.appendChild(crearCelda(
                c.meta_economica === null
                    ? "Sin meta"
                    : Utilidades.formatearDinero(c.meta_economica)
            ));
            fila.appendChild(crearCelda(Utilidades.formatearDinero(c.recaudado)));
            fila.appendChild(crearCelda(
                Utilidades.formatearFecha(c.fecha_inicio) + " al " +
                Utilidades.formatearFecha(c.fecha_fin)
            ));
            fila.appendChild(crearCelda(
                c.total_donaciones + " (" + c.donaciones_pendientes + " pendientes)"
            ));

            const celdaEstado = document.createElement("td");
            const etiqueta = document.createElement("span");

            etiqueta.textContent = c.estado;
            etiqueta.className = "estado-publicacion estado-" + c.estado.toLowerCase();

            celdaEstado.appendChild(etiqueta);
            fila.appendChild(celdaEstado);

            const celdaAcciones = document.createElement("td");

            celdaAcciones.appendChild(
                crearBoton("Editar", "btn-secundario btn-pequeno", "editar", c.id_campana)
            );

            if (c.estado !== "ACTIVA") {
                celdaAcciones.appendChild(
                    crearBoton("Activar", "btn-aprobar", "ACTIVA", c.id_campana)
                );
            }

            if (c.estado === "ACTIVA") {
                celdaAcciones.appendChild(
                    crearBoton("Finalizar", "btn-aprobar", "FINALIZADA", c.id_campana)
                );
            }

            if (c.estado !== "CANCELADA" && c.estado !== "FINALIZADA") {
                celdaAcciones.appendChild(
                    crearBoton("Cancelar", "btn-rechazar", "CANCELADA", c.id_campana)
                );
            }

            celdaAcciones.appendChild(
                crearBoton("Eliminar", "btn-rechazar", "eliminar", c.id_campana)
            );

            fila.appendChild(celdaAcciones);
            lista.appendChild(fila);
        });
    }

    async function cargarCampanas() {

        try {

            const { ok, resultado } = await peticion("/api/campanas/admin", "GET");

            if (!ok) {
                mensajeAdmin.textContent =
                    resultado.mensaje || "No fue posible consultar las campañas.";
                return;
            }

            campanas = resultado.campanas;
            mensajeAdmin.textContent = "";

            mostrarCampanas();

        } catch (error) {

            console.error("Error al consultar campañas:", error);
            mensajeAdmin.textContent = "No fue posible conectar con el servidor.";
        }
    }

    // ======================================
    // ACCIONES DE LA TABLA (delegación de eventos)
    // ======================================

    lista.addEventListener("click", async function (evento) {

        const boton = evento.target.closest("button");

        if (!boton) {
            return;
        }

        const id = Number(boton.dataset.id);
        const accion = boton.dataset.accion;
        const campana = campanas.find(c => c.id_campana === id);

        if (accion === "editar") {
            iniciarEdicion(campana);
            return;
        }

        let url;
        let metodo;
        let cuerpo;

        if (accion === "eliminar") {

            if (!confirm("¿Eliminar definitivamente esta campaña? Esta acción no se puede deshacer.")) {
                return;
            }

            url = "/api/campanas/" + id;
            metodo = "DELETE";

        } else {

            if (accion === "CANCELADA" && !confirm("¿Cancelar esta campaña?")) {
                return;
            }

            url = "/api/campanas/" + id + "/estado";
            metodo = "PUT";
            cuerpo = { estado: accion };
        }

        boton.disabled = true;

        try {

            const { ok, resultado } = await peticion(url, metodo, cuerpo);

            mensajeAdmin.textContent = resultado.mensaje;

            if (ok) {

                if (idEnEdicion === id) {
                    salirDeEdicion();
                }

                cargarCampanas();

            } else {

                boton.disabled = false;
            }

        } catch (error) {

            console.error("Error al gestionar la campaña:", error);
            mensajeAdmin.textContent = "No fue posible realizar la operación.";
            boton.disabled = false;
        }
    });

    // ======================================
    // CERRAR SESIÓN
    // ======================================

    document.getElementById("btnCerrarSesion").addEventListener("click", async function (evento) {

        evento.currentTarget.disabled = true;

        await Auth.cerrarSesion();
    });

    // ======================================
    // INICIO DE LA PÁGINA
    // ======================================

    document.addEventListener("DOMContentLoaded", async function () {

        const sesionValida = await Auth.protegerPagina();

        if (!sesionValida) {
            return;
        }

        const usuario = Auth.obtenerUsuario();

        if (!usuario || !Array.isArray(usuario.roles) || !usuario.roles.includes("ADMINISTRADOR")) {
            alert("No tienes permisos para acceder a esta página.");
            window.location.replace("/panel.html");
            return;
        }

        ajustarCampoMeta();
        cargarCampanas();
    });

})();
