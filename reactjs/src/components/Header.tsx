import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { Sidebar } from 'primereact/sidebar';
import tokenService from '../utils/tokenService';
import './Header.css';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleLogout = () => {
    tokenService.clearTokens();
    navigate('/login');
  };

  const startContent = (
    <div className="header-brand" onClick={() => navigate('/')}>
      <i className="pi pi-map" style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}></i>
      <span className="brand-text">Route App</span>
    </div>
  );

  const endContent = (
    <div className="header-actions">
      <Button
        icon="pi pi-home"
        text
        rounded
        onClick={() => navigate('/')}
        className="header-btn"
      />
      <Button
        icon="pi pi-history"
        text
        rounded
        onClick={() => navigate('/history')}
        className="header-btn"
        tooltip="Route History"
      />
      <Button
        icon="pi pi-sign-out"
        text
        rounded
        onClick={handleLogout}
        className="header-btn"
      />
    </div>
  );

  return (
    <>
      <Toolbar
        start={startContent}
        end={endContent}
        className="app-header"
      />
      <Sidebar
        visible={sidebarVisible}
        onHide={() => setSidebarVisible(false)}
        className="sidebar-menu"
      >
        <div className="sidebar-content">
          <Button
            label="Dashboard"
            icon="pi pi-home"
            text
            onClick={() => { navigate('/'); setSidebarVisible(false); }}
            className="w-full mb-3"
          />
          <Button
            label="Route History"
            icon="pi pi-history"
            text
            onClick={() => { navigate('/history'); setSidebarVisible(false); }}
            className="w-full mb-3"
          />
          <Button
            label="Logout"
            icon="pi pi-sign-out"
            text
            onClick={() => { handleLogout(); setSidebarVisible(false); }}
            className="w-full"
          />
        </div>
      </Sidebar>
    </>
  );
};

export default Header;
