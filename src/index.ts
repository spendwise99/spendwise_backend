import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './routes/index.route';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', router);

// Health check
app.get('/', (_req, res) => {
  res.send('Server is running');
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || '', { dbName: 'test' })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log("Building the API...");
});

export default app;