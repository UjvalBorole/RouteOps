import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Toolbar } from 'primereact/toolbar';
import { Sidebar } from 'primereact/sidebar';
import './Header.css';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const startContent = (
    <div className="header-brand" onClick={() => navigate('/')}>
      <i className="pi pi-car" style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}></i>
      <span className="brand-text">FleetOps</span>
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
        icon="pi pi-users"
        text
        rounded
        onClick={() => navigate('/admin')}
        className="header-btn"
      />
      <Button
        icon="pi pi-sign-out"
        text
        rounded
        onClick={() => navigate('/login')}
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
            label="Admin Panel"
            icon="pi pi-users"
            text
            onClick={() => { navigate('/admin'); setSidebarVisible(false); }}
            className="w-full mb-3"
          />
          <Button
            label="Logout"
            icon="pi pi-sign-out"
            text
            onClick={() => { navigate('/login'); setSidebarVisible(false); }}
            className="w-full"
          />
        </div>
      </Sidebar>
    </>
  );
};

export default Header;
