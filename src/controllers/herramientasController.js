const db = require('../config/database');

// Listar todas las herramientas
exports.listarHerramientas = async (req, res) => {
    try {
        const [herramientas] = await db.query(`
            SELECT h.*, c.nombre as categoria_nombre 
            FROM herramientas h 
            LEFT JOIN categorias c ON h.categoria_id = c.id
            ORDER BY h.created_at DESC
        `);

        res.json({
            success: true,
            herramientas
        });

    } catch (error) {
        console.error('Error listando herramientas:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Obtener herramienta por ID
exports.obtenerHerramienta = async (req, res) => {
    try {
        const { id } = req.params;

        const [herramientas] = await db.query(`
            SELECT h.*, c.nombre as categoria_nombre 
            FROM herramientas h 
            LEFT JOIN categorias c ON h.categoria_id = c.id
            WHERE h.id = ?
        `, [id]);

        if (herramientas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Herramienta no encontrada'
            });
        }

        res.json({
            success: true,
            herramienta: herramientas[0]
        });

    } catch (error) {
        console.error('Error obteniendo herramienta:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Buscar herramienta por código QR
exports.buscarPorQR = async (req, res) => {
    try {
        const { code } = req.params;

        const [herramientas] = await db.query(`
            SELECT h.*, c.nombre as categoria_nombre 
            FROM herramientas h 
            LEFT JOIN categorias c ON h.categoria_id = c.id
            WHERE h.codigo_qr = ?
        `, [code]);

        if (herramientas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Herramienta no encontrada con ese código QR'
            });
        }

        res.json({
            success: true,
            herramienta: herramientas[0]
        });

    } catch (error) {
        console.error('Error buscando herramienta por QR:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Crear herramienta (solo admin)
exports.crearHerramienta = async (req, res) => {
    try {
        const { codigo_qr, nombre, descripcion, categoria_id, ubicacion, imagen_url } = req.body;

        // Validar campos requeridos
        if (!codigo_qr || !nombre) {
            return res.status(400).json({
                success: false,
                message: 'Código QR y nombre son requeridos'
            });
        }

        // Verificar que el código QR no exista
        const [existente] = await db.query(
            'SELECT id FROM herramientas WHERE codigo_qr = ?',
            [codigo_qr]
        );

        if (existente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una herramienta con ese código QR'
            });
        }

        // Insertar herramienta
        const [result] = await db.query(
            `INSERT INTO herramientas 
            (codigo_qr, nombre, descripcion, categoria_id, ubicacion, imagen_url) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [codigo_qr, nombre, descripcion || null, categoria_id || null, ubicacion || null, imagen_url || null]
        );

        res.status(201).json({
            success: true,
            message: 'Herramienta creada exitosamente',
            herramientaId: result.insertId
        });

    } catch (error) {
        console.error('Error creando herramienta:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Actualizar herramienta (solo admin)
exports.actualizarHerramienta = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, categoria_id, estado, ubicacion, imagen_url } = req.body;

        // Verificar que la herramienta existe
        const [existente] = await db.query('SELECT id FROM herramientas WHERE id = ?', [id]);

        if (existente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Herramienta no encontrada'
            });
        }

        // Actualizar
        await db.query(
            `UPDATE herramientas 
            SET nombre = ?, descripcion = ?, categoria_id = ?, estado = ?, ubicacion = ?, imagen_url = ?
            WHERE id = ?`,
            [nombre, descripcion, categoria_id, estado, ubicacion, imagen_url, id]
        );

        res.json({
            success: true,
            message: 'Herramienta actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando herramienta:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Eliminar herramienta (solo admin)
// Eliminar herramienta (solo admin)
exports.eliminarHerramienta = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la herramienta existe
        const [herramientas] = await db.query(
            'SELECT id, descripcion, estado FROM herramientas WHERE id = ?',
            [id]
        );

        if (herramientas.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Herramienta no encontrada'
            });
        }

        const herramienta = herramientas[0];

        // Verificar que NO esté prestada o en mantenimiento
        if (herramienta.estado === 'prestado') {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar. La herramienta está actualmente prestada'
            });
        }

        if (herramienta.estado === 'mantenimiento') {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar. La herramienta está en mantenimiento'
            });
        }

        // Solo se puede eliminar si está: disponible o baja
        if (herramienta.estado !== 'disponible' && herramienta.estado !== 'baja') {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar. Estado actual: ${herramienta.estado}`
            });
        }

        // Verificar que no tenga préstamos activos (por si acaso)
        const [prestamosActivos] = await db.query(
            'SELECT id FROM prestamos WHERE herramienta_id = ? AND estado = "activo"',
            [id]
        );

        if (prestamosActivos.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar. La herramienta tiene préstamos activos'
            });
        }

        // Eliminar
        await db.query('DELETE FROM herramientas WHERE id = ?', [id]);

        // Registrar en historial
        await db.query(
            `INSERT INTO historial (usuario_id, accion, entidad_tipo, entidad_id, detalles)
             VALUES (?, 'eliminar_herramienta', 'herramienta', ?, ?)`,
            [req.userId, id, `Herramienta eliminada: ${herramienta.descripcion}`]
        );

        res.json({
            success: true,
            message: 'Herramienta eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando herramienta:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};