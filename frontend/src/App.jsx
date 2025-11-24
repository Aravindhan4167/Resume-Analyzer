import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';

function App() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for an active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for changes in authentication state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        // Redirect on login/logout
        if (_event === 'SIGNED_IN') {
          navigate('/dashboard');
        }
        if (_event === 'SIGNED_OUT') {
          navigate('/');
        }
      }
    );

    // Cleanup subscription on component unmount
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="App">
      <Navbar session={session} />
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={!session ? <AuthPage /> : <Dashboard session={session} />} />
          <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <AuthPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
