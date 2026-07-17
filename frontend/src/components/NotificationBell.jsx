import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, FileSpreadsheet, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/api';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';
import { gsap } from 'gsap';

const NotificationBell = () => {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    // Reset stale state when user changes (logout/login on same browser)
    setNotifications([]);
    setUnreadCount(0);
    if (!user?.id) return;

    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    // Handle click outside to close dropdown
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

  useEffect(() => {
    // Animate dropdown when opened
    if (isOpen && dropdownRef.current) {
      gsap.fromTo(
        dropdownRef.current,
        { 
          opacity: 0, 
          y: -10,
          scale: 0.95
        },
        { 
          opacity: 1, 
          y: 0,
          scale: 1,
          duration: 0.2,
          ease: 'power2.out'
        }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    // Animate bell when new notification arrives
    if (unreadCount > 0 && bellRef.current) {
      gsap.fromTo(
        bellRef.current,
        { rotation: 0 },
        { 
          rotation: 15,
          duration: 0.1,
          yoyo: true,
          repeat: 5,
          ease: 'power1.inOut'
        }
      );
    }
  }, [unreadCount]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationService.delete(notificationId);
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      setNotifications(notifications.filter(n => n.id !== notificationId));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <Check className="text-green-500" size={20} />;
      case 'error':
        return <X className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500" size={20} />;
      default:
        return <FileSpreadsheet className="text-blue-500" size={20} />;
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={24} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-2 opacity-20" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? (
                        notification.metadata?.action_required ? 'bg-amber-50' : 'bg-blue-50'
                      ) : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTime(notification.created_at)}
                            </p>
                            {notification.metadata?.action_required && notification.metadata?.action_url && (
                              <button
                                onClick={() => {
                                  navigate('/upload-approvals');
                                  setIsOpen(false);
                                  handleMarkAsRead(notification.id);
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors"
                              >
                                <ExternalLink size={12} />
                                Review &amp; Approve
                              </button>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            {!notification.read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-1 rounded hover:bg-gray-200 transition-colors"
                                title="Mark as read"
                              >
                                <Check size={16} className="text-gray-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-1 rounded hover:bg-red-100 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;