import app from './app.js';

const PORT = app.get('PORT');
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT} \n`);
});
