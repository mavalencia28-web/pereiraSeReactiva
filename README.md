# pereiraSeReactiva
Plataforma web para reactivar el comercio local de Pereira: los comercios publican productos y servicios, los visitantes los consultan y compran por WhatsApp, y el administrador gestiona campañas de donación que llegan únicamente a él.

---------

Stack: Node.js + Express (backend/API REST), MySQL (base de datos), HTML + CSS +
JavaScript puro (frontend), JWT + bcrypt (seguridad)

---------

Cómo ejecutar el proyecto?

1. Instalar Node.js y MySQL.
2. Ejecutar el archivo pereiraSeReactiva.sql en MySQL (crea la base las tablas, los roles y las categorías).
3. Crear el archivo .env con las variables de entorno
4. Abrir la carpeta del proyecto y en la terminal ejecutar: npm install y luego npm run dev
5. Abrir http://localhost:3000
6. Para crear el administrador: registrar una cuenta normal y asígnarle el rol con el script SQL que ya tenemos en el archivo(buscar el usuario por correo, inserta el rol ADMINISTRADOR en usuarios_roles ). Después el usuario debe cerrar sesión e iniciar de nuevo, porque los roles viajan dentro del token

----------

El proyecto sigue una arquitectura por capas: ruta → middleware → controlador → base de datos.

servidor.js : punto de entrada. Crea la aplicación Express, activa los middlewares generales (helmet, cors, json), sirve la carpeta front , registra las rutas /api/... y arranca el servidor en el puerto.

package.json : nombre, scripts (start , dev ) y dependencias.

package-lock.json : versiones exactas instaladas (se genera solo).

.env (NO SE SUBE): configuración secreta: datos de MySQL y JWT_SECRET .

pereiraSeReactiva.sql : script de la base de datos.

config/
db.js : crea el pool de conexiones a MySQL con mysql2/promise . Un pool reutiliza hasta 10 conexiones en lugar de abrir una por consulta.

middleware/: Funciones que se ejecutan antes del controlador.

verificarToken.js : lee el encabezado Authorization: Bearer <token> , valida la firma y expiración del JWT, y confirma en la tabla sesiones que la sesión no esté revocada ni vencida y que el usuario esté activo. Si todo es correcto guarda los datos
en req.usuario.
 
verificarRol.js : recibe los roles permitidos (verificarRol("ADMINISTRADOR") ) y compara con los roles del token. Responde 401 si no hay sesión y 403 si no tiene permiso.

rutas/: Definen qué URL y qué método HTTP llaman a qué controlador, y qué middlewares se aplican.
rutaUsuario.js : registro de usuarios.

authRuta.js : login, logout y verificar sesión.

empresasRuta.js : registrar empresa; el administrador consulta pendientes, aprueba y rechaza.

publicacionesRuta.js : listado público, detalle (/:id ), categorías, registrar, mis publicaciones y aprobación del administrador. La ruta /:id va al final para que /categorias o /pendientes no se interpreten como un id.

campanasRuta.js: campañas públicas y CRUD del administrador.

donacionesRuta.js: donar, mis donaciones y gestión del administrador.

controles/: Contienen la lógica: validan datos, consultan MySQL y arman la respuesta JSON.
controladorUsuario.js : valida y registra un usuario. Cifra la contraseña con bcrypt y, en una transacción, inserta el usuario y le asigna el rol COMPRADOR.

authControlador.js : iniciarSesion (compara contraseña, crea el JWT con un identificador único  jti y guarda la sesión en MySQL), cerrarSesion(marca la sesión como revocada) y verificarSesion .

empresasControlador.js : registra la empresa (estado PENDIENTE), asigna el rol COMERCIANTE y entrega un token actualizado; el administrador aprueba o rechaza.

publicacionControlador.js : registrar productos/servicios (estado PENDIENTE), consultas públicas y propias, detalle, y aprobación/rechazo del administrador.

campanasControlador.js: validaciones y CRUD de campañas; calcula lo recaudado.

donacionesControlador.js: registra donaciones validando que la campaña esté activa y acepte ese tipo; el administrador cambia estados con transiciones controladas.

front/: Todo lo que ve el navegador. Express lo entrega con express.static.

index.html : página principal pública (productos, campañas, categorías). 

registro.html y login.html : crear cuenta e iniciar sesión.

panel.html : panel del usuario; muestra campañas arriba y tarjetas de opciones según el rol.

empresa.html : registrar comercio.

publicacion.html : registrar producto o servicio. 

mis-publicaciones.html : ver las propias y su estado.

producto.html: detalle de un producto ("Ver más").

donar.html: formulario de donación y "Mis donaciones".

admin-empresas.html , admin-publicaciones.html : aprobación de comercios y publicaciones.

admin-campanas.html , admin-donaciones.html: administración de campañas y donaciones.

front/css/estilos.css : estilos de todo el sitio.

front/js/ (cada página tiene su script)
auth.js : objeto Auth compartido: guarda el token en sessionStorage , verifica lasesión en el servidor, protege páginas con 
data-protegida="true" y cierra sesión.

utilidades.js: formato de precios y fechas y generación del enlace de WhatsApp.

campanas.js: dibuja las tarjetas de campañas (usado en inicio y panel).

inicio.js, login.js, registro.js, panel.js, empresa.js, publicacion.js, misPublicaciones.js, adminEmpresas.js, adminPublicaciones.js, producto.js, donar.js, adminCampanas.js, adminDonaciones.js: lógica de cada página.

---------------

NOTAS (Modulo de donaciones):
- Las campañas activas se ven sin iniciar sesión en la página principal y al inicio del panel de los usuarios registrados.
- Solo el rol ADMINISTRADOR puede crear, editar, activar, finalizar, cancelar y eliminar campañas (admin-campanas.html ).
- Cualquier usuario con sesión puede registrar una donación (donar.html ) y ver únicamente las suyas.
- Las donaciones recibidas solo las puede ver y gestionar el administrador (admin-donaciones.html ): confirma, rechaza o marca como entregada donde exista la necesidad real.
- Si alguien intenta abrir donar.html sin sesión, inicia sesión y regresa automáticamente a esa página

-------

Códigos HTTP que usa el proyecto
200 OK, 201 creado.
400 datos inválidos.
401 no autenticado (sin token o sesión vencida).
403 autenticado pero sin permiso.
404 no existe.
409 conflicto (correo duplicado, donación en estado incorrecto, campaña con
donaciones).
500 error del servidor