import React from 'react';

const UserList = ({ users }) => {
  return (
    <div className="card h-full flex flex-col min-h-0 overflow-hidden">
      <h3 className="mb-3 text-base sm:text-lg font-semibold text-foreground shrink-0">Team Members</h3>
      {users.length === 0 ? (
        <p className="text-sm text-muted shrink-0">No team members found</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 sm:space-y-3 -mr-1 pr-1">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2 sm:gap-3 rounded-xl bg-surface px-2.5 sm:px-3 py-2.5 sm:py-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-primary-500/15 text-primary-600">
                  <span className="text-xs sm:text-sm font-semibold">
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
