const express = require('express');
const router = express.Router();
const { studentAuth } = require('../middleware/auth');
const { getProfile, getSubjects, getHistory, getSectionMates, getStudentAssessments } = require('../controllers/studentController');

router.use(studentAuth);

router.get('/profile', getProfile);
router.get('/subjects', getSubjects);
router.get('/history', getHistory);
router.get('/section-mates', getSectionMates);
router.get('/assessments', getStudentAssessments);

module.exports = router;
