import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import './AdminLoginPage.css';

const AdminLoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email: formData.email, password: formData.password });
      
      // Check if user is admin
      if (response.user.role !== 'ADMIN') {
        setError('Access denied. Admin credentials required.');
        setLoading(false);
        return;
      }

      // Store token and user info (keep compat keys used elsewhere)
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);
      if (response.user) {
        if (response.user.role) localStorage.setItem('role', response.user.role);
        if (response.user.name) localStorage.setItem('name', response.user.name);
      }
      
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>Admin Portal</h1>
          <p>Administrative Access Only</p>
        </div>
        
        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter admin email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter admin password"
              className="form-input"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`admin-login-btn ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Signing In...' : 'Sign In to Admin Portal'}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/login" className="regular-login-link">
            Regular User Login
          </Link>
          <div className="security-notice">
            <small>⚠️ Authorized personnel only</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;