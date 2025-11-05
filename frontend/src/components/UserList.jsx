import React from 'react';

const UserList = ({ users }) => {
  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Team Members</h3>
      
      {users.length === 0 ? (
        <p className="text-sm text-muted">No team members found</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-3">
              <div className="flex-shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500/15 text-primary-600">
                  <span className="text-sm font-semibold">
                    {user.first_name[0]}{user.last_name[0]}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.first_name} {user.last_name}
                </p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList;
