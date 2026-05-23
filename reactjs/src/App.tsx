import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './App.css';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import RouteHistory from './components/RouteHistory';
import tokenService from './utils/tokenService';

function AppContent() {
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isLoggedIn = tokenService.hasToken();

  if (!isLoggedIn && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  if (isLoggedIn && isAuthPage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="App">
      {!isDashboard && <Header />}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/history" element={<RouteHistory />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
