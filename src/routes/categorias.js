const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/categorias - Obtener todas las categorías
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('📋 Obteniendo categorías...'); // DEBUG
    
    const [categorias] = await pool.query(`
      SELECT id, nombre, descripcion 
      FROM categorias 
      ORDER BY nombre ASC
    `);
    
    console.log('✅ Categorías obtenidas:', categorias.length); // DEBUG
    
    res.json({
      success: true,
      categorias: categorias
    });
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las categorías'
    });
  }
});

module.exports = router;