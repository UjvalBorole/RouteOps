import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Auth.css';

const Register: React.FC = () => {
  const [user, setUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!user.email.trim() || !user.password.trim() || !user.firstName.trim() || !user.lastName.trim()) {
      toast.warn('Please fill in all fields');
      return;
    }

    if (user.password.length < 6) {
      toast.warn('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/auth/register', user);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <Card className="auth-card">
          <div className="auth-header">
            <i className="pi pi-user-plus"></i>
            <h1>Create Account</h1>
          </div>

          <Divider />

          <div className="auth-form">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="firstName">First Name</label>
                <InputText
                  id="firstName"
                  placeholder="First name"
                  value={user.firstName}
                  onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="form-field">
                <label htmlFor="lastName">Last Name</label>
                <InputText
                  id="lastName"
                  placeholder="Last name"
                  value={user.lastName}
                  onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <InputText
                id="email"
                type="email"
                placeholder="Enter your email"
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <Password
                id="password"
                value={user.password}
                onChange={(e) => setUser({ ...user, password: e.target.value })}
                placeholder="Create a password"
                toggleMask
                className="w-full"
              />
              <small className="password-hint">Minimum 6 characters</small>
            </div>

            <Button
              label="Create Account"
              onClick={handleRegister}
              loading={loading}
              disabled={loading}
              className="auth-btn w-full"
              icon="pi pi-user-plus"
            />

            <Divider />

            <div className="auth-footer">
              <span>Already have an account?</span>
              <Button
                label="Login"
                onClick={() => navigate('/login')}
                text
                className="p-button-link"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;