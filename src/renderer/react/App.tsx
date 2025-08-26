import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useStore } from './hooks/useStore';
import FeaturesPage from './components/FeaturesPage';
import ProjectManager from './components/ProjectManager';

function App() {
  const { currentProject, hasProject } = useStore(state => ({
    currentProject: state.currentProject,
    hasProject: state.hasProject()
  }));

  return (
    <div className="app">
      <header className="app-header">
        <h1>Software Estimation Manager - React Version</h1>
        <p>Project: {currentProject?.project?.name || 'No project loaded'}</p>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/projects" element={<ProjectManager />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/" element={
            <div>
              <h2>Welcome to React Version!</h2>
              <p>Start by navigating to Projects to manage your projects or Features to see the React implementation.</p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <a href="/projects">Go to Projects →</a>
                <a href="/features">Go to Features →</a>
              </div>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;