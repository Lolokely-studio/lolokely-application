import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Skeleton, SkeletonText } from './Skeleton';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate to task/subtask
    if (notification.related_task_id) {
      navigate('/dashboard');
      setIsOpen(false);
      // Scroll to task after a short delay to allow page to load
      setTimeout(() => {
        const taskElement = document.querySelector(`[data-task-id="${notification.related_task_id}"]`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          taskElement.classList.add('highlight-task');
          setTimeout(() => taskElement.classList.remove('highlight-task'), 2000);
        }
      }, 500);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200 focus:outline-none border"
        style={{
          background: 'var(--surface-card)',
          borderColor: 'var(--surface-card-border)',
          color: 'var(--text-primary)',
        }}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-700 dark:border-gray-200 bg-slate-900 dark:bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700 dark:border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-100 dark:text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 dark:text-primary-600 dark:hover:text-primary-700 transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div role="status" className="space-y-1 px-2 py-2">
                <span className="sr-only">Loading…</span>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-start gap-3 px-2 py-3">
                    <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonText lines={2} />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-slate-500 dark:text-gray-400" />
                <p className="text-sm text-slate-400 dark:text-gray-600">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700 dark:divide-gray-200">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 transition-colors hover:bg-white/10 dark:hover:bg-gray-100 ${
                      !notification.is_read ? 'bg-white/5 dark:bg-primary-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 h-2 w-2 rounded-full ${
                        !notification.is_read ? 'bg-primary-400 dark:bg-primary-600' : 'bg-transparent'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-slate-100 dark:text-gray-900' : 'text-slate-400 dark:text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

