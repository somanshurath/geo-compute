import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

import LandingPage from './pages/LandingPage';
import Canvas from './pages/Canvas';
import NotFound from './pages/NotFound';

const Home = () => <div>Home Page</div>;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/canvas" element={<Canvas />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  // </React.StrictMode>
);
