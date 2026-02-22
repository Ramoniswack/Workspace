'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Loader2, CheckCircle2, XCircle, Mail, Users, Shield } from 'lucide-react';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      setVerifying(false);
      return;
    }

    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      setVerifying(true);
      setError(null);

      const response = await api.get(`/invites/verify/${token}`);
      setInvitation(response.data.data);
      setVerifying(false);
      setLoading(false);

      // Check if user is logged in
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        // Redirect to login with return URL
        router.push(`/login?redirect=/join?token=${token}`);
      }
    } catch (err: any) {
      console.error('Failed to verify invitation:', err);
      setError(err.response?.data?.message || 'Invalid or expired invitation');
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      setError(null);

      const response = await api.post(`/invites/accept/${token}`);
      const data = response.data.data;

      setSuccess(true);
      setWorkspaceId(data.workspace._id);

      // Redirect to workspace after 2 seconds
      setTimeout(() => {
        router.push(`/workspace/${data.workspace._id}`);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      setError(err.response?.data?.message || 'Failed to accept invitation');
      setAccepting(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Welcome Aboard! 🎉
          </h1>
          <p className="text-gray-600 mb-6">
            You've successfully joined the workspace. Redirecting you now...
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/login')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            You're Invited!
          </h1>
          <p className="text-purple-100">
            Join your team on TaskFlow
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Workspace</p>
                <p className="text-lg font-semibold text-purple-600">
                  {invitation.workspaceName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Invited by</p>
                <p className="text-lg font-semibold text-blue-600">
                  {invitation.inviterName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Your Role</p>
                <p className="text-lg font-semibold text-green-600 capitalize">
                  {invitation.role}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-gray-900">What happens next?</strong>
              <br />
              By accepting this invitation, you'll join <strong>{invitation.workspaceName}</strong> and
              be able to collaborate with your team on projects and tasks.
            </p>
          </div>

          <button
            onClick={handleAcceptInvitation}
            disabled={accepting}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {accepting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Accept Invitation
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Not interested?{' '}
            <button
              onClick={() => router.push('/dashboard')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Go to Dashboard
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}


export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
