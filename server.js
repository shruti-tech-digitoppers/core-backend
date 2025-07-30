import app from './app.js';

const PORT = app.get('PORT');
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running... ${process.env.BASE_URL}\n`);
});
