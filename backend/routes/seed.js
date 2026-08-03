const express = require('express');
const router  = express.Router();
const { seed } = require('../controllers/seedController');

router.post('/', seed);

module.exports = router;
