import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Maps from './pages/Maps';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Analysis from './pages/Analysis';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedISO, setSelectedISO] = useState('iso_ne');

  useEffect(() => {
    const savedISO = localStorage.getItem('selectedISO');
    if (savedISO) {
      setSelectedISO(savedISO);
    }
    setIsLoading(false);
  }, []);
  
  const handleISOChange = (isoId) => {
    setSelectedISO(isoId);
    localStorage.setItem('selectedISO', isoId);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e1a 0%, #151b2e 100%)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(59, 130, 246, 0.3)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Navbar selectedISO={selectedISO} onISOChange={handleISOChange} />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Navigate to="/maps" replace />} />
            <Route path="/" element={<Navigate to="/maps" replace />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/maps" element={<Maps selectedISO={selectedISO} />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
