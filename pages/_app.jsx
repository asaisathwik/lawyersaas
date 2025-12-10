import { AuthProvider } from '../src/contexts/AuthContext';
import '../src/index.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}


