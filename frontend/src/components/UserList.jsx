import React from 'react';

const UserList = ({ users }) => {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h3>
      
      {users.length === 0 ? (
        <p className="text-gray-500 text-sm">No team members found</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">
                    {user.first_name[0]}{user.last_name[0]}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList;
