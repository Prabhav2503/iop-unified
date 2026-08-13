// This file is the Vercel Serverless Function entrypoint.
// Vercel automatically makes every file inside /api a serverless function.
// It receives all /api/* requests and forwards them to the Express app.

import app from '../backend/index.js';

export default app;
