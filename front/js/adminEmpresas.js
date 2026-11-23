
const listaEmpresas = document.getElementById("listaEmpresas");
const mensajeAdmin = document.getElementById("mensajeAdmin");
const btnCerrarSesion = document.getElementById("btnCerrarSesion");

const token = sessionStorage.getItem("token");
const usuarioGuardado = sessionStorage.getItem("usuario");

// Verificar que exista una sesión
if (!token || !usuarioGuardado) {
    window.location.href = "/login.html";
} else {
    const usuario = JSON.parse(usuarioGuardado);

    // Verificar que el usuario sea administrador
    if (!usuario.roles || !usuario.roles.includes("ADMINISTRADOR")) {
        alert("No tienes permisos para acceder a esta página.");
        window.location.href = "/panel.html";
    } else {
        cargarEmpresas();
    }
}

// Consultar empresas pendientes
async function cargarEmpresas() {
    listaEmpresas.innerHTML = `
        <tr>
            <td colspan="8">Cargando empresas...</td>
        </tr>
    `;

    try {
        const respuesta = await fetch("/api/empresas/pendientes", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            mensajeAdmin.textContent = resultado.mensaje || "No fue posible consultar las empresas.";
            return;
        }

        // Permite recibir un arreglo directamente o dentro de la propiedad empresas
        const empresas = Array.isArray(resultado)
            ? resultado
            : resultado.empresas;

        if (!Array.isArray(empresas) || empresas.length === 0) {
            listaEmpresas.innerHTML = `
                <tr>
                    <td colspan="8">No hay empresas pendientes de aprobación.</td>
                </tr>
            `;
            return;
        }

        listaEmpresas.innerHTML = "";

        empresas.forEach(empresa => {
            const fila = document.createElement("tr");

            const datos = [
                empresa.nombre,
                empresa.nit,
                `${empresa.nombre_usuario || ""} ${empresa.apellido_usuario || ""}`,
                empresa.correo,
                empresa.telefono,
                empresa.direccion,
                empresa.descripcion || "Sin descripción"
            ];

            datos.forEach(dato => {
                const celda = document.createElement("td");
                celda.textContent = dato || "No registrado";
                fila.appendChild(celda);
            });

            const celdaAcciones = document.createElement("td");

            const botonAprobar = document.createElement("button");
            botonAprobar.textContent = "Aprobar";
            botonAprobar.className = "btn-aprobar";
            botonAprobar.addEventListener("click", () => {
                gestionarEmpresa(empresa.id_empresa, "aprobar");
            });

            const botonRechazar = document.createElement("button");
            botonRechazar.textContent = "Rechazar";
            botonRechazar.className = "btn-rechazar";
            botonRechazar.addEventListener("click", () => {
                gestionarEmpresa(empresa.id_empresa, "rechazar");
            });

            celdaAcciones.appendChild(botonAprobar);
            celdaAcciones.appendChild(botonRechazar);

            fila.appendChild(celdaAcciones);
            listaEmpresas.appendChild(fila);
        });

        mensajeAdmin.textContent = "";

    } catch (error) {
        console.error("Error al consultar empresas:", error);
        mensajeAdmin.textContent = "No fue posible conectar con el servidor.";
    }
}

// Aprobar o rechazar una empresa
async function gestionarEmpresa(idEmpresa, accion) {

    if (accion === "rechazar") {
        const confirmar = confirm("¿Estás seguro de que deseas rechazar esta empresa?");

        if (!confirmar) {
            return;
        }
    }

    try {
        const respuesta = await fetch(`/api/empresas/${accion}/${idEmpresa}`, {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultado = await respuesta.json();

        mensajeAdmin.textContent = resultado.mensaje;

        if (respuesta.ok) {
            cargarEmpresas();
        }

    } catch (error) {
        console.error("Error al gestionar empresa:", error);
        mensajeAdmin.textContent = "No fue posible realizar la operación.";
    }
}

// Cerrar sesión
btnCerrarSesion.addEventListener("click", () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    window.location.href = "/index.html";
});

document.addEventListener("DOMContentLoaded", async function() {

    const sesionValida = await Auth.protegerPagina();

    if (!sesionValida) {
        return;
    }
});