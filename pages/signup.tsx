import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Signup failed:', error.message);
      setLoading(false);
    } else {
      // Optionally, create an entry in the `users` table
      const { error: dbError } = await supabase
        .from('users')
        .insert([{ id: data.user?.id, email: data.user?.email, has_lifetime_access: false }]);

      if (dbError) {
        console.error('Failed to create user in database:', dbError.message);
      }

      setLoading(false);
      router.push('/payment'); // Redirect to payment page
    }
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Sign Up</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: '10px', margin: '10px 0' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: '10px', margin: '10px 0' }}
      />
      <button onClick={handleSignUp} disabled={loading}>
        {loading ? 'Signing Up...' : 'Sign Up'}
      </button>
    </div>
  );
};

export default SignupPage;