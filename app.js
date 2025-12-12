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

app.use(express.json());

// CORS configuration to allow dashboard origin and handle preflight
const corsOptions = {
    origin: ['http://localhost:4400', 'https://dashboard.digitoppers.in'],
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
    exposedHeaders: ['Content-Disposition']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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