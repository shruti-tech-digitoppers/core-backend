import app from './app.js';

const PORT = process.env.PORT || app.get('PORT') || 3001;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Server is running on http://${HOST}:${PORT} (Public URL: ${process.env.BASE_URL || `http://localhost:${PORT}`})\n`);
});
