const nodemailer = require('nodemailer');

// Configurar transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Verificar configuración
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Error en configuración de email:', error);
    } else {
        console.log('✅ Servidor de email listo');
    }
});

// Enviar código de recuperación
async function sendPasswordResetCode(email, nombre, codigo) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '🔐 Código de Recuperación de Contraseña',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #2D5F4C 0%, #4A8B72 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border-radius: 0 0 10px 10px;
                    }
                    .code-box {
                        background: white;
                        border: 2px dashed #2D5F4C;
                        padding: 20px;
                        text-align: center;
                        margin: 20px 0;
                        border-radius: 8px;
                    }
                    .code {
                        font-size: 36px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        color: #2D5F4C;
                        font-family: 'Courier New', monospace;
                    }
                    .warning {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Recuperación de Contraseña</h1>
                    </div>
                    <div class="content">
                        <p>Hola <strong>${nombre}</strong>,</p>
                        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Alimentos.</p>
                        
                        <div class="code-box">
                            <p style="margin: 0; color: #666; font-size: 14px;">Tu código de verificación es:</p>
                            <div class="code">${codigo}</div>
                        </div>

                        <div class="warning">
                            <strong>⚠️ Importante:</strong>
                            <ul style="margin: 10px 0; padding-left: 20px;">
                                <li>Este código expira en <strong>15 minutos</strong></li>
                                <li>No compartas este código con nadie</li>
                                <li>Si no solicitaste este cambio, ignora este mensaje</li>
                            </ul>
                        </div>

                        <p style="margin-top: 20px;">Si tienes problemas, contacta al administrador del sistema.</p>
                    </div>
                    <div class="footer">
                        <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
                        <p>&copy; ${new Date().getFullYear()} Sistema de Alimentos. Todos los derechos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        throw error;
    }
}

module.exports = {
    sendPasswordResetCode,
};