import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
const app = express();

import initMongoose from './src/database/mongoose.db.js';
initMongoose();

import mainRoutes from './src/routes/main.routes.js';
import { transform } from './src/interceptors/request.interceptor.js';
import { API_MESSAGES, ERROR_CODES } from './src/constants/error.constants.js';

app.set('PORT', process.argv[2] || process.env.PORT || 3000);

app.use(express.json());

// Note: Put routes between transform and "*", otherwise it will create error
app.use(transform);
app.use(mainRoutes);
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