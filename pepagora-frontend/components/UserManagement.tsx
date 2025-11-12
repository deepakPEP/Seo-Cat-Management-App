'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axiosInstance';
import { TbEdit, TbTrash, TbUserPlus, TbSearch, TbUsers } from 'react-icons/tb';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { FiSearch, FiUserPlus, FiMail, FiUser, FiShield } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Sidebar from './Sidebar';

type UserRole = 'admin' | 'category_manager' | 'pepagora_manager';

interface User {
  _id: string;
  email: string;
  username: string;
  role: UserRole;
}

export default function UserManagement() {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/auth/users');
      setUsers(res.data?.data || res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setDeleting(id);
      await axios.delete(`/auth/users/${id}`);
      toast.success('User deleted successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user', error);
      toast.error('Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const updateUser = async (id: string, updatedData: Pick<User, 'email' | 'username' | 'role'>) => {
    try {
      const payload = {
        email: updatedData.email,
        username: updatedData.username,
        role: updatedData.role,
      };
      await axios.put(`/auth/users/${id}`, payload);
      toast.success('User updated successfully');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update user', error);
      toast.error('Failed to update user');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { color: 'bg-red-100 text-red-800 border-red-200', icon: '👑', label: 'Admin' };
      case 'category_manager':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📁', label: 'Category Manager' };
      case 'pepagora_manager':
        return { color: 'bg-green-100 text-green-800 border-green-200', icon: '🏢', label: 'Pepagora Manager' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '👤', label: role };
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-10' : 'ml-10'} overflow-y-auto`}>
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
          {/* Enhanced Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <TbUsers className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                  <p className="text-slate-600 mt-1">Manage your team members and their permissions</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {users.length} Total Users
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filters */}
          <div className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <TbSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or email..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-slate-50 focus:bg-white"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-sm text-slate-600">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-slate-600 text-lg">Loading users...</span>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-slate-100 rounded-full">
                  <TbUsers className="w-12 h-12 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No users found</h3>
                  <p className="text-slate-600">
                    {searchQuery ? 'Try adjusting your search criteria' : 'No users have been added yet'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <th className="w-1/3 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                        User
                      </th>
                      <th className="w-1/3 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="w-1/6 px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="w-1/6 px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user, index) => {
                      const roleInfo = getRoleInfo(user.role);
                      return (
                        <tr
                          key={user._id}
                          className="hover:bg-slate-50/50 transition-colors duration-200 group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 truncate">{user.username}</div>
                                <div className="text-xs text-slate-500 truncate">User ID: {user._id.slice(-6)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2 min-w-0">
                              <FiMail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-700 truncate">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${roleInfo.color}`}>
                              <span>{roleInfo.icon}</span>
                              <span className="hidden sm:inline">{roleInfo.label}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => setEditUser(user)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all duration-200 hover:scale-105 group flex-shrink-0"
                                title="Edit User"
                              >
                                <TbEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteUser(user._id)}
                                disabled={deleting === user._id}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                title="Delete User"
                              >
                                {deleting === user._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                                ) : (
                                  <TbTrash className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Enhanced Edit Modal */}
          {editUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all duration-300 scale-100">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <TbEdit className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Edit User</h2>
                        <p className="text-blue-100 text-sm">Update user information and permissions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditUser(null)}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await updateUser(editUser._id, editUser);
                    setEditUser(null);
                  }}
                  className="p-8 space-y-6"
                >
                  {/* Username Field */}
                  <div className="group">
                    <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors group-focus-within:text-blue-600">
                      <FiUser className="inline w-4 h-4 mr-2" />
                      Username *
                    </label>
                    <input
                      type="text"
                      value={editUser.username}
                      onChange={(e) =>
                        setEditUser({ ...editUser, username: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-slate-50 focus:bg-white"
                      placeholder="Enter username"
                      required
                    />
                  </div>

                  {/* Email Field */}
                  <div className="group">
                    <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors group-focus-within:text-blue-600">
                      <FiMail className="inline w-4 h-4 mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={editUser.email}
                      onChange={(e) =>
                        setEditUser({ ...editUser, email: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-slate-50 focus:bg-white"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  {/* Role Field */}
                  <div className="group">
                    <label className="block text-sm font-bold text-slate-700 mb-3 transition-colors group-focus-within:text-blue-600">
                      <FiShield className="inline w-4 h-4 mr-2" />
                      User Role *
                    </label>
                    <select
                      value={editUser.role}
                      onChange={(e) =>
                        setEditUser({ ...editUser, role: e.target.value as UserRole })
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 bg-slate-50 focus:bg-white appearance-none cursor-pointer"
                    >
                      <option value="admin">👑 Admin - Full Access</option>
                      <option value="category_manager">📁 Category Manager - Manage Categories</option>
                      <option value="pepagora_manager">🏢 Pepagora Manager - General Management</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditUser(null)}
                      className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <TbEdit className="w-4 h-4" />
                      Update User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
