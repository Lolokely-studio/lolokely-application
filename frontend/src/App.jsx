import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import Jobs from './components/Jobs';
import PostGenerator from './components/PostGenerator';
import PostHistory from './components/PostHistory';
import Navbar from './components/Navbar';
import NotificationBell from './components/NotificationBell';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const LayoutWrapper = ({ children }) => {
  const { isCollapsed } = useSidebar();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main 
        className="flex-1 transition-all duration-300 min-h-screen"
        style={{
          marginLeft: isDesktop ? (isCollapsed ? '80px' : '256px') : '0'
        }}
      >
        {/* Notification Bell - Fixed top right */}
        <div className="fixed top-4 right-4 z-50">
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
          <ProtectedRoute>
            <LayoutWrapper>
              <Jobs />
            </LayoutWrapper>
          </ProtectedRoute>
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