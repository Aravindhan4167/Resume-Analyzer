import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://spwnbwjdnrqbyyuqatdw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwd25id2pkbnJxYnl5dXFhdGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjYzODAsImV4cCI6MjA3OTU0MjM4MH0.0I50HGdciGng3dHv4hayZF6t0u1Kf0bGMsHxY7kOnvs";

// IMPORTANT: Replace with your actual Supabase URL and Anon Key
// You can get these from your Supabase project settings.
// It's safe to expose these in a browser-based app.
if (SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL" || SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
    console.warn("Supabase credentials are not set. Please update src/supabaseClient.js with your project's URL and Anon key.");
}


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
