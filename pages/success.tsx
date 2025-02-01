import { useRouter } from 'next/router';

const SuccessPage = () => {
  const router = useRouter();

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Payment Successful!</h1>
      <p>You now have lifetime access.</p>
      <button onClick={() => router.push('/')}>Return to Home</button>
    </div>
  );
};

export default SuccessPage;