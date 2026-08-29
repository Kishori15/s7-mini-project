import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DatasetProvider } from './context/DatasetContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { UploadPage } from './pages/UploadPage';
import { DashboardPage } from './pages/DashboardPage';
import { SentimentPage } from './pages/SentimentPage';
import { InsightsPage } from './pages/InsightsPage';

export function App() {
  return (
    <DatasetProvider>
      <Router>
        <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Header />

            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/upload" replace />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sentiment" element={<SentimentPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="*" element={<Navigate to="/upload" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </DatasetProvider>
  );
}

export default App;
