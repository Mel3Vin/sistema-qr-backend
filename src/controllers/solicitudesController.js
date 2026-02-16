const db = require('../config/database');

// Crear solicitud de préstamo (usuarios)
exports.crearSolicitud = async (req, res) => {
    try {
        const { herramienta_id, fecha_uso_estimada, fecha_devolucion_estimada, motivo } = req.body;
        const usuario_id = req.userId;

        // Validar campos
        if (!herramienta_id || !fecha_uso_estimada || !fecha_devolucion_estimada) {
            return res.status(400).json({
                success: false,
                message: 'Herramienta, fecha de uso y fecha de devolución son requeridas'
            });
        }

        // Verificar que la herramienta existe
        const [herramientas] = await db.query(
            'SELECT id, nombre, estado FROM herramientas WHERE id = ?',
            [herramienta_id]
        );

        if (herramientas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Herramienta no encontrada'
            });
        }

        // Verificar que el usuario no tenga solicitudes pendientes de la misma herramienta
        const [solicitudesPendientes] = await db.query(
            `SELECT id FROM solicitudes 
             WHERE usuario_id = ? AND herramienta_id = ? AND estado = 'pendiente'`,
            [usuario_id, herramienta_id]
        );

        if (solicitudesPendientes.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya tienes una solicitud pendiente para esta herramienta'
            });
        }

        // Crear solicitud
        const [result] = await db.query(
            `INSERT INTO solicitudes 
            (usuario_id, herramienta_id, fecha_uso_estimada, fecha_devolucion_estimada, motivo) 
            VALUES (?, ?, ?, ?, ?)`,
            [usuario_id, herramienta_id, fecha_uso_estimada, fecha_devolucion_estimada, motivo || null]
        );

        res.status(201).json({
            success: true,
            message: 'Solicitud enviada. Espera la aprobación del administrador',
            solicitudId: result.insertId
        });

    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Listar solicitudes del usuario actual
