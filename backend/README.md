# PDFLab Backend API

Professional PDF conversion backend powered by CloudConvert, Node.js, Express, and Bull queue system.

## Features

- **5 Conversion Types**: PDF → PowerPoint, Word, Excel, Images, Merge
- **CloudConvert Integration**: Best-in-class conversion accuracy
- **Job Queue System**: Redis + Bull for background processing
- **User Authentication**: JWT-based auth with bcrypt password hashing
- **Rate Limiting**: Redis-backed rate limiting per plan tier
- **Auto Cleanup**: Files deleted after 1 hour for privacy
- **Usage Tracking**: Comprehensive logging and analytics
- **Tier-Based Limits**: Free (3/day), Starter (100/month), Pro (unlimited)

## Prerequisites

- **Node.js**: v20 LTS or higher
- **MySQL**: 8.0 or higher
- **Redis**: 7.x or higher
- **CloudConvert API Key**: Get one at [cloudconvert.com](https://cloudconvert.com)

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure environment variables in `.env`:
```env
# Database
DB_HOST=localhost
DB_USER=pdflab
DB_PASSWORD=your-password
DB_NAME=pdflab

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CloudConvert
CLOUDCONVERT_API_KEY=your-api-key
CLOUDCONVERT_SANDBOX=false

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
```

3. Create MySQL database:
```sql
CREATE DATABASE pdflab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Production

Build and start production server:
```bash
npm run build
npm start
```

Start worker separately:
```bash
npm run worker
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (requires auth)
- `POST /api/auth/refresh` - Refresh access token

### Conversions

- `POST /api/upload` - Upload PDF and start conversion (requires auth)
- `GET /api/status/:job_id` - Get conversion job status (requires auth)
- `GET /api/download/:job_id` - Download converted file (requires auth)
- `GET /api/history` - Get conversion history (requires auth)

### Health

- `GET /health` - Health check endpoint

## API Usage Examples

### Register User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Upload and Convert PDF

```bash
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@document.pdf" \
  -F "conversion_type=pdf_to_pptx"
```

### Check Job Status

```bash
curl -X GET http://localhost:3001/api/status/JOB_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Download Converted File

```bash
curl -X GET http://localhost:3001/api/download/JOB_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o converted.pptx
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                Express Server                    │
│  Routes → Controllers → Services → Models       │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┼────────┬──────────────┐
        │        │        │              │
        ▼        ▼        ▼              ▼
   ┌────────┐  ┌────┐  ┌──────────┐  ┌──────┐
   │ MySQL  │  │Redis│  │CloudConvert│  │Files │
   │Database│  │+Bull│  │    API    │  │Storage│
   └────────┘  └────┘  └──────────┘  └──────┘
```

### Key Components

- **Express**: RESTful API server
- **MySQL + Sequelize**: Database ORM
- **Redis**: Caching and queue storage
- **Bull**: Job queue management
- **CloudConvert**: PDF conversion engine
- **Multer**: File upload handling
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing

## Database Schema

### users
- User accounts with plan tiers
- JWT authentication
- Conversion quotas

### conversion_jobs
- Job tracking and status
- Input/output file paths
- CloudConvert job IDs
- Progress tracking

### usage_logs
- Analytics and reporting
- Processing times
- Success/failure tracking

## Job Queue System

### Conversion Queue
- **Concurrency**: 5 workers
- **Retry**: 3 attempts with exponential backoff
- **Timeout**: 5 minutes per job
- **Processing**:
  1. Upload to CloudConvert
  2. Monitor conversion
  3. Download result
  4. Update database
  5. Schedule cleanup

### Cleanup Queue
- **Delay**: 1 hour after creation
- **Action**: Delete uploaded and converted files
- **Privacy**: Ensures file deletion promise

## Error Handling

- **Authentication Errors**: 401 Unauthorized
- **Quota Exceeded**: 429 Too Many Requests
- **File Too Large**: 413 Payload Too Large
- **Invalid File Type**: 415 Unsupported Media Type
- **Conversion Failed**: 500 Internal Server Error

All errors include descriptive messages and error codes.

## Rate Limiting

### Per Plan
- **Free**: 10 uploads/hour
- **Starter**: 100 uploads/hour
- **Pro**: 1000 uploads/hour

### Global
- **API**: 100 requests per 15 minutes per IP
- **Auth**: 5 attempts per 15 minutes per IP
- **Download**: 50 downloads per 10 minutes per user

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with 12 rounds
- **Rate Limiting**: Redis-backed
- **CORS Protection**: Configurable origins
- **Helmet**: Security headers
- **Input Validation**: express-validator
- **File Type Validation**: PDF only
- **Size Limits**: Tier-based

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "uptime": 12345,
  "timestamp": 1234567890,
  "status": "OK",
  "checks": {
    "database": "OK",
    "redis": "OK"
  }
}
```

### Queue Monitoring

Check queue status in Redis:
```bash
redis-cli
> KEYS bull:pdf-conversion:*
> LLEN bull:pdf-conversion:waiting
> LLEN bull:pdf-conversion:active
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` to secure random string
- [ ] Configure CloudConvert production API key
- [ ] Set up MySQL with proper credentials
- [ ] Configure Redis with authentication
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Configure automatic backups
- [ ] Test all endpoints

### PM2 Deployment

```bash
# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup
pm2 startup
```

## Troubleshooting

### Database Connection Failed
```bash
# Check MySQL is running
mysql -u pdflab -p

# Verify credentials in .env
```

### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping

# Verify Redis host/port in .env
```

### CloudConvert API Errors
```bash
# Verify API key
# Check CloudConvert account credits
# Review CloudConvert API logs
```

### File Upload Fails
```bash
# Check storage directory permissions
chmod -R 755 ./storage

# Verify disk space
df -h
```

## Development Tips

### Watch Mode
```bash
# Auto-restart on file changes
npm run dev
```

### Database Reset
```bash
# WARNING: This will delete all data
mysql -u pdflab -p pdflab < schema.sql
```

### Clear Redis Queue
```bash
redis-cli FLUSHDB
```

### Test CloudConvert
```bash
# Test conversion without queue
node -e "require('./dist/services/cloudconvert.service').cloudConvertService.getAccountInfo().then(console.log)"
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests
4. Submit pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [github.com/your-org/pdflab](https://github.com)
- Email: support@pdflab.pro
- Docs: [docs.pdflab.pro](https://docs.pdflab.pro)

---

Built with ❤️ using Node.js, Express, CloudConvert, and Bull
