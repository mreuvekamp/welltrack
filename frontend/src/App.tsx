import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  );
}

/** Placeholder home page - will be replaced with Dashboard in a later task */
function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">WellTrack</h1>
        <p className="mt-3 text-lg text-text-muted">
          Your symptom &amp; wellness tracker
        </p>
      </div>
    </div>
  );
}

export default App;
