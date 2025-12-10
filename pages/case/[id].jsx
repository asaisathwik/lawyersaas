import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/contexts/AuthContext';
import { CaseDetails } from '../../src/pages/CaseDetails';

export default function CaseDetailsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) return null;
  if (!user) return null;
  return <CaseDetails />;
}


