import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEvent,
  getMyRsvps,
  rsvpEvent,
  cancelRsvpByEvent,
  deleteEvent,
  updateEvent,
  listPhotos,
  uploadPhotos,
  deletePhoto,
  listCategories,
  isAuthed,
  createOrUpdateFeedback,
  getMyFeedback,
  listEventFeedback,
  currentUserEmail,
  getAuthRole,
} from "../services/api";
import { useEffect, useState, useCallback, useMemo } from "react";
// StaticMap removed per request; no map preview.

export default function EventDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const authed = isAuthed();
  const role = getAuthRole(); // "STUDENT" | "ORGANIZER" | "ADMIN" | null
  const isStudent = role === "STUDENT";
  const isAdmin = role === "ADMIN";

  const { data: ev, isLoading: evLoading, error: evError } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEvent(id),
  });

  const { data: myRsvps = [] } = useQuery({
    queryKey: ["my-rsvps"],
    queryFn: getMyRsvps,
    enabled: authed,
  });

  const { data: photos = [], isFetching: photosFetching } = useQuery({
    queryKey: ["photos", id],
    queryFn: () => listPhotos(id),
  });

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  const myForThisEvent = (myRsvps || []).find((r) => r.eventId === id) || null;
  const myStatus = myForThisEvent?.status || null;

  const upsertMutation = useMutation({
    mutationFn: ({ status }) => rsvpEvent(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-rsvps"] });
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelRsvpByEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-rsvps"] });
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      nav("/");
    },
  });
  const updateMutation = useMutation({
    mutationFn: (payload) => updateEvent(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", id] });
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setIsEditing(false);
    },
  });
  const uploadMutation = useMutation({
    mutationFn: (files) => uploadPhotos(id, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos", id] });
    },
  });
  const deletePhotoMutation = useMutation({
    mutationFn: (photoId) => deletePhoto(photoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos", id] });
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    dateTimeISO: "",
    location: "",
    category: "",
  });

  const [categoryMode, setCategoryMode] = useState("existing");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (!ev) return;
    setForm({
      title: ev.title || "",
      description: ev.description || "",
      dateTimeISO: toLocalInputValue(ev.startTime),
      location: ev.location || "",
      category: ev.category || "",
    });
  }, [ev]);

  const onEditToggle = () => {
    if (!authed) {
      alert("Please login to edit events.");
      return;
    }
    const next = !isEditing;
    setIsEditing(next);
    if (!next) return;
    const current = ev?.category || "";
    if (current && categories.includes(current)) {
      setCategoryMode("existing");
      setSelectedCategory(current);
      setNewCategory("");
    } else if (current) {
      setCategoryMode("new");
      setNewCategory(current);
      setSelectedCategory("");
    } else {
      setCategoryMode("existing");
      setSelectedCategory(categories[0] || "");
      setNewCategory("");
    }
  };

  const onDelete = () => {
    if (!authed) {
      alert("Please login to delete events.");
      return;
    }
    if (confirm("Delete this event? This cannot be undone.")) {
      deleteMutation.mutate(undefined, {
        onError: (e) => alert(e?.message || "Failed to delete."),
      });
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onCategorySelect = (e) => {
    const val = e.target.value;
    if (val === "__NEW__") {
      setCategoryMode("new");
      setNewCategory("");
    } else {
      setCategoryMode("existing");
      setSelectedCategory(val);
    }
  };

  const onSave = (e) => {
    e.preventDefault();
    if (!authed) {
      alert("Please login to save changes.");
      return;
    }
    if (new Date(form.dateTimeISO) <= new Date()) {
      alert("Please choose a future date & time.");
      return;
    }
    const finalCategory =
      categoryMode === "new" ? newCategory.trim() : selectedCategory.trim();
    if (!form.title || !form.dateTimeISO || !form.location || !finalCategory) {
      alert("Please fill Title, Date & Time, Location, and Category.");
      return;
    }
    updateMutation.mutate(
      {
        title: form.title,
        description: form.description,
        dateTimeISO: form.dateTimeISO,
        location: form.location,
        category: finalCategory,
      },
      {
        onError: (e) => alert(e?.message || "Failed to update event."),
      }
    );
  };

  const [files, setFiles] = useState([]);
  const onPickFiles = (e) => {
    const chosen = Array.from(e.target.files || []);
    setFiles(chosen);
  };
  const onUpload = () => {
    if (!authed) {
      alert("Please login to upload photos.");
      return;
    }
    if (!canManagePhotos) {
      alert("Only the organizer or an admin can upload photos.");
      return;
    }
    if (!files.length) return;
    for (const f of files) {
      if (!["image/jpeg", "image/png"].includes(f.type)) {
        alert("Only JPEG/PNG allowed.");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        alert("Image too large (max 10MB).");
        return;
      }
    }
    uploadMutation.mutate(files, {
      onError: (e) => alert(e?.message || "Upload failed."),
    });
    setFiles([]);
  };

  const [lightboxIdx, setLightboxIdx] = useState(-1);
  const isLightboxOpen = lightboxIdx >= 0;
  const openLightbox = (idx) => setLightboxIdx(idx);
  const closeLightbox = useCallback(() => setLightboxIdx(-1), []);
  const nextLightbox = useCallback(() => {
    if (photos.length === 0) return;
    setLightboxIdx((i) => (i + 1) % photos.length);
  }, [photos.length]);
  const prevLightbox = useCallback(() => {
    if (photos.length === 0) return;
    setLightboxIdx((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") nextLightbox();
      else if (e.key === "ArrowLeft") prevLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLightboxOpen, closeLightbox, nextLightbox, prevLightbox]);

  const eventEnded = useMemo(() => {
    if (!ev?.startTime) return false;
    return new Date(ev.startTime) < new Date();
  }, [ev]);

  const isOrganizerClientSide = useMemo(() => {
    if (!ev || !authed) return false;
    const me = currentUserEmail();
    if (!me || !ev.organizerEmail) return false;
    return me.toLowerCase() === ev.organizerEmail.toLowerCase();
  }, [ev, authed]);

  const canEdit = authed && !isStudent && (isAdmin || isOrganizerClientSide);
  const canDelete = authed && !isStudent && (isAdmin || isOrganizerClientSide);
  const canManagePhotos = !isStudent && (isAdmin || isOrganizerClientSide);
  const canExport = (isAdmin || isOrganizerClientSide); // optional: let admins export too

  const { data: myFeedback } = useQuery({
    queryKey: ["my-feedback", id],
    queryFn: () => getMyFeedback(id),
    enabled: authed && Boolean(ev),
  });

  const { data: eventFeedback = [] } = useQuery({
    queryKey: ["event-feedback", id],
    queryFn: () => listEventFeedback(id),
    enabled: isOrganizerClientSide,
  });

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (myFeedback) {
      setStars(myFeedback.rating || 0);
      setComment(myFeedback.comment || "");
    }
  }, [myFeedback]);

  const feedbackMutation = useMutation({
    mutationFn: ({ rating, comment }) =>
      createOrUpdateFeedback({ eventId: id, rating, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-feedback", id] });
      if (isOrganizerClientSide) qc.invalidateQueries({ queryKey: ["event-feedback", id] });
      setToast({ kind: "ok", msg: "Feedback submitted" });
    },
    onError: (e) => {
      setToast({ kind: "err", msg: e?.message || "Failed to submit feedback" });
    },
  });

  const [shareMsg, setShareMsg] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const onShare = async () => {
    const url = `${window.location.origin}/events/${id}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMsg("Link copied to clipboard!");
        setShareLink(null);
      } else {
        setShareMsg("Clipboard not supported. Copy manually:");
        setShareLink(url);
      }
    } catch {
      setShareMsg("Couldn’t copy link. Copy manually:");
      setShareLink(url);
    }
  };

  const [exportPending, setExportPending] = useState(false);
  const onExportAttendees = async () => {
    if (!ev) return;
    setExportPending(true);
    try {
      const res = await fetch(`/api/events/${id}/attendees/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      });
      if (res.status === 204) {
        setShareMsg("No attendees to export");
        setShareLink(null);
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Export failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeTitle = (ev.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.href = url;
      a.download = `attendees-${safeTitle}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setShareMsg(e.message || "Export failed");
      setShareLink(null);
    } finally {
      setExportPending(false);
    }
  };

  if (evLoading)
    return (
      <section className="container">
        <p className="badge">Loading event…</p>
      </section>
    );
  if (evError || !ev)
    return (
      <section className="container">
        <p className="badge">Event not found.</p>
      </section>
    );

  return (
    <section className="container">
  <p><Link to="/events">← Back to events</Link></p>
      <article className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          {isEditing ? <h1 className="m-0">Edit Event</h1> : <h1 className="m-0">{ev.title}</h1>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn"
              onClick={onShare}
              disabled={deleteMutation.isPending || updateMutation.isPending}
            >
              Share
            </button>
            {canExport && (
              <button
                className="btn"
                onClick={onExportAttendees}
                disabled={exportPending || deleteMutation.isPending || updateMutation.isPending}
                title="Download attendee list as CSV"
              >
                {exportPending ? "Exporting…" : "Export Attendees"}
              </button>
            )}
            {!isEditing && canEdit && (
              <button
                className="btn"
                onClick={onEditToggle}
                disabled={deleteMutation.isPending || upsertMutation.isPending || cancelMutation.isPending}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button className="btn btn--danger" onClick={onDelete} disabled={deleteMutation.isPending || updateMutation.isPending}>
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={onSave} style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <Field label="Title" required>
              <input name="title" className="input" value={form.title} onChange={onChange} required />
            </Field>

            <Field label="Description">
              <textarea name="description" className="textarea" rows={4} value={form.description} onChange={onChange} />
            </Field>

            <Field label="Date & Time" required>
              <input type="datetime-local" name="dateTimeISO" className="input" value={form.dateTimeISO} onChange={onChange} required min={(() => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); })()} />
            </Field>

            <Field label="Location" required>
              <input name="location" className="input" value={form.location} onChange={onChange} required />
            </Field>

            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 14, color: "#444" }}>
                Category <span style={{ color: "#c00" }}>*</span>
              </span>

              {categoryMode === "existing" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="input"
                    value={selectedCategory}
                    onChange={onCategorySelect}
                    style={{ maxWidth: 360 }}
                  >
                    {categories.length === 0 && <option value="">(No categories yet)</option>}
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__NEW__">+ Create new category…</option>
                  </select>
                  <button type="button" className="btn" onClick={() => setCategoryMode("new")}>
                    Create new
                  </button>
                  <button type="button" className="btn" onClick={() => refetchCategories()} title="Refresh categories">
                    Refresh
                  </button>
                </div>
              )}

              {categoryMode === "new" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    className="input"
                    placeholder="e.g., Campus, Tech, Social"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ maxWidth: 360 }}
                  />
                  <button type="button" className="btn" onClick={() => setCategoryMode("existing")}>
                    Choose existing
                  </button>
                </div>
              )}
            </div>

            <div className="gallery__uploader">
              <strong>Gallery uploads</strong>
              <div className="card__meta" style={{ marginTop: 4 }}>
                Upload JPEG/PNG up to 10MB each. (Only organizer/admin can upload/delete.)
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <input type="file" accept="image/png, image/jpeg" multiple onChange={onPickFiles} />
                <button className="btn btn--primary" type="button" onClick={onUpload} disabled={uploadMutation.isPending || files.length === 0}>
                  {uploadMutation.isPending ? "Uploading…" : "Upload"}
                </button>
                {files.length > 0 && <span className="badge">{files.length} file(s) selected</span>}
                {uploadMutation.isError && (
                  <span className="badge" style={{ color: "#c00" }}>
                    {(uploadMutation.error && uploadMutation.error.message) || "Upload failed"}
                  </span>
                )}
                {photosFetching && <span className="badge">Refreshing…</span>}
              </div>
            </div>

            {updateMutation.isError && (
              <div style={{ color: "#c00", fontSize: 14 }}>
                {(updateMutation.error && updateMutation.error.message) || "Failed to update event."}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn--primary" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn" onClick={onEditToggle}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="card__meta">
              <strong>When:</strong> {new Date(ev.startTime).toLocaleString()} · <strong>Where:</strong> {ev.location} · <strong>Category:</strong> {ev.category}
            </div>
            <p className="card__desc" style={{ marginTop: 12 }}>{ev.description}</p>

            {/* Map preview removed */}

            {/* RSVP actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              {eventEnded ? (
                <>
                  <span className="badge">Event ended — RSVP closed</span>
                  {authed && (
                    <span className={`badge ${myStatus === "GOING" ? "badge--ok" : myStatus ? "badge--warm" : ""}`}>
                      {myStatus ? `Your status: ${myStatus}` : "You didn’t RSVP"}
                    </span>
                  )}
                </>
              ) : authed ? (
                <>
                  <button className="btn btn--primary" disabled={upsertMutation.isPending || cancelMutation.isPending || deleteMutation.isPending} onClick={() => upsertMutation.mutate({ status: "GOING" })}>
                    {upsertMutation.isPending ? "Saving…" : "I’m going"}
                  </button>
                  <button className="btn" disabled={upsertMutation.isPending || cancelMutation.isPending || deleteMutation.isPending} onClick={() => upsertMutation.mutate({ status: "INTERESTED" })}>
                    Interested
                  </button>
                  {myStatus && (
                    <button className="btn btn--danger" disabled={upsertMutation.isPending || cancelMutation.isPending || deleteMutation.isPending} onClick={() => cancelMutation.mutate()}>
                      {cancelMutation.isPending ? "Cancelling…" : "Cancel"}
                    </button>
                  )}
                  <span className={`badge ${myStatus === "GOING" ? "badge--ok" : myStatus ? "badge--warm" : ""}`}>
                    {myStatus ? `Your status: ${myStatus}` : "No RSVP yet"}
                  </span>
                </>
              ) : (
                <Link className="btn btn--primary" to="/login">Login to RSVP</Link>
              )}

              {upsertMutation.isError && !eventEnded && (
                <span className="badge" style={{ color: "#c00" }}>
                  {upsertMutation.error?.message || "Failed"}
                </span>
              )}
              {cancelMutation.isError && !eventEnded && (
                <span className="badge" style={{ color: "#c00" }}>
                  {cancelMutation.error?.message || "Failed"}
                </span>
              )}
            </div>

            {shareMsg && (
              <div className="card card--sub" style={{ marginTop: 12 }}>
                <p className="m-0">{shareMsg}</p>
                {shareLink && (
                  <div
                    className="input"
                    style={{
                      marginTop: 6,
                      padding: "6px 10px",
                      fontSize: 14,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {shareLink}
                  </div>
                )}
              </div>
            )}

            {authed && eventEnded && !!myForThisEvent && (
              <section className="card card--sub feedback" style={{ marginTop: 12 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <h3 className="m-0">Rate this event</h3>
                  <p className="muted m-0">Share a rating (1–5) and an optional comment.</p>
                </div>
                {toast && (
                  <div className={`toast ${toast.kind === "ok" ? "toast--ok" : "toast--err"}`}>
                    {toast.msg}
                  </div>
                )}
                <form
                  className="feedback__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!stars || stars < 1 || stars > 5) {
                      setToast({ kind: "err", msg: "Please choose 1–5 stars" });
                      return;
                    }
                    feedbackMutation.mutate({ rating: stars, comment });
                  }}
                >
                  <label className="field">
                    <span className="field__label">Rating</span>
                    <StarPicker value={stars} onChange={setStars} />
                  </label>
                  <label className="field">
                    <span className="field__label">Comment (optional)</span>
                    <textarea
                      className="textarea"
                      rows={3}
                      maxLength={1000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What went well? What could be improved?"
                    />
                  </label>
                  <div className="btn-row">
                    <button
                      type="submit"
                      className="btn btn--primary"
                      disabled={feedbackMutation.isPending}
                    >
                      {feedbackMutation.isPending ? "Submitting…" : (myFeedback ? "Update feedback" : "Submit feedback")}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {authed && !eventEnded && (
              <p className="muted" style={{ marginTop: 8 }}>Feedback opens after the event.</p>
            )}

            {isOrganizerClientSide && (
              <section className="card card--sub feedback-list" style={{ marginTop: 12 }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <h3 className="m-0">Feedback (Organizer view)</h3>
                  <p className="muted m-0">Newest first</p>
                </div>
                {eventFeedback.length === 0 ? (
                  <div className="empty">No feedback yet.</div>
                ) : (
                  <div className="feedback-list__grid">
                    {eventFeedback.map((fb) => (
                      <div key={fb.id} className="feedback-item">
                        <div className="feedback-item__head">
                          <span className="muted">{new Date(fb.createdAt).toLocaleString()}</span>
                          <span className="dot">•</span>
                          <span>{fb.userName || fb.userEmail}</span>
                        </div>
                        <div className="feedback-item__stars">
                          {"★".repeat(fb.rating)}{" "}
                          {"☆".repeat(5 - fb.rating)}
                        </div>
                        {fb.comment && <p className="m-0">{fb.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <h3 style={{ marginTop: 18 }}>Gallery</h3>
        <div className="gallery-grid gallery-grid--large">
          {photos.map((p, idx) => (
            <figure key={p.id} className="gallery-item">
              <button className="gallery-thumb gallery-thumb--button" onClick={() => openLightbox(idx)} aria-label="View photo">
                <img src={p.url} alt={p.originalFilename || "photo"} />
              </button>
              <figcaption className="gallery-caption">
                <span title={p.originalFilename} className="gallery-name">{p.originalFilename}</span>
                {isEditing && canManagePhotos && (
                  <button
                    className="btn btn--danger btn--xs"
                    onClick={() => {
                      if (confirm("Delete this photo?")) deletePhotoMutation.mutate(p.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
          {photos.length === 0 && <div className="empty">No photos yet.</div>}
        </div>
      </article>

      {isLightboxOpen && photos[lightboxIdx] && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={closeLightbox}>
          <div className="lightbox__inner" onClick={(e) => e.stopPropagation()}>
            <img className="lightbox__img" src={photos[lightboxIdx].url} alt={photos[lightboxIdx].originalFilename || "photo"} />
            <div className="lightbox__controls">
              <button className="btn" onClick={prevLightbox} aria-label="Previous">←</button>
              <button className="btn" onClick={closeLightbox} aria-label="Close">Close</button>
              <button className="btn" onClick={nextLightbox} aria-label="Next">→</button>
            </div>
            <div className="lightbox__caption">{photos[lightboxIdx].originalFilename}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 14, color: "#444" }}>
        {label} {required && <span style={{ color: "#c00" }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function toLocalInputValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StarPicker({ value, onChange }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? "star--on" : ""}`}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
