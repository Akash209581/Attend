const express = require('express');
const router = express.Router();
const multer = require('multer');
const { adminOnly, superAdminOnly } = require('../middleware/auth');
const {
    uploadAttendance,
    getStats,
    getSections,
    getSectionStudents,
    searchStudent,
    getUploads,
    getSubjectStats,
    downloadCSV,
    getSubjectNames,
    getStudentsBySubject,
    getDayWiseStats,
    getYearStudents,
    deleteUpload,
    getStudentDetail,
} = require('../controllers/adminController');

const {
    uploadAssessments,
    getAssessments,
    deleteAssessmentUpload
} = require('../controllers/assessmentController');

// Multer in-memory storage for Excel files
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
        }
    },
});

router.use(adminOnly);

// Upload
router.post('/upload', superAdminOnly, upload.single('file'), uploadAttendance);

// Stats & charts
router.get('/stats', getStats);
router.get('/daywise-stats/:year', getDayWiseStats);
router.get('/daywise-stats', (req, res, next) => {
    req.params.year = 'all';
    next();
}, getDayWiseStats);

// Sections & students
router.get('/sections', getSections);
router.get('/sections/:section/students', getSectionStudents);
router.get('/year/:year/students', getYearStudents);

// Search
router.get('/search', searchStudent);
router.get('/students/detail/:rollNo', getStudentDetail);

// Uploads history
router.get('/uploads', getUploads);
router.delete('/uploads/:id', superAdminOnly, deleteUpload);

// Subject analytics
router.get('/subject-stats', getSubjectStats);
router.get('/subject-names', getSubjectNames);
router.get('/students-by-subject', getStudentsBySubject);

// Download
router.get('/download/:section', downloadCSV);

// Assessments
router.post('/assessments/upload', superAdminOnly, upload.single('file'), uploadAssessments);
router.get('/assessments', getAssessments);
router.delete('/assessments/uploads/:id', superAdminOnly, deleteAssessmentUpload);

module.exports = router;
