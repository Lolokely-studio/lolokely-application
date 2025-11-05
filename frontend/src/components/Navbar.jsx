import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  MoonStar, 
  SunMedium, 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  History, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/jobs', label: 'Jobs', icon: Briefcase },
    { path: '/posts', label: 'Post Generator', icon: FileText },
    { path: '/posts/history', label: 'Post History', icon: History },
  ];

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  // Mobile hamburger menu overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <nav className="glass-nav sticky top-0 z-40 md:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-600">
                <span className="text-lg font-semibold">LK</span>
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-semibold text-foreground">Lolokely Admin</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 focus:outline-none border"
              style={{
                background: 'var(--surface-card)',
                borderColor: 'var(--surface-card-border)',
                color: 'var(--text-primary)',
              }}
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMobileMenu}
            />
            <aside
              className="fixed left-0 top-0 h-full w-64 z-50 glass-nav transition-transform duration-300 ease-in-out md:hidden"
              style={{
                transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
              }}
            >
              <div className="flex flex-col h-full p-4">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b divider-soft">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-600">
                    <span className="text-lg font-semibold">LK</span>
                  </div>
                  <div className="leading-tight">
                    <h1 className="text-lg font-semibold text-foreground">Lolokely Admin</h1>
                    <p className="text-xs text-muted">Green workflow dashboard</p>
                  </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          isActive(item.path)
                            ? 'bg-primary-500/25 text-foreground border border-primary-500/25'
                            : 'text-muted hover:text-foreground hover:bg-primary-500/10'
                        }`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                {/* User Info & Actions */}
                <div className="space-y-3 pt-4 border-t divider-soft">
                  <div className="flex items-center gap-3 px-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="text-xs text-muted">Welcome back</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none border"
                    style={{
                      background: 'var(--surface-card)',
                      borderColor: 'var(--surface-card-border)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {theme === 'dark' ? (
                      <SunMedium className="h-5 w-5" />
                    ) : (
                      <MoonStar className="h-5 w-5" />
                    )}
                    <span>Toggle Theme</span>
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-foreground transition-all duration-200 hover:bg-primary-500/25 focus:outline-none border border-primary-500/25 bg-primary-500/15"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
      </>
    );
  }

  // Desktop Sidebar
  return (
    <aside
      className={`glass-nav fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out hidden md:flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full p-4">
        {/* Logo & Collapse Button */}
        <div className={`flex items-center mb-6 pb-4 border-b divider-soft ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-600">
                  <span className="text-lg font-semibold">LK</span>
                </div>
                <div className="leading-tight">
                  <h1 className="text-lg font-semibold text-foreground">Lolokely Admin</h1>
                  <p className="text-xs text-muted">Green workflow dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 hover:bg-primary-500/10 focus:outline-none"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4 text-muted" />
              </button>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-600">
                <span className="text-lg font-semibold">LK</span>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 hover:bg-primary-500/10 focus:outline-none"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  isActive(item.path)
                    ? 'bg-primary-500/25 text-foreground border border-primary-500/25'
                    : 'text-muted hover:text-foreground hover:bg-primary-500/10'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Actions */}
        <div className="space-y-3 pt-4 border-t divider-soft">
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-muted">Welcome back</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none border ${
                isCollapsed ? 'justify-center w-full' : 'flex-1'
              }`}
              style={{
                background: 'var(--surface-card)',
                borderColor: 'var(--surface-card-border)',
                color: 'var(--text-primary)',
              }}
              title={isCollapsed ? 'Toggle Theme' : ''}
            >
              {theme === 'dark' ? (
                <SunMedium className="h-5 w-5" />
              ) : (
                <MoonStar className="h-5 w-5" />
              )}
              {!isCollapsed && <span>Toggle Theme</span>}
            </button>
          </div>
          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-foreground transition-all duration-200 hover:bg-primary-500/25 focus:outline-none border border-primary-500/25 bg-primary-500/15 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Navbar;
