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


// CORS configuration to allow dashboard/tracker origins and signature headers
const allowedOrigins = [
  'http://localhost:4400',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'https://dashboard.digitoppers.in',
  process.env.TRACKER_FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        return callback(new Error('CORS policy does not allow access from this origin'), false);
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-signature',
      'x-service-signature',
      'x-timestamp',
      'x-service-name',
      'x-api-key',
      'x-device-id',
      'x-request-timestamp',
      'x-request-signature',
      'x-security-version',
      'x-offline-token'
    ],
    exposedHeaders: ['Content-Disposition']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

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