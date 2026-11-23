// ==========================================
// GESTIÓN DE DONACIONES (SOLO ADMINISTRADOR)
// Consultar y cambiar el estado de las donaciones
// ==========================================

(function () {

    const lista = document.getElementById("listaDonaciones");
    const mensajeAdmin = document.getElementById("mensajeAdmin");
    const filtroEstado = document.getElementById("filtroEstado");

    let donaciones = [];

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

    function crearCelda(texto) {

        const celda = document.createElement("td");
        celda.textContent = texto;

        return celda;
    }

    function crearBoton(texto, clase, estado, id) {

        const boton = document.createElement("button");
        boton.type = "button";
        boton.textContent = texto;
        boton.className = clase;
        boton.dataset.estado = estado;
        boton.dataset.id = id;

        return boton;
    }

    function mostrarDonaciones() {

        lista.replaceChildren();

        if (donaciones.length === 0) {

            const fila = document.createElement("tr");
            const celda = crearCelda("No hay donaciones para mostrar.");
            celda.colSpan = 8;

            fila.appendChild(celda);
            lista.appendChild(fila);
            return;
        }

        donaciones.forEach(d => {

            const fila = document.createElement("tr");

            fila.appendChild(crearCelda(Utilidades.formatearFecha(d.fecha_registro)));
            fila.appendChild(crearCelda(d.campana));

            // Donante: nombre, tipo y NIT si es empresa
            let textoDonante = (d.nombre_donante || "Sin nombre") +
                " (" + (d.tipo_donante === "EMPRESA" ? "Empresa" : "Persona") + ")";

            if (d.nit_donante) {
                textoDonante += " - NIT " + d.nit_donante;
            }

            fila.appendChild(crearCelda(textoDonante));

            // Datos de la cuenta para poder contactar al donante
            fila.appendChild(crearCelda(
                d.nombre_usuario + " " + d.apellido_usuario + " | " +
                d.correo_usuario + " | " + (d.telefono_usuario || "Sin teléfono")
            ));

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
            etiqueta.className = "estado-publicacion estado-" + d.estado.toLowerCase();

            celdaEstado.appendChild(etiqueta);
            fila.appendChild(celdaEstado);

            const celdaAcciones = document.createElement("td");

            if (d.estado === "PENDIENTE") {
                celdaAcciones.appendChild(
                    crearBoton("Confirmar", "btn-aprobar", "CONFIRMADA", d.id_donacion)
                );
            }

            if (d.estado === "CONFIRMADA") {
                celdaAcciones.appendChild(
                    crearBoton("Marcar entregada", "btn-aprobar", "ENTREGADA", d.id_donacion)
                );
            }

            if (d.estado === "PENDIENTE" || d.estado === "CONFIRMADA") {
                celdaAcciones.appendChild(
                    crearBoton("Rechazar", "btn-rechazar", "RECHAZADA", d.id_donacion)
                );
            }

            if (celdaAcciones.children.length === 0) {
                celdaAcciones.textContent = "—";
            }

            fila.appendChild(celdaAcciones);
            lista.appendChild(fila);
        });
    }

    async function cargarDonaciones() {

        let url = "/api/donaciones";

        if (filtroEstado.value) {
            url += "?estado=" + encodeURIComponent(filtroEstado.value);
        }

        try {

            const { ok, resultado } = await peticion(url, "GET");

            if (!ok) {
                mensajeAdmin.textContent =
                    resultado.mensaje || "No fue posible consultar las donaciones.";
                return;
            }

            donaciones = resultado.donaciones;

            const pendientes = donaciones.filter(d => d.estado === "PENDIENTE").length;

            mensajeAdmin.textContent =
                donaciones.length + " donaciones en la lista, " +
                pendientes + " pendientes de revisión.";

            mostrarDonaciones();

        } catch (error) {

            console.error("Error al consultar donaciones:", error);
            mensajeAdmin.textContent = "No fue posible conectar con el servidor.";
        }
    }

    filtroEstado.addEventListener("change", cargarDonaciones);

    lista.addEventListener("click", async function (evento) {

        const boton = evento.target.closest("button");

        if (!boton) {
            return;
        }

        const estado = boton.dataset.estado;

        if (estado === "RECHAZADA" && !confirm("¿Rechazar esta donación?")) {
            return;
        }

        boton.disabled = true;

        try {

            const { ok, resultado } = await peticion(
                "/api/donaciones/" + boton.dataset.id + "/estado",
                "PUT",
                { estado }
            );

            if (ok) {

                await cargarDonaciones();
                mensajeAdmin.textContent = resultado.mensaje;

            } else {

                mensajeAdmin.textContent = resultado.mensaje;
                boton.disabled = false;
            }

        } catch (error) {

            console.error("Error al actualizar la donación:", error);
            mensajeAdmin.textContent = "No fue posible realizar la operación.";
            boton.disabled = false;
        }
    });

    document.getElementById("btnCerrarSesion").addEventListener("click", async function (evento) {

        evento.currentTarget.disabled = true;

        await Auth.cerrarSesion();
    });

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

        cargarDonaciones();
    });

})();