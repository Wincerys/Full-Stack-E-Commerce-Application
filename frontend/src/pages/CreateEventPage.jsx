import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  createEvent,
  listCategories,
  uploadPhotos,
  getMyProfile,
  isAuthed,
} from "../services/api";

export default function CreateEventPage() {
  const nav = useNavigate();
  const authed = isAuthed();

  // Check user role
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
    enabled: authed,
  });

  // --- categories ---
  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
  });

  // --- form state ---
  const [form, setForm] = useState({
    title: "",
    description: "",
    dateTimeISO: "",
    location: "",
  });
  const [err, setErr] = useState("");

  // Helper to format a Date into a local datetime-local value (YYYY-MM-DDTHH:mm)
  const toLocalInputValue = (d) => {
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };

  // Category chooser: existing vs new
  const [categoryMode, setCategoryMode] = useState("existing");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Seed initial category once categories load
  useEffect(() => {
    if (categories.length && !selectedCategory && categoryMode === "existing") {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory, categoryMode]);

  // --- photo upload state ---
  const [files, setFiles] = useState([]);
  const onPickFiles = (e) => setFiles(Array.from(e.target.files || []));

  // Check if user is not authenticated
  if (!authed) {
    return (
      <section className="container">
        <article className="card" style={{ maxWidth: 580, margin: "0 auto" }}>
          <h1 className="m-0">Create Event</h1>
          <p className="card__meta" style={{ marginTop: 8 }}>
            Please <Link to="/login">login</Link> to create events.
          </p>
        </article>
      </section>
    );
  }

  // Check if loading profile
  if (profileLoading) {
    return (
      <section className="container">
        <p className="badge">Loading...</p>
      </section>
    );
  }

  // Check if user is a student
  if (profile && profile.role === "STUDENT") {
    return (
      <section className="container">
        <article className="card" style={{ maxWidth: 580, margin: "0 auto" }}>
          <h1 className="m-0">Create Event</h1>
          <p className="card__meta" style={{ marginTop: 8 }}>
            Only event organizers can create events. Students can view and RSVP to events on the{" "}
            <Link to="/">Events page</Link>.
          </p>
        </article>
      </section>
    );
  }

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validateFiles = () => {
    for (const f of files) {
      if (!["image/jpeg", "image/png"].includes(f.type))
        return "Only JPEG/PNG allowed.";
      if (f.size > 10 * 1024 * 1024) return "Image too large (max 10MB).";
    }
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    const finalCategory =
      categoryMode === "new" ? newCategory.trim() : selectedCategory.trim();

    if (!form.title || !form.dateTimeISO || !form.location || !finalCategory) {
      setErr("Please fill Title, Date & Time, Location, and Category.");
      return;
    }

    const fileError = validateFiles();
    if (fileError) {
      setErr(fileError);
      return;
    }

    // Client-side guard: prevent selecting a past date/time
    if (new Date(form.dateTimeISO) <= new Date()) {
      setErr("Please choose a future date & time.");
      return;
    }

    try {
      const created = await createEvent({
        ...form,
        category: finalCategory,
      });

      if (files.length) {
        await uploadPhotos(created.id, files);
      }

      nav(`/events/${created.id}`);
    } catch (e) {
      setErr(e.message || "Failed to create event");
    }
  };

  return (
    <section className="container" style={{ maxWidth: 680 }}>
      <Link to="/" style={{ fontSize: 14 }}>
        ← Back to events
      </Link>
      <h2 style={{ marginTop: 8 }}>Create Event</h2>
      <p className="card__meta" style={{ marginTop: -6 }}>
        Create an event to share with the community!
      </p>

      <form
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 12, marginTop: 12 }}
      >
        <Field label="Title" required>
          <input
            name="title"
            className="input"
            value={form.title}
            onChange={onChange}
            placeholder="e.g. Intro to React"
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            className="textarea"
            value={form.description}
            onChange={onChange}
            placeholder="What is this event about?"
            rows={4}
          />
        </Field>

        <Field label="Date & Time" required>
          <input
            type="datetime-local"
            name="dateTimeISO"
            className="input"
            value={form.dateTimeISO}
            onChange={onChange}
            min={toLocalInputValue(new Date())}
            required
          />
        </Field>

        <Field label="Location" required>
          <input
            name="location"
            className="input"
            value={form.location}
            onChange={onChange}
            placeholder="e.g. Building 80, Room 10"
            required
          />
        </Field>

        {/* Category chooser */}
        <div style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#444" }}>
            Category <span style={{ color: "#c00" }}>*</span>
          </span>

          {categoryMode === "existing" && (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                className="select"
                value={selectedCategory}
                onChange={(e) => {
                  if (e.target.value === "__NEW__") {
                    setCategoryMode("new");
                    setNewCategory("");
                  } else {
                    setSelectedCategory(e.target.value);
                  }
                }}
              >
                {categories.length === 0 && (
                  <option value="">(No categories yet)</option>
                )}
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__NEW__">+ Create new category…</option>
              </select>

              <button
                type="button"
                className="btn"
                onClick={() => setCategoryMode("new")}
              >
                Create new
              </button>
              <button
                type="button"
                className="btn"
                title="Refresh categories"
                onClick={() => refetchCategories()}
              >
                Refresh
              </button>
            </div>
          )}

          {categoryMode === "new" && (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                className="input"
                placeholder="e.g., Campus, Tech, Social"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ minWidth: 220 }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => setCategoryMode("existing")}
              >
                Choose existing
              </button>
            </div>
          )}
        </div>

        {/* Photo uploader */}
        <div>
          <strong>Photos (optional)</strong>
          <div className="card__meta" style={{ marginTop: 4 }}>
            Upload JPEG/PNG up to 10MB each.
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              type="file"
              accept="image/png, image/jpeg"
              multiple
              onChange={onPickFiles}
            />
            {files.length > 0 && (
              <span className="badge">{files.length} file(s) selected</span>
            )}
          </div>
        </div>

        {err && <div style={{ color: "#c00", fontSize: 14 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn--primary">
            Create Event
          </button>
          <Link to="/" className="btn">
            Cancel
          </Link>
        </div>
      </form>
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