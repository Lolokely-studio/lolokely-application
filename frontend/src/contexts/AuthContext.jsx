import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/taskService';

const AuthContext = createContext();

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour (matches JWT expiry)
const INACTIVITY_TIMEOUT = SESSION_DURATION_MS;
const TOKEN_EXPIRES_AT_KEY = 'token_expires_at';

const parseJwtExpiresAt = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const resolveExpiresAt = (token) => {
  return parseJwtExpiresAt(token) ?? Date.now() + SESSION_DURATION_MS;
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.access_token,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
        loading: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true, // Start with loading true to check localStorage
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const inactivityTimerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const clearSessionStorage = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  }, []);

  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearTimers();
    clearSessionStorage();
    dispatch({ type: 'LOGOUT' });
  }, [clearTimers, clearSessionStorage]);

  const scheduleSessionExpiry = useCallback((expiresAt) => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
    }

    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      clearTimers();
      clearSessionStorage();
      dispatch({ type: 'LOGOUT' });
      return;
    }

    sessionTimerRef.current = setTimeout(() => {
      clearTimers();
      clearSessionStorage();
      dispatch({ type: 'LOGOUT' });
      alert('Your session has expired. Please log in again.');
    }, remainingMs);
  }, [clearTimers, clearSessionStorage]);

  const persistSession = useCallback((accessToken, user) => {
    const expiresAt = resolveExpiresAt(accessToken);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
    scheduleSessionExpiry(expiresAt);
  }, [scheduleSessionExpiry]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (state.isAuthenticated) {
      lastActivityRef.current = Date.now();

      inactivityTimerRef.current = setTimeout(() => {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          clearTimers();
          clearSessionStorage();
          dispatch({ type: 'LOGOUT' });
          alert('You have been logged out due to 1 hour of inactivity.');
        }
      }, INACTIVITY_TIMEOUT);
    }
  }, [state.isAuthenticated, clearTimers, clearSessionStorage]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      const storedExpiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_KEY));

      if (token && user) {
        try {
          const expiresAt = Number.isFinite(storedExpiresAt) && storedExpiresAt > 0
            ? storedExpiresAt
            : resolveExpiresAt(token);

          if (Date.now() >= expiresAt) {
            clearSessionStorage();
            dispatch({ type: 'LOGOUT' });
            return;
          }

          const userData = JSON.parse(user);
          localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
          scheduleSessionExpiry(expiresAt);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              access_token: token,
              user: userData,
            },
          });
        } catch {
          clearSessionStorage();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    };

    restoreSession();
  }, [clearSessionStorage, scheduleSessionExpiry]);

  // Track user activity
  useEffect(() => {
    if (!state.isAuthenticated) {
      clearTimers();
      return;
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      resetInactivityTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [state.isAuthenticated, resetInactivityTimer, clearTimers]);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
      persistSession(response.access_token, response.user);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response,
      });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw error;
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.register(userData);
      persistSession(response.access_token, response.user);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response,
      });
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw error;
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- context hook exported with provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
