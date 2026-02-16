const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Listar todos los usuarios (admin)
exports.listarUsuarios = async (req, res) => {
    try {
        const [usuarios] = await db.query(`
            SELECT id, nombre, email, rol, telefono, created_at 
            FROM usuarios 
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            usuarios
        });

    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Obtener usuario por ID (admin)
exports.obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        const [usuarios] = await db.query(
            'SELECT id, nombre, email, rol, telefono, created_at FROM usuarios WHERE id = ?',
            [id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            usuario: usuarios[0]
        });

    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Crear usuario (admin)
exports.crearUsuario = async (req, res) => {
    try {
        const { nombre, email, password, rol, telefono } = req.body;
        const admin_id = req.userId;

        // Validar campos
        if (!nombre || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, email y contraseña son requeridos'
            });
        }

        // Validar rol
        if (rol && !['admin', 'usuario'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido. Debe ser "admin" o "usuario"'
            });
        }

        // Verificar si el email ya existe
        const [existingUser] = await db.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Hash de contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertar usuario
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hashedPassword, rol || 'usuario', telefono || null]
        );

        // Registrar en historial
        await db.query(
            `INSERT INTO historial (usuario_id, accion, entidad_tipo, entidad_id, detalles)
             VALUES (?, 'crear_usuario', 'usuario', ?, ?)`,
            [admin_id, result.insertId, `Usuario creado: ${email} con rol ${rol || 'usuario'}`]
        );

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Actualizar usuario (admin)
exports.actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, password, rol, telefono } = req.body;
        const admin_id = req.userId;

        // Verificar que el usuario existe
        const [existente] = await db.query('SELECT id FROM usuarios WHERE id = ?', [id]);

        if (existente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Si se proporciona un nuevo email, verificar que no esté en uso
        if (email) {
            const [emailExistente] = await db.query(
                'SELECT id FROM usuarios WHERE email = ? AND id != ?',
                [email, id]
            );

            if (emailExistente.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está en uso por otro usuario'
                });
            }
        }

        // Validar rol si se proporciona
        if (rol && !['admin', 'usuario'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido. Debe ser "admin" o "usuario"'
            });
        }

        // Construir query dinámico
        let updates = [];
        let valores = [];

        if (nombre) {
            updates.push('nombre = ?');
            valores.push(nombre);
        }
        if (email) {
            updates.push('email = ?');
            valores.push(email);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password_hash = ?');
            valores.push(hashedPassword);
        }
        if (rol) {
            updates.push('rol = ?');
            valores.push(rol);
        }
        if (telefono !== undefined) {
            updates.push('telefono = ?');
            valores.push(telefono);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar'
            });
        }

        valores.push(id);

        // Actualizar
        await db.query(
            `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
            valores
        );

        // Registrar en historial
        await db.query(
            `INSERT INTO historial (usuario_id, accion, entidad_tipo, entidad_id, detalles)
             VALUES (?, 'editar_usuario', 'usuario', ?, ?)`,
            [admin_id, id, `Usuario actualizado. Campos: ${updates.join(', ')}`]
        );

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Eliminar usuario (admin)
exports.eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const admin_id = req.userId;

        // No permitir que el admin se elimine a sí mismo
        if (parseInt(id) === admin_id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propia cuenta'
            });
        }

        // Verificar que no tenga préstamos activos
        const [prestamosActivos] = await db.query(
            'SELECT id FROM prestamos WHERE usuario_id = ? AND estado = "activo"',
            [id]
        );

        if (prestamosActivos.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar. El usuario tiene préstamos activos'
            });
        }

        // Eliminar usuario
        const [result] = await db.query('DELETE FROM usuarios WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};

// Cambiar rol de usuario (admin)
exports.cambiarRol = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;
        const admin_id = req.userId;

        // Validar rol
        if (!rol || !['admin', 'usuario'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido. Debe ser "admin" o "usuario"'
            });
        }

        // No permitir que el admin cambie su propio rol
        if (parseInt(id) === admin_id) {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar tu propio rol'
            });
        }

        // Actualizar rol
        const [result] = await db.query(
            'UPDATE usuarios SET rol = ? WHERE id = ?',
            [rol, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Registrar en historial
        await db.query(
            `INSERT INTO historial (usuario_id, accion, entidad_tipo, entidad_id, detalles)
             VALUES (?, 'editar_usuario', 'usuario', ?, ?)`,
            [admin_id, id, `Rol cambiado a: ${rol}`]
        );

        res.json({
            success: true,
            message: `Rol actualizado a ${rol} exitosamente`
        });

    } catch (error) {
        console.error('Error cambiando rol:', error);
        res.status(500).json({
            success: false,
            message: 'Error en el servidor'
        });
    }
};