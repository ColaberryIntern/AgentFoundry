import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.AI_SERVICE_PORT || '3004', 10);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.use('/health', healthRouter);

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AI Recommendation Service listening on port ${PORT}`);
  });
}

export default app;
