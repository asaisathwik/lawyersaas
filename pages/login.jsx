import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';
import { AuthForm } from '../src/components/AuthForm';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const videoUrl = process.env.NEXT_PUBLIC_PRODUCT_VIDEO_URL || '';

  const embedUrl = (() => {
    const raw = videoUrl || '';
    try {
      const u = new URL(raw);
      if (u.hostname.includes('drive.google.com')) {
        // Handle common Drive link formats and convert to preview
        // 1) /file/d/<id>/view    -> /file/d/<id>/preview
        // 2) /open?id=<id>        -> /file/d/<id>/preview
        // 3) /uc?id=<id>          -> /file/d/<id>/preview
        if (u.pathname.startsWith('/file/d/')) {
          const parts = u.pathname.split('/');
          const id = parts[3] || '';
          return id ? `https://drive.google.com/file/d/${id}/preview` : raw;
        }
        const id = u.searchParams.get('id') || '';
        if (id) {
          return `https://drive.google.com/file/d/${id}/preview`;
        }
      }
    } catch {}
    return raw;
  })();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return null;
  }
  if (user) return null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
        <div className="hidden md:flex flex-col justify-center p-8 lg:p-12">
          <div className="max-w-xl">
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Manage your cases effortlessly
            </h1>
            <p className="text-slate-600 mb-6">
              Track hearings, schedule reminders, store documents, and stay on top of your workflow.
            </p>
            <ul className="space-y-2 text-slate-700 mb-8">
              <li className="flex gap-2">
                <span>•</span>
                <span>Automated SMS reminders before hearings</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Keep all case documents organized in one place</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Fast search and clear hearing history</span>
              </li>
            </ul>
            {videoUrl ? (
              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-black">
                <iframe
                  src={embedUrl}
                  title="Product overview"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 shadow-sm p-6 bg-white">
                <p className="text-slate-700 text-sm">
                  Add a product video by setting <code className="text-slate-900">NEXT_PUBLIC_PRODUCT_VIDEO_URL</code> in your env. Google Drive links are supported (set file sharing to “Anyone with the link”).
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center p-4">
          <AuthForm embedded />
        </div>
      </div>
    </div>
  );
}


