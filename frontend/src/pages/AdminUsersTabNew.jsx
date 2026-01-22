import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  Search, 
  UserCheck, 
  UserX, 
  Shield, 
  Calendar,
  CheckCircle,
  Eye
} from 'lucide-react';
import Modal, { ModalFooter, ModalButton } from "../components/Modal.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import { authHeaders } from "../services/api.js";

export default function AdminUsersTabNew() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal states
  const [userDetailsModal, setUserDetailsModal] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [userRsvps, setUserRsvps] = useState([]);
  const [banModal, setBanModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [newRole, setNewRole] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const headers = authHeaders();
    
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);
      
      const res = await axios.get(`/api/admin/users/search?${params}`, { headers });
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  const handleViewDetails = async (user) => {
    setUserDetailsModal(user);
    const headers = authHeaders();
    
    try {
      const [eventsRes, rsvpsRes] = await Promise.all([
        axios.get(`/api/admin/users/${user.id}/events`, { headers }),
        axios.get(`/api/admin/users/${user.id}/rsvps`, { headers }),
      ]);
      setUserEvents(eventsRes.data);
      setUserRsvps(rsvpsRes.data);
    } catch (error) {
      console.error("Failed to load user details:", error);
      toast.error("Failed to load user details");
    }
  };

  const handleBanToggle = async () => {
    if (!banModal) return;
    const headers = authHeaders();
    const newBannedStatus = !banModal.banned;
    
    try {
      await axios.patch(
        `/api/admin/users/${banModal.id}/ban`,
        { banned: newBannedStatus },
        { headers }
      );
      toast.success(newBannedStatus ? "User banned" : "User unbanned");
      setBanModal(null);
      loadUsers();
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user status");
    }
  };

  const handleRoleChange = async () => {
    if (!roleModal || !newRole) return;
    const headers = authHeaders();
    
    try {
      await axios.patch(
        `/api/admin/users/${roleModal.id}/role`,
        { role: newRole },
        { headers }
      );
      toast.success("User role updated");
      setRoleModal(null);
      setNewRole("");
      loadUsers();
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update user role");
    }
  };

  const roleBadge = (role) => {
    const colors = {
      ADMIN: "bg-purple-100 text-purple-800",
      ORGANIZER: "bg-blue-100 text-blue-800",
      STUDENT: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[role] || "bg-gray-100 text-gray-800"}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                loadUsers();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="ORGANIZER">Organizer</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                loadUsers();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <LoadingSkeleton type="table" count={5} />
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.name || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">{roleBadge(user.role)}</td>
                  <td className="px-6 py-4">
                    {user.banned ? (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        Banned
                      </span>
                    ) : user.active ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Active
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setBanModal(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.banned
                            ? "text-green-600 hover:bg-green-50"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                        title={user.banned ? "Unban User" : "Ban User"}
                      >
                        {user.banned ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setRoleModal(user);
                          setNewRole(user.role);
                        }}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Change Role"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details Modal */}
      <Modal
        isOpen={!!userDetailsModal}
        onClose={() => {
          setUserDetailsModal(null);
          setUserEvents([]);
          setUserRsvps([]);
        }}
        title="User Details"
        size="xl"
      >
        {userDetailsModal && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold text-gray-900">{userDetailsModal.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{userDetailsModal.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Role</p>
                  <div className="mt-1">{roleBadge(userDetailsModal.role)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">
                    {userDetailsModal.banned ? (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        Banned
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Created Events */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Created Events ({userEvents.length})
              </h3>
              {userEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No events created yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userEvents.map((event) => (
                    <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{event.title}</p>
                          <p className="text-sm text-gray-600">{event.category}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          event.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          event.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {event.approvalStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RSVPs */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                RSVP History ({userRsvps.length})
              </h3>
              {userRsvps.length === 0 ? (
                <p className="text-gray-500 text-sm">No RSVPs yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {userRsvps.map((rsvp) => (
                    <div key={rsvp.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-600">Event ID: {rsvp.eventId}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          rsvp.status === 'GOING' ? 'bg-green-100 text-green-800' :
                          rsvp.status === 'INTERESTED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {rsvp.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => {
            setUserDetailsModal(null);
            setUserEvents([]);
            setUserRsvps([]);
          }}>
            Close
          </ModalButton>
        </ModalFooter>
      </Modal>

      {/* Ban/Unban Modal */}
      <Modal
        isOpen={!!banModal}
        onClose={() => setBanModal(null)}
        title={banModal?.banned ? "Unban User" : "Ban User"}
        size="md"
      >
        <p className="text-gray-600">
          Are you sure you want to {banModal?.banned ? "unban" : "ban"}{" "}
          <span className="font-semibold">{banModal?.email}</span>?
        </p>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setBanModal(null)}>
            Cancel
          </ModalButton>
          <ModalButton
            variant={banModal?.banned ? "primary" : "danger"}
            onClick={handleBanToggle}
          >
            {banModal?.banned ? "Unban User" : "Ban User"}
          </ModalButton>
        </ModalFooter>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={!!roleModal}
        onClose={() => {
          setRoleModal(null);
          setNewRole("");
        }}
        title="Change User Role"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Change role for <span className="font-semibold">{roleModal?.email}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="USER">User</option>
              <option value="ORGANIZER">Organizer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => {
            setRoleModal(null);
            setNewRole("");
          }}>
            Cancel
          </ModalButton>
          <ModalButton variant="primary" onClick={handleRoleChange}>
            Update Role
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
