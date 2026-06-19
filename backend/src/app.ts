import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { authRateLimit } from './middleware/rateLimit.middleware';
import { authRoutes } from './modules/auth';
import { profileRoutes } from './modules/profile';
import { jobsRoutes } from './modules/jobs';
import { resumesRoutes } from './modules/resumes';
import {
  applicationRoutes,
  adminApplicationRoutes,
} from './modules/applications';
import { notificationsRoutes } from './modules/notifications';
import { rbacTestRoutes } from './modules/rbac-test';
import { sendSuccess } from './utils/response';

const app = express();

// ---------------------
// Security Middleware
// ---------------------
app.use(helmet());

app.use(
  cors({
    origin: env.ALLOWED_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---------------------
// Parsing Middleware
// ---------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------------------
// Logging Middleware
// ---------------------
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------------------
// Health Check
// ---------------------
app.get('/api/v1/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

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
app.use('/api/v1/notifications', notificationsRoutes);
// app.use('/api/v1/ai', aiRoutes);
// app.use('/api/v1/dashboard', dashboardRoutes);

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
