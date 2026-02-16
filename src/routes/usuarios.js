const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas requieren ser admin
router.get('/', verificarToken, esAdmin, usuariosController.listarUsuarios);
router.get('/:id', verificarToken, esAdmin, usuariosController.obtenerUsuario);
router.post('/', verificarToken, esAdmin, usuariosController.crearUsuario);
router.put('/:id', verificarToken, esAdmin, usuariosController.actualizarUsuario);
router.delete('/:id', verificarToken, esAdmin, usuariosController.eliminarUsuario);
router.put('/:id/rol', verificarToken, esAdmin, usuariosController.cambiarRol);

module.exports = router;