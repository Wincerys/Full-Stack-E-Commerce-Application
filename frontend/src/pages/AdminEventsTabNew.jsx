import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Edit2, 
  Trash2,
  Calendar,
  MapPin,
  User,
  Clock
} from 'lucide-react';
import Modal, { ModalFooter, ModalButton } from "../components/Modal.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import { authHeaders } from "../services/api.js";

export default function AdminEventsTabNew() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modal states
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [statusFilter]);

  const loadEvents = async () => {
    setLoading(true);
    const headers = authHeaders();
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      
      const res = await axios.get(`/api/admin/events?${params}`, { headers });
      setEvents(res.data);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    const headers = authHeaders();
    
    try {
      await axios.post(`/api/admin/events/${approveModal.id}/approve`, {}, { headers });
      toast.success("Event approved successfully!");
      setApproveModal(null);
      loadEvents();
    } catch (error) {
      console.error("Failed to approve:", error);
      toast.error("Failed to approve event");
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const headers = authHeaders();
    
    try {
      await axios.post(
        `/api/admin/events/${rejectModal.id}/reject`,
        { reason: rejectionReason },
        { headers }
      );
      toast.success("Event rejected");
      setRejectModal(null);
      setRejectionReason("");
      loadEvents();
    } catch (error) {
      console.error("Failed to reject:", error);
      toast.error("Failed to reject event");
    }
  };

  const handleEdit = async (updatedEvent) => {
    if (!editModal) return;
    const headers = authHeaders();
    
    try {
      await axios.put(
        `/api/admin/events/${editModal.id}`,
        {
          title: updatedEvent.title,
          description: updatedEvent.description,
          startTime: updatedEvent.startTime,
          location: updatedEvent.location,
          category: updatedEvent.category,
        },
        { headers }
      );
      toast.success("Event updated successfully!");
      setEditModal(null);
      loadEvents();
    } catch (error) {
      console.error("Failed to update:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const headers = authHeaders();
    
    try {
      await axios.delete(`/api/admin/events/${deleteModal.id}`, { headers });
      toast.success("Event deleted");
      setDeleteModal(null);
      loadEvents();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete event");
    }
  };

  const filteredEvents = events.filter((event) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.title?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  });

  const statusBadge = (status) => {
    const colors = {
      APPROVED: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
        <p className="text-gray-600 mt-1">Approve, reject, edit, or delete events</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter("")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === "" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === "PENDING" ? "bg-yellow-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter("APPROVED")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === "APPROVED" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === "REJECTED" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Rejected
            </button>
          </div>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <LoadingSkeleton type="card" count={3} />
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Event Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">{event.title}</h3>
                    {statusBadge(event.approvalStatus)}
                  </div>

                  <p className="text-gray-600 line-clamp-2">{event.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.startTime).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {event.organizerEmail}
                    </div>
                  </div>

                  {event.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        <span className="font-semibold">Rejection Reason:</span> {event.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2">
                  {event.approvalStatus === "PENDING" && (
                    <>
                      <button
                        onClick={() => setApproveModal(event)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectModal(event)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setEditModal(event)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteModal(event)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Approve Event"
        size="md"
      >
        <p className="text-gray-600">
          Are you sure you want to approve <span className="font-semibold">{approveModal?.title}</span>? 
          This event will be visible to all users.
        </p>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setApproveModal(null)}>
            Cancel
          </ModalButton>
          <ModalButton variant="primary" onClick={handleApprove}>
            Approve Event
          </ModalButton>
        </ModalFooter>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectionReason("");
        }}
        title="Reject Event"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Rejecting <span className="font-semibold">{rejectModal?.title}</span>. 
            Optionally provide a reason for rejection:
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection (optional)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows={4}
          />
        </div>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => {
            setRejectModal(null);
            setRejectionReason("");
          }}>
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={handleReject}>
            Reject Event
          </ModalButton>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      {editModal && (
        <EditEventModal
          event={editModal}
          onClose={() => setEditModal(null)}
          onSave={handleEdit}
        />
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Event"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">⚠️ Warning: This action cannot be undone</p>
          </div>
          <p className="text-gray-600">
            Are you sure you want to permanently delete <span className="font-semibold">{deleteModal?.title}</span>? 
            All associated RSVPs and photos will also be deleted.
          </p>
        </div>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setDeleteModal(null)}>
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={handleDelete}>
            Delete Permanently
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function EditEventModal({ event, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: event.title || "",
    description: event.description || "",
    startTime: event.startTime ? event.startTime.slice(0, 16) : "",
    location: event.location || "",
    category: event.category || "",
  });

  const toLocalInputValue = (d) => {
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (new Date(formData.startTime) <= new Date()) {
      alert("Please choose a future date & time.");
      return;
    }
    onSave({
      ...formData,
      startTime: new Date(formData.startTime).toISOString(),
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Event" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min={toLocalInputValue(new Date())}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select category</option>
              <option value="academic">Academic</option>
              <option value="social">Social</option>
              <option value="sports">Sports</option>
              <option value="cultural">Cultural</option>
              <option value="workshop">Workshop</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <ModalFooter>
          <ModalButton variant="secondary" onClick={onClose} type="button">
            Cancel
          </ModalButton>
          <ModalButton variant="primary" type="submit">
            Save Changes
          </ModalButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
