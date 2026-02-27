import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { useNavigate } from 'react-router-dom';
import { rolesApi, type PaginatedUsers } from '../services/rolesApi';
import type { User } from '../services/authApi';

function RoleManagementPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAppSelector((state) => state.auth);

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect non-IT-Admin users
  useEffect(() => {
    if (currentUser && currentUser.role !== 'it_admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await rolesApi.listUsers(page, limit);
      const data = response.data as PaginatedUsers;
      setUsers(data.users);
      setTotal(data.total);
    } catch {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    if (currentUser?.role === 'it_admin') {
      fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setError('');
    setSuccessMsg('');
    try {
      const response = await rolesApi.assignRole(userId, newRole);
      setSuccessMsg(response.data.message);
      fetchUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Failed to update role');
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'c_suite':
        return 'C-Suite';
      case 'compliance_officer':
        return 'Compliance Officer';
      case 'it_admin':
        return 'IT Admin';
      default:
        return role;
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'c_suite':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'compliance_officer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'it_admin':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (!currentUser || currentUser.role !== 'it_admin') {
    return null;
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Role Management
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading users...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Current Role
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Verified
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Change Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${roleBadgeColor(u.role)}`}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {u.isVerified ? (
                        <span className="text-green-600 dark:text-green-400">Yes</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.id === currentUser.id ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          Cannot change own role
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="c_suite">C-Suite</option>
                          <option value="compliance_officer">Compliance Officer</option>
                          <option value="it_admin">IT Admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} users
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RoleManagementPage;
