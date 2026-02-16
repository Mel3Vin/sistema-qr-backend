const express = require('express');
const router = express.Router();
const herramientasController = require('../controllers/herramientasController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Rutas públicas (requieren autenticación)
router.get('/', verificarToken, herramientasController.listarHerramientas);
router.get('/:id', verificarToken, herramientasController.obtenerHerramienta);
router.get('/qr/:code', verificarToken, herramientasController.buscarPorQR);

// Rutas de administrador
router.post('/', verificarToken, esAdmin, herramientasController.crearHerramienta);
router.put('/:id', verificarToken, esAdmin, herramientasController.actualizarHerramienta);
router.delete('/:id', verificarToken, esAdmin, herramientasController.eliminarHerramienta);

module.exports = router;