// Listar solicitudes del usuario actual
exports.misSolicitudes = async (req, res) => {
    try {
        const [solicitudes] = await db.query(`
            SELECT s.*, 
                   h.descripcion as herramienta_nombre, 
                   h.codigo_qr, 
                   h.imagen_url,
                   c.nombre as categoria_nombre,
                   ar.nombre as admin_revisor_nombre
            FROM solicitudes s
            INNER JOIN herramientas h ON s.herramienta_id = h.id
            LEFT JOIN categorias c ON h.categoria_id = c.id
            LEFT JOIN usuarios ar ON s.admin_revisor_id = ar.id
            WHERE s.usuario_id = ?
            ORDER BY s.created_at DESC
        `, [req.userId]);

        res.json({
            success: true,
            solicitudes
        });

    } catch (error) {
        console.error('Error obteniendo mis solicitudes:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Listar todas las solicitudes (admin)
exports.listarSolicitudes = async (req, res) => {
    try {
        const { estado } = req.query; // Filtro opcional por estado

        let query = `
            SELECT s.*, 
                   u.nombre as usuario_nombre, u.email as usuario_email, u.telefono as usuario_telefono,
                   h.nombre as herramienta_nombre, h.codigo_qr, h.estado as herramienta_estado,
                   ar.nombre as admin_revisor_nombre
            FROM solicitudes s
            INNER JOIN usuarios u ON s.usuario_id = u.id
            INNER JOIN herramientas h ON s.herramienta_id = h.id
            LEFT JOIN usuarios ar ON s.admin_revisor_id = ar.id
        `;

        const params = [];

        if (estado) {
            query += ' WHERE s.estado = ?';
            params.push(estado);
        }

        query += ' ORDER BY s.created_at DESC';

        const [solicitudes] = await db.query(query, params);

        res.json({
            success: true,
            solicitudes
        });

    } catch (error) {
        console.error('Error listando solicitudes:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Aprobar solicitud (admin)
exports.aprobarSolicitud = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const { comentario_admin } = req.body;
        const admin_id = req.userId;

        await connection.beginTransaction();

        // Verificar que la solicitud existe y está pendiente
        const [solicitudes] = await connection.query(
            'SELECT * FROM solicitudes WHERE id = ?',
            [id]
        );

        if (solicitudes.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        const solicitud = solicitudes[0];

        if (solicitud.estado !== 'pendiente') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `La solicitud ya fue ${solicitud.estado}`
            });
        }

        // Verificar que la herramienta está disponible
        const [herramientas] = await connection.query(
            'SELECT estado FROM herramientas WHERE id = ?',
            [solicitud.herramienta_id]
        );

        if (herramientas[0].estado !== 'disponible') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'La herramienta ya no está disponible'
            });
        }

        // Actualizar solicitud a aprobada
        await connection.query(
            `UPDATE solicitudes 
             SET estado = 'aprobada', admin_revisor_id = ?, fecha_revision = NOW(), comentario_admin = ?
             WHERE id = ?`,
            [admin_id, comentario_admin || null, id]
        );

        // Crear el préstamo
        const [prestamo] = await connection.query(
            `INSERT INTO prestamos 
            (solicitud_id, usuario_id, herramienta_id, admin_aprobador_id, fecha_prestamo, fecha_aprobacion, fecha_devolucion_estimada, observaciones) 
            VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [
                id,
                solicitud.usuario_id,
                solicitud.herramienta_id,
                admin_id,
                solicitud.fecha_uso_estimada,
                solicitud.fecha_devolucion_estimada,
                `Aprobado por admin. ${comentario_admin || ''}`
            ]
        );

        // Actualizar estado de la herramienta
        await connection.query(
            'UPDATE herramientas SET estado = "prestado" WHERE id = ?',
            [solicitud.herramienta_id]
        );

        // Registrar en historial
        await connection.query(
            `INSERT INTO historial (usuario_id, accion, entidad_tipo, entidad_id, detalles)
             VALUES (?, 'aprobar_solicitud', 'solicitud', ?, ?)`,
            [admin_id, id, `Solicitud aprobada. Préstamo ID: ${prestamo.insertId}`]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Solicitud aprobada y préstamo creado exitosamente',
            prestamoId: prestamo.insertId
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error aprobando solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    } finally {
        connection.release();
    }
};

// Rechazar solicitud (admin)
exports.rechazarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const { comentario_admin } = req.body;
        const admin_id = req.userId;

        // Verificar que la solicitud existe y está pendiente
        const [solicitudes] = await db.query(
            'SELECT estado FROM solicitudes WHERE id = ?',
            [id]
        );

        if (solicitudes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        if (solicitudes[0].estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                message: `La solicitud ya fue ${solicitudes[0].estado}`
            });
        }

        // Actualizar solicitud a rechazada
        await db.query(
            `UPDATE solicitudes 
             SET estado = 'rechazada', admin_revisor_id = ?, fecha_revision = NOW(), comentario_admin = ?
             WHERE id = ?`,
            [admin_id, comentario_admin || 'Solicitud rechazada', id]
        );

        // Registrar en historial
        await db.query(
            `INSERT INTO historial (usuario_id, accion, entidad_tipo, entidad_id, detalles)
             VALUES (?, 'rechazar_solicitud', 'solicitud', ?, ?)`,
            [admin_id, id, comentario_admin || 'Sin comentarios']
        );

        res.json({
            success: true,
            message: 'Solicitud rechazada'
        });

    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Cancelar solicitud (usuario)
exports.cancelarSolicitud = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario_id = req.userId;

        // Verificar que la solicitud existe, pertenece al usuario y está pendiente
        const [solicitudes] = await db.query(
            'SELECT estado, usuario_id FROM solicitudes WHERE id = ?',
            [id]
        );

        if (solicitudes.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        const solicitud = solicitudes[0];

        if (solicitud.usuario_id !== usuario_id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para cancelar esta solicitud'
            });
        }

        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                message: `No puedes cancelar una solicitud ${solicitud.estado}`
            });
        }

        // Cancelar solicitud
        await db.query(
            `UPDATE solicitudes SET estado = 'cancelada' WHERE id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: 'Solicitud cancelada'
        });

    } catch (error) {
        console.error('Error cancelando solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};