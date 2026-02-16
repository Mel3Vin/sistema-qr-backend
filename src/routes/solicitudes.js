const express = require('express');
const router = express.Router();
const solicitudesController = require('../controllers/solicitudesController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Rutas para usuarios
router.post('/', verificarToken, solicitudesController.crearSolicitud);
router.get('/mis-solicitudes', verificarToken, solicitudesController.misSolicitudes);
router.put('/:id/cancelar', verificarToken, solicitudesController.cancelarSolicitud);

// Rutas para admin
router.get('/', verificarToken, esAdmin, solicitudesController.listarSolicitudes);
router.put('/:id/aprobar', verificarToken, esAdmin, solicitudesController.aprobarSolicitud);
router.put('/:id/rechazar', verificarToken, esAdmin, solicitudesController.rechazarSolicitud);

module.exports = router;