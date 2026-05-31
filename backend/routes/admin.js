const express = require('express');
const router = express.Router();
const multer = require('multer');
const { adminOnly } = require('../middleware/auth');
const {
    uploadAttendance,
    getStats,
    getSections,
    getSectionStudents,
    searchStudent,
    getUploads,
    getSubjectStats,
    downloadCSV,
    getNeedsAttention,
    getSubjectNames,
    getStudentsBySubject,
    getDayWiseStats,
    getYearStudents,
    deleteUpload,
} = require('../controllers/adminController');

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
router.post('/upload', upload.single('file'), uploadAttendance);

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

// Uploads history
router.get('/uploads', getUploads);
router.delete('/uploads/:id', deleteUpload);

// Subject analytics
router.get('/subject-stats', getSubjectStats);
router.get('/subject-names', getSubjectNames);
router.get('/students-by-subject', getStudentsBySubject);

// Download
router.get('/download/:section', downloadCSV);

// Needs attention
router.get('/needs-attention', getNeedsAttention);

module.exports = router;
