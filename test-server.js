
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5555;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

// Basic HTML test page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Server</title>
        <style>
          body { font-family: Arial; margin: 40px; }
          .status { padding: 20px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>Test Server</h1>
        <div class="status">
          <p>Server is running on port ${PORT}</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
});
