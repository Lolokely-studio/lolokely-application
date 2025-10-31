import React, { useState } from 'react';

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last || '?';
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const tooltipSizeClasses = {
    sm: 'bottom-full mb-1 px-2 py-1 text-xs',
    md: 'bottom-full mb-2 px-2 py-1 text-sm',
    lg: 'bottom-full mb-2 px-3 py-1.5 text-sm',
  };

  const name = user.first_name || user.firstName 
    ? `${user.first_name || user.firstName} ${user.last_name || user.lastName || ''}`.trim()
    : user.email || 'Unknown User';

  const email = user.email || '';

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          bg-gradient-to-br from-blue-500 to-purple-600 
          text-white 
          font-semibold 
          flex items-center justify-center
          cursor-pointer
          border-2 border-white
          shadow-sm
          hover:shadow-md
          transition-shadow
        `}
        title={name}
      >
        {getInitials(user.first_name || user.firstName, user.last_name || user.lastName)}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`
            absolute 
            ${tooltipSizeClasses[size]}
            left-1/2 
            -translate-x-1/2
            bg-gray-900 
            text-white 
            rounded-md 
            shadow-lg
            z-50
            whitespace-nowrap
            pointer-events-none
            animate-fade-in
          `}
        >
          <div className="font-medium">{name}</div>
          {email && (
            <div className="text-xs text-gray-300 mt-0.5">{email}</div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;

