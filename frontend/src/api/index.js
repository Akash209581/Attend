import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/cseakash' });

// Attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Auto-logout on 401 — but NOT on login routes (wrong credentials should show error, not redirect)
api.interceptors.response.use(
    (res) => res,
    (err) => {
        const isAuthRoute = err.config?.url?.includes('/auth/');
        if (err.response?.status === 401 && !isAuthRoute) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/cse_Attendance/';
        }
        return Promise.reject(err);
    }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminLogin = (d) => api.post('/auth/admin', d);
export const studentLogin = (d) => api.post('/auth/student', d);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminSections = () => api.get('/admin/sections');
export const getSectionStudents = (sec, page = 1, minThreshold = null, maxThreshold = null) =>
    api.get(`/admin/sections/${sec}/students`, { params: { page, limit: 50, minThreshold, maxThreshold } });
export const getYearStudents = (year, page = 1) =>
    api.get(`/admin/year/${year}/students?page=${page}&limit=50`);
export const searchStudents = (params) => api.get('/admin/search', { params });
export const getStudentDetail = (rollNo) => api.get(`/admin/students/detail/${rollNo}`);
export const getUploads = () => api.get('/admin/uploads');
export const deleteUpload = (id) => api.delete(`/admin/uploads/${id}`);
export const getSubjectStats = () => api.get('/admin/subject-stats');
export const uploadFile = (formData) =>
    api.post('/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const downloadCSV = (section) =>
    api.get(`/admin/download/${section}`, { responseType: 'blob' });
export const uploadAssessments = (formData) =>
    api.post('/admin/assessments/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAssessments = (params) => api.get('/admin/assessments', { params });
export const deleteAssessmentUpload = (id) => api.delete(`/admin/assessments/uploads/${id}`);
export const getSectionPerformance = (section) => api.get('/admin/assessments/section-performance', { params: { section } });
export const getStudentAssessments = () => api.get('/student/assessments');
export const getSubjectNames = () => api.get('/admin/subject-names');
export const getStudentsBySubject = (params) => api.get('/admin/students-by-subject', { params });
export const getDayWiseStats = (year = 'all') => api.get(`/admin/daywise-stats/${year}`);

// ── Student ───────────────────────────────────────────────────────────────────
export const getStudentProfile = () => api.get('/student/profile');
export const getStudentSubjects = () => api.get('/student/subjects');
export const getStudentHistory = () => api.get('/student/history');
export const getSectionMates = () => api.get('/student/section-mates');

export default api;
