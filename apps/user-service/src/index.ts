import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { userRouter } from './routes/user.routes';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount the user routes
app.use('/', userRouter);

// Standard health check for Docker/Railway
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'user-service' }));

// Global error handler for unhandled promise rejections
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[User Service Error]:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`User service running on port ${PORT}`);
});