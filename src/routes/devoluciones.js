const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const devolucionesController = require('../controllers/devolucionesController');

// Rutas de usuario (requieren autenticación)
router.post('/', authMiddleware, devolucionesController.crearDevolucion);
router.get('/mis-devoluciones', authMiddleware, devolucionesController.misDevoluciones);
router.get('/prestamo-qr/:codigo_qr', authMiddleware, devolucionesController.obtenerPrestamoPorQR);

// Rutas de administrador
router.get('/', authMiddleware, devolucionesController.listarDevoluciones);
router.put('/:id/aprobar', authMiddleware, devolucionesController.aprobarDevolucion);
router.put('/:id/rechazar', authMiddleware, devolucionesController.rechazarDevolucion);

module.exports = router;