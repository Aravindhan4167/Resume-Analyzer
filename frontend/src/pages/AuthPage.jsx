import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const AuthPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                // Redirect to dashboard on successful sign-in
                navigate('/dashboard');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [navigate]);

    return (
        <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
                <h2 className="text-center mb-4">Welcome to Resume Analyzer</h2>
                <p className='text-center text-muted'>Sign in to continue</p>
                <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    theme="light"
                    providers={[]}
                    socialLayout="horizontal"
                />
            </div>
        </div>
    );
};

export default AuthPage;
