import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { initSchema } from './db/schema.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import conversationsRouter from './routes/conversations.js';
import chatRouter from './routes/chat.js';
import documentsRouter from './routes/documents.js';
import promptsRouter from './routes/prompts.js';
import analyticsRouter from './routes/analytics.js';
import publicApiRouter from './routes/publicApi.js';
import widgetRouter from './routes/widget.js';

initSchema();

const app = express();
app.use(cors());
app.use(express.json());

// Public routes (no auth)
app.use('/api/auth', authRouter);
app.use('/api/widget', widgetRouter);

// Protected routes
app.use('/api/conversations', conversationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/analytics', analyticsRouter);

// Admin routes
app.use('/api/admin', adminRouter);

// Public API (API key auth)
app.use('/api/v1', publicApiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(CONFIG.port, () => {
  console.log(`[Server] Running on http://localhost:${CONFIG.port}`);
});
