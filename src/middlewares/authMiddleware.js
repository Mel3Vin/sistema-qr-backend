const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

// Middleware para verificar token
const verificarToken = (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }

        // El token viene en formato: "Bearer TOKEN"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, jwtConfig.secret);
        
        // Agregar información del usuario al request
        req.userId = decoded.id;
        req.userRol = decoded.rol;
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};

// Middleware para verificar si es admin
const esAdmin = (req, res, next) => {
    if (req.userRol !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren permisos de administrador.'
        });
    }
    next();
};

// Middleware para verificar si es docente o admin
const esDocenteOAdmin = (req, res, next) => {
    if (req.userRol !== 'admin' && req.userRol !== 'docente') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Se requieren permisos de docente o administrador.'
        });
    }
    next();
};

// Exportar como objeto (método antiguo, para compatibilidad)
module.exports = verificarToken;

// Exportar funciones individuales
module.exports.verificarToken = verificarToken;
module.exports.esAdmin = esAdmin;
module.exports.esDocenteOAdmin = esDocenteOAdmin;