const db = require('./db');

async function requiereSesion(req, res, next) {
    try {

        const token = (req.headers.authorization || '').split(' ')[1];

        if (!token) {
            return res.status(401).json({ ok: false, mensaje: 'Necesitas iniciar sesión' });
        }

        const [usuarios] = await db.query(
            'SELECT id, nombres, apellidos, email, telefono, rol FROM usuarios WHERE token = ?',
            [token]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({ ok: false, mensaje: 'Tu sesión expiró, entra de nuevo' });
        }

        req.usuario = usuarios[0];

        next(); 

    } catch (error) {
        console.error('Error comprobando la sesión:', error.message);
        res.status(500).json({ ok: false, mensaje: 'No se pudo comprobar la sesión' });
    }
}

module.exports = { requiereSesion };