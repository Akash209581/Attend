const express = require('express');
const router = express.Router();
const { adminLogin, studentLogin } = require('../controllers/authController');

router.post('/akashisadmin', adminLogin);
router.post('/student', studentLogin);

module.exports = router;
