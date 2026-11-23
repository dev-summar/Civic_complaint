require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const routes = require('./routes');
const { initSocket } = require('./sockets');
const swaggerSpec = require('./docs/swagger');
const swaggerUi = require('swagger-ui-express');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://localhost:19006',
  'exp://',
].filter(Boolean);
app.use(
  cors({
    origin: config.clientUrl === '*' ? true : allowedOrigins,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
// Express 5: req.query is read-only — do not use express-mongo-sanitize's default middleware
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  }
  next();
});
app.use(morgan(config.env === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http ? logger.http(msg.trim()) : logger.info(msg.trim()) },
}));
app.use(generalLimiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'SwachhSetu API',
    env: config.env,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  initSocket(server);
  server.listen(config.port, () => {
    logger.info(`SwachhSetu API listening on port ${config.port}`);
    logger.info(`Swagger docs: ${config.apiUrl}/api/docs`);
  });
};

start().catch((err) => {
  logger.error(err);
  process.exit(1);
});

module.exports = { app, server };
