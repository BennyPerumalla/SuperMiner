require('dotenv').config();
const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
