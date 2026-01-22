import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "",
    role: "STUDENT" 
  });
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await register(form);
      authLogin(); // Update auth context
      navigate("/"); // Navigate instead of replace
    } catch (e) {
      setErr(e.message || "Register failed");
    }
  };

  return (
    <section className="container">
      <article className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 className="m-0">Register</h1>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Name</span>
            <input 
              className="input" 
              name="name" 
              value={form.name} 
              onChange={onChange}
              placeholder="Your full name"
            />
          </label>
          
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email <span style={{ color: "#c00" }}>*</span></span>
            <input 
              className="input" 
              name="email" 
              type="email" 
              value={form.email} 
              onChange={onChange} 
              required 
              placeholder="your.email@example.com"
            />
          </label>
          
          <label style={{ display: "grid", gap: 6 }}>
            <span>Password <span style={{ color: "#c00" }}>*</span></span>
            <input 
              className="input" 
              name="password" 
              type="password" 
              value={form.password} 
              onChange={onChange} 
              required 
              placeholder="Choose a secure password"
            />
          </label>
          
          <label style={{ display: "grid", gap: 6 }}>
            <span>I am a...</span>
            <select 
              className="select" 
              name="role" 
              value={form.role} 
              onChange={onChange}
              style={{ borderRadius: 8 }}
            >
              <option value="STUDENT">Student</option>
              <option value="ORGANIZER">Event Organizer</option>
            </select>
            <div className="card__meta" style={{ fontSize: 12, marginTop: 4 }}>
              Students can RSVP to events. Organizers can create and manage events.
            </div>
          </label>
          
          {err && <div style={{ color: "#c00", fontSize: 14 }}>{err}</div>}
          
          <button className="btn btn--primary" type="submit">Create account</button>
          
          <div className="card__meta">
            Have an account? <Link to="/login">Login</Link>
          </div>
        </form>
      </article>
    </section>
  );
}