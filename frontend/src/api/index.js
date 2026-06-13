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
export const adminLogin = (d) => api.post('/auth/akashisadmin', d);
export const studentLogin = (d) => api.post('/auth/student', d);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/akashisadmin/stats');
export const getAdminSections = () => api.get('/akashisadmin/sections');
export const getSectionStudents = (sec, page = 1, minThreshold = null, maxThreshold = null) =>
    api.get(`/akashisadmin/sections/${sec}/students`, { params: { page, limit: 50, minThreshold, maxThreshold } });
export const getYearStudents = (year, page = 1) =>
    api.get(`/akashisadmin/year/${year}/students?page=${page}&limit=50`);
export const searchStudents = (params) => api.get('/akashisadmin/search', { params });
export const getStudentDetail = (rollNo) => api.get(`/akashisadmin/students/detail/${rollNo}`);
export const getUploads = () => api.get('/akashisadmin/uploads');
export const deleteUpload = (id) => api.delete(`/akashisadmin/uploads/${id}`);
export const getSubjectStats = () => api.get('/akashisadmin/subject-stats');
export const uploadFile = (formData) =>
    api.post('/akashisadmin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const downloadCSV = (section) =>
    api.get(`/akashisadmin/download/${section}`, { responseType: 'blob' });
export const uploadAssessments = (formData) =>
    api.post('/akashisadmin/assessments/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAssessments = (params) => api.get('/akashisadmin/assessments', { params });
export const deleteAssessmentUpload = (id) => api.delete(`/akashisadmin/assessments/uploads/${id}`);
export const getSectionPerformance = (section) => api.get('/akashisadmin/assessments/section-performance', { params: { section } });
export const getStudentAssessments = () => api.get('/student/assessments');
export const getSubjectNames = () => api.get('/akashisadmin/subject-names');
export const getStudentsBySubject = (params) => api.get('/akashisadmin/students-by-subject', { params });
export const getDayWiseStats = (year = 'all') => api.get(`/akashisadmin/daywise-stats/${year}`);

// ── Student ───────────────────────────────────────────────────────────────────
export const getStudentProfile = () => api.get('/student/profile');
export const getStudentSubjects = () => api.get('/student/subjects');
export const getStudentHistory = () => api.get('/student/history');
export const getSectionMates = () => api.get('/student/section-mates');

export default api;
