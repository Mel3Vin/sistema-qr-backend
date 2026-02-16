const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prestamosController = require('../controllers/prestamosController');

// Rutas de usuario
router.get('/mis-prestamos', authMiddleware, prestamosController.misPrestamos);
router.get('/mis-activos', authMiddleware, prestamosController.misPrestamosActivos);
router.get('/:id', authMiddleware, prestamosController.obtenerPrestamo);
router.post('/', authMiddleware, prestamosController.crearPrestamo);

// Rutas de administrador
router.get('/', authMiddleware, prestamosController.listarPrestamos);
router.get('/activos/todos', authMiddleware, prestamosController.prestamosActivos);
router.put('/:id/devolver', authMiddleware, prestamosController.devolverHerramienta);

module.exports = router;