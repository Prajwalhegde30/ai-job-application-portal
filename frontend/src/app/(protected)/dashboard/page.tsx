'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Shield,
  Key,
  Database,
  ArrowRight,
  Loader2,
  CheckCircle,
} from 'lucide-react';

/**
 * Dashboard Page - /dashboard
 * Renders user details, auth token verify button, and system metadata.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );

  const handleVerifyAuth = async () => {
    setIsVerifying(true);
    setVerificationResult(null);
    setVerificationError(null);

    try {
      // Fetch /auth/me to verify token works
      const response = await api.get('/auth/me');
      setVerificationResult(response.data.data);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setVerificationError(
        error.response?.data?.error?.message || 'Verification request failed'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl">
        <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 bottom-0 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent text-white sm:text-4xl">
              Hello, {user?.name || 'Candidate'}!
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
              Your enterprise-grade authentication is active. From this portal,
              you can securely access resume parser modules, search jobs, and
              monitor application timelines.
            </p>
          </div>
          <Button
            onClick={handleVerifyAuth}
            disabled={isVerifying}
            className="gap-2 self-start bg-gradient-to-r from-blue-600 to-violet-600 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-violet-500 md:self-center"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Verify Token Live
          </Button>
        </div>
      </div>

      {/* Verification result output */}
      {(verificationResult || verificationError) && (
        <Card className="border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-white">
              <Shield className="h-5 w-5 text-emerald-400" />
              Live Server Verification
            </CardTitle>
            <CardDescription className="text-slate-400">
              Response metadata returned from backend validate bearer middleware
              `/api/v1/auth/me`
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verificationResult && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <pre className="overflow-x-auto font-mono text-xs text-emerald-400">
                  {JSON.stringify(verificationResult, null, 2)}
                </pre>
              </div>
            )}
            {verificationError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {verificationError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cards list */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Details */}
        <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-sm transition-all duration-300 hover:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-slate-350 text-sm font-semibold">
              Account Profile
            </CardTitle>
            <User className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div>
              <span className="block text-xs tracking-wider text-slate-500 uppercase">
                User ID
              </span>
              <span className="block truncate font-mono text-sm text-slate-300">
                {user?.id || '—'}
              </span>
            </div>
            <div>
              <span className="block text-xs tracking-wider text-slate-500 uppercase">
                Access Role
              </span>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm font-medium text-slate-300">
                  {user?.role || 'USER'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-sm transition-all duration-300 hover:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-slate-350 text-sm font-semibold">
              Session & Security
            </CardTitle>
            <Key className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div>
              <span className="block text-xs tracking-wider text-slate-500 uppercase">
                Access Token Location
              </span>
              <span className="block text-sm font-medium text-slate-300">
                Memory Store (Zustand)
              </span>
            </div>
            <div>
              <span className="block text-xs tracking-wider text-slate-500 uppercase">
                Refresh Token Transport
              </span>
              <span className="block text-sm font-medium text-slate-300">
                HTTP-Only Cookie (Secure)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Database Layer */}
        <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-sm transition-all duration-300 hover:border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-slate-350 text-sm font-semibold">
              Database Connection
            </CardTitle>
            <Database className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div>
              <span className="block text-xs tracking-wider text-slate-500 uppercase">
                DBMS engine
              </span>
              <span className="block text-sm font-medium text-slate-300">
                PostgreSQL
              </span>
            </div>
            <div>
              <span className="block text-xs tracking-wider text-slate-500 uppercase">
                Profiles & Users linked
              </span>
              <span className="block flex items-center gap-1.5 text-sm font-medium text-slate-300">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Auto
                Profile on Signup (Phase 2)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Features Roadmaps */}
      <h2 className="pt-4 text-xl font-bold text-white">
        Module Integration Roadmap
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/10 transition-all duration-300 hover:bg-slate-900/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Phase 5
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                Pending
              </span>
            </div>
            <CardTitle className="mt-2 text-lg font-bold text-white">
              Resume Parsing & AI Analysis
            </CardTitle>
            <CardDescription className="text-slate-400">
              Automatically parse uploaded PDFs, extract key experience details,
              and auto-complete applicant profiles using Gemini models.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex cursor-not-allowed items-center gap-1 text-sm font-medium text-blue-400">
              <span>Learn more</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/10 transition-all duration-300 hover:bg-slate-900/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Phase 6
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                Pending
              </span>
            </div>
            <CardTitle className="mt-2 text-lg font-bold text-white">
              Smart Job Postings & Tracking
            </CardTitle>
            <CardDescription className="text-slate-400">
              Post, search, and apply to job listings. Track applications as
              they advance through recruiter pipelines from submission to
              decision.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex cursor-not-allowed items-center gap-1 text-sm font-medium text-blue-400">
              <span>Learn more</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
