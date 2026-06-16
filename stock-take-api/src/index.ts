import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { getDb } from './db.js';
import { isWisprFlowConfigured } from './services/wisprFlow.js';
import { adminRouter } from './routes/admin.js';
import { deviceRouter } from './routes/device.js';
import { googleRouter } from './routes/google.js';
import { supervisorRouter } from './routes/supervisor.js';

const app = express();

app.use(
  cors({
    origin: config.allowedOrigins,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Device-Id',
      'X-Device-Secret',
      'X-View-Token',
    ],
  })
);
app.use(express.json({ limit: '30mb' }));

app.get('/health', (_req, res) => {
  getDb();
  res.json({
    ok: true,
    service: 'stock-take-api',
    wisprFlow: isWisprFlowConfigured(),
  });
});

app.use('/api/device', deviceRouter);
app.use('/api/device/google', googleRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/supervisor', supervisorRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`stock-take-api listening on http://localhost:${config.port}`);
});
