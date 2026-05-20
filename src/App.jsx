import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import CalendarView from './pages/CalendarView';
import Events from './pages/Events';
import Announcements from './pages/Announcements';
import PublicAnnouncements from './pages/PublicAnnouncements';
import Reports from './pages/Reports';
import Users from './pages/Users';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<DashboardLayout />}>
              {/* Rutas Públicas / Modo Invitado */}
              <Route path="/calendario" element={<ErrorBoundary><CalendarView /></ErrorBoundary>} />
              <Route path="/galeria-anuncios" element={<ErrorBoundary><PublicAnnouncements /></ErrorBoundary>} />
              <Route index element={<Navigate to="/calendario" replace />} />
              
              {/* Rutas Protegidas */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES', 'OFICINA']} />}>
                <Route path="/eventos" element={<ErrorBoundary><Events /></ErrorBoundary>} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES', 'OFICINA', 'USUARIO_AUTENTICADO_APP']} />}>
                <Route path="/anuncios" element={<ErrorBoundary><Announcements /></ErrorBoundary>} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES', 'OFICINA']} />}>
                <Route path="/reportes" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
                <Route path="/usuarios" element={<ErrorBoundary><Users /></ErrorBoundary>} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/calendario" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer 
          position="top-right"
          autoClose={4000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
