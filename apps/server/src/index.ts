import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder sync endpoint (Phase 2)
app.post('/api/sync', (_req, res) => {
  res.json({ message: 'Sync endpoint - not yet implemented' });
});

app.listen(PORT, () => {
  console.log(`🚀 Alcovia server running on http://localhost:${PORT}`);
});
