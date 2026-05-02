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

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!credentials.email.trim() || !credentials.password.trim()) {
      toast.warn('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', credentials);
      localStorage.setItem('token', response.data.token);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <Card className="auth-card">
          <div className="auth-header">
            <i className="pi pi-sign-in"></i>
            <h1>Login</h1>
          </div>

          <Divider />

          <div className="auth-form">
            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <InputText
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full"
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <Password
                id="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter your password"
                feedback={false}
                toggleMask
                className="w-full"
              />
            </div>

            <Button
              label="Login"
              onClick={handleLogin}
              loading={loading}
              disabled={loading}
              className="auth-btn w-full"
              icon="pi pi-sign-in"
            />

            <Divider />

            <div className="auth-footer">
              <span>Don't have an account?</span>
              <Button
                label="Sign Up"
                onClick={() => navigate('/register')}
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

export default Login;