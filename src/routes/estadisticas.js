const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// GET /api/estadisticas - Obtener estadísticas (solo admin)
router.get('/', verificarToken, esAdmin, async (req, res) => {
    try {
        // Total de herramientas
        const [totalHerramientas] = await db.query(
            'SELECT COUNT(*) as total FROM herramientas'
        );

        // Herramientas por estado
        const [herramientasPorEstado] = await db.query(`
            SELECT estado, COUNT(*) as cantidad 
            FROM herramientas 
            GROUP BY estado
        `);

        // Herramientas por categoría
        const [herramientasPorCategoria] = await db.query(`
            SELECT c.nombre as categoria, COUNT(h.id) as cantidad
            FROM categorias c
            LEFT JOIN herramientas h ON c.id = h.categoria_id
            GROUP BY c.id, c.nombre
            ORDER BY cantidad DESC
        `);

        // Total de usuarios
        const [totalUsuarios] = await db.query(
            'SELECT COUNT(*) as total FROM usuarios'
        );

        // Solicitudes pendientes
        const [solicitudesPendientes] = await db.query(
            "SELECT COUNT(*) as total FROM solicitudes WHERE estado = 'pendiente'"
        );

        // Devoluciones pendientes
        const [devolucionesPendientes] = await db.query(
            "SELECT COUNT(*) as total FROM devoluciones WHERE estado = 'pendiente'"
        );

        // Préstamos activos
        const [prestamosActivos] = await db.query(
            "SELECT COUNT(*) as total FROM prestamos WHERE estado = 'activo'"
        );

        // Top 5 herramientas más solicitadas
        const [topHerramientas] = await db.query(`
            SELECT h.nombre, h.descripcion, COUNT(s.id) as solicitudes
            FROM herramientas h
            LEFT JOIN solicitudes s ON h.id = s.herramienta_id
            GROUP BY h.id, h.nombre, h.descripcion
            ORDER BY solicitudes DESC
            LIMIT 5
        `);

        // Préstamos en los últimos 7 días
        const [tendenciaPrestamos] = await db.query(`
            SELECT DATE(created_at) as fecha, COUNT(*) as cantidad
            FROM prestamos
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY fecha ASC
        `);

        res.json({
            success: true,
            estadisticas: {
                totalHerramientas: totalHerramientas[0].total,
                totalUsuarios: totalUsuarios[0].total,
                solicitudesPendientes: solicitudesPendientes[0].total,
                devolucionesPendientes: devolucionesPendientes[0].total,
                prestamosActivos: prestamosActivos[0].total,
                herramientasPorEstado: herramientasPorEstado,
                herramientasPorCategoria: herramientasPorCategoria,
                topHerramientas: topHerramientas,
                tendenciaPrestamos: tendenciaPrestamos
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
});

module.exports = router;
