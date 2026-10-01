import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './styles.css';
import { AppProvider } from './state';
import { AuthGate } from './components/AuthGate';
import { Layout } from './components/Layout';
import { Today } from './pages/Today';
import { Timeline } from './pages/Timeline';
import { Projects, ProjectDetail } from './pages/Projects';
import { FormatEditor } from './pages/FormatEditor';
import { Tasks, Stats, Review, Settings } from './pages/Other';
import { Tracker } from './pages/TrackerPage';
import { Calendar } from './pages/Calendar';
import { Habits } from './pages/Habits';

// HashRouter so the wireframe also works when opened as a single file.
// Switch to BrowserRouter (plus a Netlify redirect rule) once deployed.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <AuthGate>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="tracker" element={<Tracker />} />
            <Route path="habits" element={<Habits />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="formats/:id" element={<FormatEditor />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="stats" element={<Stats />} />
            <Route path="review" element={<Review />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
      </AuthGate>
    </AppProvider>
  </StrictMode>,
);
