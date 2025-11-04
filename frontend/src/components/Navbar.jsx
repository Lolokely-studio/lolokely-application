import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, MoonStar, SunMedium } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-600">
            <span className="text-lg font-semibold">LK</span>
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-semibold text-foreground">Lolokely Admin</h1>
            <p className="text-xs text-muted">Green workflow dashboard</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/dashboard"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive('/dashboard')
                ? 'bg-primary-500/25 text-foreground border border-primary-500/25'
                : 'text-muted hover:text-foreground hover:bg-primary-500/10'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/jobs"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive('/jobs')
                ? 'bg-primary-500/25 text-foreground border border-primary-500/25'
                : 'text-muted hover:text-foreground hover:bg-primary-500/10'
            }`}
          >
            Jobs
          </Link>
          <Link
            to="/posts"
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive('/posts')
                ? 'bg-primary-500/25 text-foreground border border-primary-500/25'
                : 'text-muted hover:text-foreground hover:bg-primary-500/10'
            }`}
          >
            Post Generator
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'dark' ? (
              <SunMedium className="h-5 w-5" />
            ) : (
              <MoonStar className="h-5 w-5" />
            )}
          </button>

          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-foreground">
              {user?.first_name} {user?.last_name}
            </span>
            <span className="text-xs text-muted">Welcome back</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-500/25 bg-primary-500/15 px-4 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-primary-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
