// Nexvo API Configuration

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  widgetUrl: process.env.WIDGET_URL || 'http://localhost:3002',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3002',
  ],

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nexvo',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Encryption
  encryptionKey: process.env.ENCRYPTION_KEY || 'change-this-32-char-encryption!',

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },

  // Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@nexvo.io',
  },

  // File Storage (S3)
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    bucket: process.env.S3_BUCKET || 'nexvo',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    region: process.env.S3_REGION || 'us-east-1',
  },

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
};
