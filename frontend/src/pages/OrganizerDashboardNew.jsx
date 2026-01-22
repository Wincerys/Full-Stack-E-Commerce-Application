import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Toaster } from 'react-hot-toast';
import { 
  Calendar, 
  MapPin, 
  Edit2, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Plus
} from 'lucide-react';
import Modal, { ModalFooter, ModalButton } from "../components/Modal.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import { authHeaders, isAuthed } from "../services/api.js";

export default function OrganizerDashboardNew() {
  const nav = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(null);

  useEffect(() => {
    if (!isAuthed()) {
      nav("/login");
      return;
    }
    loadMyEvents();
  }, [nav]);

  const loadMyEvents = async () => {
    setLoading(true);
    const headers = authHeaders();
    
    try {
      const res = await axios.get("/api/events/my-events", { headers });
      setEvents(res.data);
    } catch (error) {
      console.error("Failed to load events:", error);
      toast.error("Failed to load your events");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const headers = authHeaders();
    
    try {
      await axios.delete(`/api/events/${deleteModal.id}`, { headers });
      toast.success("Event deleted successfully");
      setDeleteModal(null);
      loadMyEvents();
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleEdit = async (updatedEvent) => {
    if (!editModal) return;
    const headers = authHeaders();
    
    try {
      await axios.put(
        `/api/events/${editModal.id}`,
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
      loadMyEvents();
    } catch (error) {
      console.error("Failed to update:", error);
      toast.error("Failed to update event");
    }
  };

  const filteredEvents = events.filter((event) => {
    if (statusFilter === "all") return true;
    return event.approvalStatus === statusFilter.toUpperCase();
  });

  const statusBadge = (status) => {
    const config = {
      APPROVED: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle },
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
      REJECTED: { bg: "bg-red-100", text: "text-red-800", icon: XCircle },
    };
    const { bg, text, icon: Icon } = config[status] || config.PENDING;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const canEdit = (event) => event.approvalStatus === "PENDING";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Events</h1>
          <p className="text-gray-600">Manage your created events and track their approval status</p>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({events.length})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === "pending" ? "bg-yellow-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Pending ({events.filter(e => e.approvalStatus === "PENDING").length})
              </button>
              <button
                onClick={() => setStatusFilter("approved")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === "approved" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Approved ({events.filter(e => e.approvalStatus === "APPROVED").length})
              </button>
              <button
                onClick={() => setStatusFilter("rejected")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === "rejected" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Rejected ({events.filter(e => e.approvalStatus === "REJECTED").length})
              </button>
            </div>

            <button
              onClick={() => nav("/create")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Create New Event
            </button>
          </div>
        </div>

        {/* Events List */}
        {loading ? (
          <LoadingSkeleton type="card" count={3} />
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === "all" ? "No events yet" : `No ${statusFilter} events`}
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter === "all"
                ? "Create your first event to get started"
                : "Try changing the filter or create a new event"}
            </p>
            <button
              onClick={() => nav("/create")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Your First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Event Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <h3 className="text-xl font-semibold text-gray-900 flex-1">{event.title}</h3>
                        {statusBadge(event.approvalStatus)}
                      </div>

                      {event.description && (
                        <p className="text-gray-600 line-clamp-2">{event.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.startTime).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                        <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {event.category}
                        </div>
                      </div>

                      {/* Status-specific messages */}
                      {event.approvalStatus === "PENDING" && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-900">Awaiting Admin Approval</p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Your event is under review. You can edit or delete it while pending.
                            </p>
                          </div>
                        </div>
                      )}

                      {event.approvalStatus === "APPROVED" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Event Approved!</p>
                            <p className="text-xs text-green-700 mt-1">
                              Your event is now visible to all users.
                            </p>
                          </div>
                        </div>
                      )}

                      {event.approvalStatus === "REJECTED" && event.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Event Rejected</p>
                            <p className="text-xs text-red-700 mt-1">
                              <span className="font-semibold">Reason:</span> {event.rejectionReason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2">
                      {canEdit(event) && (
                        <button
                          onClick={() => setEditModal(event)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                      {canEdit(event) && (
                        <button
                          onClick={() => setDeleteModal(event)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                      {!canEdit(event) && (
                        <p className="text-sm text-gray-500 italic">
                          {event.approvalStatus === "APPROVED"
                            ? "Contact admin to edit"
                            : "Cannot edit rejected events"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-semibold">⚠️ This action cannot be undone</p>
          </div>
          <p className="text-gray-600">
            Are you sure you want to delete <span className="font-semibold">{deleteModal?.title}</span>? 
            All associated data will be permanently removed.
          </p>
        </div>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setDeleteModal(null)}>
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={handleDelete}>
            Delete Event
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

  // Helper to format now as datetime-local min
  const toLocalInputValue = (d) => {
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Client-side guard: disallow past date/time
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
