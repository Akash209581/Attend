import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import AdminLogin from './pages/AdminLogin';
import StudentLogin from './pages/StudentLogin';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUpload from './pages/admin/Upload';
import AdminSearch from './pages/admin/Search';
import AdminStudents from './pages/admin/Students';
import AdminAssessments from './pages/admin/Assessments';
import StudentDashboard from './pages/student/Dashboard';

const ProtectedAdmin = ({ children }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/admin" replace />;
};

const ProtectedStudent = ({ children }) => {
  const { isStudent } = useAuth();
  return isStudent ? children : <Navigate to="/student/login" replace />;
};

const AdminEntry = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={
        user?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
          user?.role === 'student' ? <Navigate to="/student/dashboard" replace /> :
            <Navigate to="/student/login" replace />
      } />

      {/* Auth */}
      <Route path="/student/login" element={<StudentLogin />} />

      {/* Admin Routes */}
      <Route path="/admin">
        <Route index element={<AdminEntry />} />
        <Route element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="upload" element={user?.adminRole === 'restricted_admin' ? <Navigate to="/admin/dashboard" replace /> : <AdminUpload />} />

          <Route path="search" element={<AdminSearch />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="assessments" element={<AdminAssessments />} />
        </Route>
      </Route>

      {/* Student Routes */}
      <Route path="/student/dashboard" element={<ProtectedStudent><StudentDashboard /></ProtectedStudent>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    // Disable right click
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Disable dragging (except for input fields)
    const handleDragStart = (e) => {
      if (!e.target || !e.target.tagName) return;
      const tagName = e.target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') {
        return;
      }
      e.preventDefault();
    };

    // Disable text selection start (except for input fields)
    const handleSelectStart = (e) => {
      if (!e.target || !e.target.tagName) return;
      const tagName = e.target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || e.target.isContentEditable) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename="/cse_Attendance">
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-slate-800 dark:text-white',
              style: { fontFamily: 'Inter, sans-serif' },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
