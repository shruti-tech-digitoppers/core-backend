import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();

import initMongoose from './src/database/mongoose.db.js';
import { configureStorage } from './src/services/storage.service.js';
import cors from 'cors';

initMongoose();
await configureStorage();

import mainRoutes from './src/routes/main.routes.js';
import dashboardRoutes from './dashboard/routes/main.routes.js';
import { transform } from './src/interceptors/request.interceptor.js';
import { API_MESSAGES, ERROR_CODES } from './src/constants/error.constants.js';

app.set('PORT', process.argv[2] || process.env.PORT || 3000);


// CORS configuration — parses ALLOWED_ORIGINS from .env (supports JSON array or comma-separated list)
const parseAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (!envOrigins) {
    return ['https://dashboard.digitoppers.in'];
  }
  try {
    if (envOrigins.trim().startsWith('[')) {
      return JSON.parse(envOrigins);
    }
  } catch (error) {
    console.warn('Failed to parse ALLOWED_ORIGINS as JSON, falling back to comma-separated list');
  }
  return envOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server or non-browser requests without origin header
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} is not allowed`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'x-device-id',
    'x-request-timestamp',
    'x-request-signature',
    'x-security-version',
    'x-offline-token',
    'x-service-signature',
    'x-signature',
    'x-service-name',
    'x-timestamp'
  ],
  exposedHeaders: ['Content-Disposition']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Health check endpoint for Render and uptime monitors
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'digitoppers-core-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Digitoppers Core Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Note: Put routes between transform and "*", otherwise it will create error
app.use(transform);
app.use(mainRoutes);
app.use(dashboardRoutes);
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).send({ status: 400, message: `${API_MESSAGES[400]} : " body "`, errorCode: ERROR_CODES[400] });
  }
  next();
});
app.use("*", (req, res) => {
  res.status(404);
  return res.json({
    status: false,
    message: API_MESSAGES[404],
  });
})

export default app;