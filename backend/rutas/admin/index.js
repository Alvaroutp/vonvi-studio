const express = require('express');
const router = express.Router();

router.use(require('./productos'));
router.use(require('./pedidos'));
router.use(require('./resumen'));
router.use(require('./cotizaciones'));
router.use(require('./empleados'));

module.exports = router;