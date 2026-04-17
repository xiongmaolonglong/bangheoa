require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const sequelize = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
const apiRoutes = require('./routes');
app.use('/api/v1', apiRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// 全局错误捕获，防止进程崩溃
process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err.message, err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection]', reason);
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync({ alter: false });
    console.log('Database synced');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

module.exports = app;
if (require.main === module) start();
