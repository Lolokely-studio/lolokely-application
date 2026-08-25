import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LogOut,
  MoonStar,
  SunMedium,
  LayoutDashboard,
  Briefcase,
  Building2,
  FileText,
  History,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import logoImage from '../assets/lolokely-logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const checkIsMobile = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscapeSmartphone = window.matchMedia('(orientation: landscape)').matches && height <= 500;
    return width < 1024 || isLandscapeSmartphone;
  };

  const [isMobile, setIsMobile] = useState(checkIsMobile);

  useEffect(() => {
    const handleResize = () => {
      const mobile = checkIsMobile();
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
        setIsAnimating(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return undefined;
    if (isMobile) {
      main.style.paddingTop = '4rem';
    } else {
      main.style.paddingTop = '';
    }
    return () => {
      main.style.paddingTop = '';
    };
  }, [isMobile]);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/posts', label: 'Post Generator', icon: FileText },
    { path: '/posts/history', label: 'Post History', icon: History },
    { path: '/leaves', label: 'Leave Calendar', icon: Calendar },
    { path: '/leaves/my-requests', label: 'My Leaves', icon: Calendar },
  ];

  if (user?.is_admin) {
    navItems.push({ path: '/jobs', label: 'Jobs', icon: Briefcase });
    navItems.push({ path: '/crm', label: 'CRM', icon: Building2 });
    navItems.push({ path: '/admin/ai-runs', label: 'AI Runs', icon: Activity });
    navItems.push({ path: '/leaves/approval', label: 'Approve Leaves', icon: CheckCircle });
  }

  const openMobileMenu = () => {
    setIsMobileOpen(true);
    requestAnimationFrame(() => setIsAnimating(true));
  };

  const closeMobileMenu = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsMobileOpen(false);
    }, 200);
  };

  const toggleMobileMenu = () => {
    if (isMobileOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  };

  if (isMobile) {
    return (
      <>
        {/* Navbar fixe supérieure standard */}
        <nav className="glass-nav fixed top-0 left-0 right-0 z-40 w-full lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl overflow-hidden">
                <img
                  src={logoImage}
                  alt="Lolokely Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="leading-tight min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">Lolokely Admin</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 focus:outline-none border flex-shrink-0"
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
        <div className="h-0 w-0 overflow-visible lg:hidden" aria-hidden="true" />

        {/* Modal avec exactement la même hauteur d'en-tête (h-16) */}
        {isMobileOpen && (
          <div
            className={`fixed inset-0 z-[60] glass-nav bg-background/95 backdrop-blur-md flex flex-col justify-between overflow-y-auto lg:hidden transition-all duration-200 ease-out transform ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              }`}
          >
            <div>
              {/* Bandeau supérieur identique à la Navbar (h-16 + même bouton) */}
              <div className="flex h-16 items-center justify-between px-4 border-b divider-soft shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl overflow-hidden">
                    <img
                      src={logoImage}
                      alt="Lolokely Logo"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="leading-tight min-w-0">
                    <h1 className="text-lg font-semibold text-foreground truncate">Lolokely Admin</h1>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 focus:outline-none border flex-shrink-0"
                  style={{
                    background: 'var(--surface-card)',
                    borderColor: 'var(--surface-card-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenu du menu */}
              <div className="p-4 sm:p-6">
                <nav className="grid grid-cols-1 landscape:grid-cols-2 gap-2 my-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={closeMobileMenu}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive(item.path)
                            ? 'bg-primary-500/25 text-foreground border border-primary-500/25'
                            : 'text-muted hover:text-foreground hover:bg-primary-500/10'
                          }`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Actions inférieures */}
            <div className="p-4 sm:p-6 pt-4 border-t divider-soft space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-xs text-muted">Welcome back</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border"
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
                  <span>Theme</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-foreground border border-primary-500/25 bg-primary-500/15 hover:bg-primary-500/25 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      className={`glass-nav fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out hidden lg:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className="flex flex-col h-full p-4">
        <div className={`flex items-center mb-6 pb-4 border-b divider-soft ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden">
                  <img
                    src={logoImage}
                    alt="Lolokely Logo"
                    className="h-full w-full object-contain"
                  />
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden">
                <img
                  src={logoImage}
                  alt="Lolokely Logo"
                  className="h-full w-full object-contain"
                />
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

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${isCollapsed ? 'justify-center' : ''
                  } ${isActive(item.path)
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none border ${isCollapsed ? 'justify-center w-full' : 'flex-1'
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-foreground transition-all duration-200 hover:bg-primary-500/25 focus:outline-none border border-primary-500/25 bg-primary-500/15 ${isCollapsed ? 'justify-center' : ''
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