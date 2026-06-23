import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Spinner from './components/ui/Spinner';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CalendarView      = lazy(() => import('./pages/CalendarView'));
const Events            = lazy(() => import('./pages/Events'));
const Announcements     = lazy(() => import('./pages/Announcements'));
const PublicAnnouncements = lazy(() => import('./pages/PublicAnnouncements'));
const Reports           = lazy(() => import('./pages/Reports'));
const Users             = lazy(() => import('./pages/Users'));

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<DashboardLayout />}>
              <Route path="/calendario" element={<ErrorBoundary><Suspense fallback={<Spinner message="Cargando..." />}><CalendarView /></Suspense></ErrorBoundary>} />
              <Route path="/galeria-anuncios" element={<ErrorBoundary><Suspense fallback={<Spinner message="Cargando..." />}><PublicAnnouncements /></Suspense></ErrorBoundary>} />
              <Route index element={<Navigate to="/calendario" replace />} />

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES', 'OFICINA', 'CONSULTORIA']} />}>
                <Route path="/eventos" element={<ErrorBoundary><Suspense fallback={<Spinner message="Cargando..." />}><Events /></Suspense></ErrorBoundary>} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES', 'OFICINA', 'USUARIO_AUTENTICADO_APP', 'CONSULTORIA']} />}>
                <Route path="/anuncios" element={<ErrorBoundary><Suspense fallback={<Spinner message="Cargando..." />}><Announcements /></Suspense></ErrorBoundary>} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'COMUNICACIONES', 'OFICINA', 'CONSULTORIA']} />}>
                <Route path="/reportes" element={<ErrorBoundary><Suspense fallback={<Spinner message="Cargando..." />}><Reports /></Suspense></ErrorBoundary>} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']} />}>
                <Route path="/usuarios" element={<ErrorBoundary><Suspense fallback={<Spinner message="Cargando..." />}><Users /></Suspense></ErrorBoundary>} />
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
          theme="light"
        />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
