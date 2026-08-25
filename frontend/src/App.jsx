import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import Jobs from './components/Jobs';
import CrmCompanies from './components/CrmCompanies';
import CrmCompanyDetail from './components/CrmCompanyDetail';
import AiRuns from './components/AiRuns';
import PostGenerator from './components/PostGenerator';
import PostHistory from './components/PostHistory';
import LeaveCalendar from './components/LeaveCalendar';
import LeaveTracking from './components/LeaveTracking';
import LeaveApproval from './components/LeaveApproval';
import Navbar from './components/Navbar';
import NotificationBell from './components/NotificationBell';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

const LayoutWrapper = ({ children }) => {
  const { isCollapsed } = useSidebar();

  const checkIsDesktop = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscapeSmartphone = window.matchMedia('(orientation: landscape)').matches && height <= 500;
    return width >= 1024 && !isLandscapeSmartphone;
  };

  const [isDesktop, setIsDesktop] = useState(checkIsDesktop);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(checkIsDesktop());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <div className="flex min-h-screen h-screen">
      <Navbar />
      <main
        className="flex-1 transition-all duration-300 min-h-screen h-full overflow-auto"
        style={{
          marginLeft: isDesktop ? (isCollapsed ? '80px' : '256px') : '0'
        }}
      >
        {/* Notification Bell */}
        <div className="fixed top-20 right-4 z-50 lg:top-4">
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  console.log('AppRoutes render');
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Dashboard />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <AdminRoute>
            <LayoutWrapper>
              <Jobs />
            </LayoutWrapper>
          </AdminRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <AdminRoute>
            <LayoutWrapper>
              <CrmCompanies />
            </LayoutWrapper>
          </AdminRoute>
        }
      />
      <Route
        path="/crm/:id"
        element={
          <AdminRoute>
            <LayoutWrapper>
              <CrmCompanyDetail />
            </LayoutWrapper>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ai-runs"
        element={
          <AdminRoute>
            <LayoutWrapper>
              <AiRuns />
            </LayoutWrapper>
          </AdminRoute>
        }
      />
      <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <LayoutWrapper>
              <PostGenerator />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts/history"
        element={
          <ProtectedRoute>
            <LayoutWrapper>
              <PostHistory />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves"
        element={
          <ProtectedRoute>
            <LayoutWrapper>
              <LeaveCalendar />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves/my-requests"
        element={
          <ProtectedRoute>
            <LayoutWrapper>
              <LeaveTracking />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaves/approval"
        element={
          <AdminRoute>
            <LayoutWrapper>
              <LeaveApproval />
            </LayoutWrapper>
          </AdminRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<div style={{ padding: 24 }}>No route matched</div>} />
    </Routes>
  );
};

const App = () => {
  console.log('App mounted');
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          <Router>
            <AppRoutes />
          </Router>
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;