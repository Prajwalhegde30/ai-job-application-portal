import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import {
  authRateLimit,
  aiAnalysisRateLimit,
  careerAdviceRateLimit,
  matchAnalysisRateLimit,
  notificationsRateLimit,
} from './middleware/rateLimit.middleware';
import { authRoutes } from './modules/auth';
import { profileRoutes } from './modules/profile';
import { jobsRoutes } from './modules/jobs';
import { resumesRoutes } from './modules/resumes';
import {
  applicationRoutes,
  adminApplicationRoutes,
} from './modules/applications';
import { notificationsRoutes } from './modules/notifications';
import { analyticsRoutes } from './modules/analytics';
import { candidateDashboardRoutes } from './modules/candidate-dashboard';
import { rbacTestRoutes } from './modules/rbac-test';
import { aiAnalysisRoutes } from './modules/ai-analysis';
import { matchEngineRoutes } from './modules/match-engine';
import { careerAdvisorRoutes } from './modules/ai-career-advisor';
import { healthRoutes } from './modules/health';
import { metricsRoutes } from './modules/metrics';

const app = express();

// ---------------------
// Observability / Logging Middleware (Register First)
// ---------------------
app.use(requestLogger);

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'https://ai-job-application-portal-ten.vercel.app',
];

const envOrigins = env.FRONTEND_URL.split(',').map((url) =>
  url.trim().replace(/\/$/, '')
);

const allowedOrigins = Array.from(new Set([...DEFAULT_ORIGINS, ...envOrigins]));

// ---------------------
// Security Middleware
// ---------------------
app.use(
  helmet({
    contentSecurityPolicy:
      env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: [
                "'self'",
                ...allowedOrigins,
                'https://*.supabase.co',
                'https://openrouter.ai',
              ],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true,
  })
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ---------------------
// Parsing Middleware
// ---------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------
// Logging Middleware (Fallback / Morgan)
// ---------------------
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------------------
// Root Health Check Route Redirection (Railway & Render Compatibility)
// ---------------------
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Job Application Portal API',
    version: '1.0.0',
    health: '/api/v1/health',
  });
});
app.use('/live', healthRoutes);
app.use('/ready', healthRoutes);
app.use('/health', healthRoutes);

// ---------------------
// API Routes
// ---------------------
app.use('/api/v1/auth', authRateLimit, authRoutes);
app.use('/api/v1/rbac-test', rbacTestRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/resumes', resumesRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/admin/applications', adminApplicationRoutes);
app.use('/api/v1/notifications', notificationsRateLimit, notificationsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ai-analysis', aiAnalysisRateLimit, aiAnalysisRoutes);
app.use('/api/v1/match-analysis', matchAnalysisRateLimit, matchEngineRoutes);
app.use('/api/v1/dashboard', candidateDashboardRoutes);
app.use('/api/v1/career-advice', careerAdviceRateLimit, careerAdvisorRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/metrics', metricsRoutes);

// ---------------------
// 404 Handler
// ---------------------
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// ---------------------
// Global Error Handler
// ---------------------
app.use(errorMiddleware);

export default app;
