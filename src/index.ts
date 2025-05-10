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

app.use('/api', router);


app.get('/', (_req, res) => {
  res.send('Server is running ✅');
});

async function startServer() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('❌ MONGO_URI not defined in environment variables');
    }

    await mongoose.connect(mongoUri, {
      dbName: 'test', 
    });

    console.log('✅ MongoDB connected');

    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1); 
  }
}

startServer();

export default app;
