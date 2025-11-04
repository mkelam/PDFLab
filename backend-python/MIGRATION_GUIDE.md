# Migration Guide: Node.js/Express → Python/FastAPI

Complete guide for migrating the PDFLab backend from Node.js/Express to Python/FastAPI.

## 📊 Migration Overview

### What Was Migrated

| Component | From (Node.js) | To (Python) | Status |
|-----------|---------------|-------------|--------|
| **Framework** | Express.js | FastAPI | ✅ Complete |
| **Language** | TypeScript | Python 3.11+ | ✅ Complete |
| **ORM** | Sequelize | SQLAlchemy 2.0 (async) | ✅ Complete |
| **Migrations** | Sequelize CLI | Alembic | ✅ Complete |
| **Auth** | jsonwebtoken | python-jose | ✅ Complete |
| **Password** | bcrypt | passlib[bcrypt] | ✅ Complete |
| **Validation** | Joi/Zod | Pydantic | ✅ Complete |
| **Task Queue** | Bull | Celery | ✅ Complete |
| **HTTP Client** | axios | httpx | ✅ Complete |
| **Logging** | winston | structlog | ✅ Complete |
| **API Docs** | Manual/Postman | OpenAPI/Swagger (auto) | ✅ Complete |

### Migration Phases

1. **Phase 0**: Project setup & dependencies
2. **Phase 1**: Database models & configuration
3. **Phase 2**: Core conversion API endpoints
4. **Phase 3**: CloudConvert integration & file utilities
5. **Phase 4**: Celery job queue integration
6. **Phase 5**: Authentication & middleware
7. **Phase 6**: PayFast payment integration
8. **Phase 7**: Database migrations (Alembic)
9. **Phase 8**: Testing & documentation

## 🔄 Key Differences

### 1. Async/Await Pattern

**Node.js (Express):**
```typescript
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Python (FastAPI):**
```python
@router.get("/api/users/{user_id}")
async def get_user(user_id: str):
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
```

### 2. Request Validation

**Node.js (Joi/Zod):**
```typescript
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().optional()
});

const { error, value } = userSchema.validate(req.body);
```

**Python (Pydantic):**
```python
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = None

@router.post("/register")
async def register(user_data: UserRegisterRequest):
    # Validation automatic, user_data is validated
    pass
```

### 3. Database Models

**Node.js (Sequelize):**
```typescript
class User extends Model {
  declare id: string;
  declare email: string;
  declare password_hash: string;
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, { sequelize, tableName: 'users' });
```

**Python (SQLAlchemy):**
```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )
```

### 4. JWT Authentication

**Node.js:**
```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Middleware
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

**Python:**
```python
from jose import jwt

def create_access_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

# Dependency injection
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    user_id = verify_access_token(token)
    # ... fetch user
```

### 5. Background Jobs

**Node.js (Bull):**
```typescript
import Queue from 'bull';

const conversionQueue = new Queue('conversion', {
  redis: { host: 'localhost', port: 6379 }
});

conversionQueue.add({
  jobId: '123',
  inputFile: '/path/to/file.pdf',
  outputFormat: 'pptx'
});

conversionQueue.process(async (job) => {
  // Process conversion
});
```

**Python (Celery):**
```python
from celery import Celery

celery_app = Celery(
    'pdflab',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1'
)

@celery_app.task
def process_conversion(job_id: str, input_file: str, output_format: str):
    # Process conversion
    pass

# Queue job
process_conversion.delay(job_id, input_file, output_format)
```

### 6. File Uploads

**Node.js (Multer):**
```typescript
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  // Process file
});
```

**Python (FastAPI):**
```python
from fastapi import UploadFile, File

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    # Process file
```

### 7. Environment Configuration

**Node.js:**
```typescript
import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 3006,
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306')
  }
};
```

**Python (Pydantic Settings):**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 3007
    DB_HOST: str
    DB_PORT: int = 3306

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

settings = Settings()
```

## 🗄️ Database Schema Changes

### Key Differences

1. **UUID Storage**: Changed from `VARCHAR(36)` to `CHAR(36)` with `utf8mb4_bin` collation
2. **Enums**: Kept as MySQL ENUM types (both frameworks support)
3. **Timestamps**: Both use `DATETIME` (not TIMESTAMP to avoid timezone issues)
4. **Indexes**: More explicit index definitions in SQLAlchemy

### Migration Steps

```bash
# Node.js (Sequelize)
npx sequelize-cli db:migrate
npx sequelize-cli db:migrate:undo

# Python (Alembic)
poetry run alembic upgrade head
poetry run alembic downgrade -1
```

## 📦 Package Equivalents

| Node.js Package | Python Package | Purpose |
|----------------|---------------|---------|
| `express` | `fastapi` | Web framework |
| `sequelize` | `sqlalchemy` | ORM |
| `mysql2` | `aiomysql` | MySQL driver |
| `jsonwebtoken` | `python-jose` | JWT tokens |
| `bcrypt` | `passlib[bcrypt]` | Password hashing |
| `joi`/`zod` | `pydantic` | Validation |
| `bull` | `celery` | Task queue |
| `axios` | `httpx` | HTTP client |
| `winston` | `structlog` | Logging |
| `dotenv` | `pydantic-settings` | Environment vars |
| `multer` | `python-multipart` | File uploads |
| `cors` | `fastapi.middleware.cors` | CORS |
| `crypto` | `hashlib` | Hashing |
| `uuid` | `uuid` | UUID generation |

## 🔧 Configuration Changes

### Environment Variables

Most environment variables remain the same. Key changes:

```env
# Node.js
PORT=3006
JWT_EXPIRATION=7d

# Python
PORT=3007
JWT_EXPIRATION=604800  # seconds instead of string
```

### CORS Configuration

**Node.js:**
```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
```

**Python:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

## 🚀 Performance Improvements

### 1. Async Everything

FastAPI is fully async from the ground up, whereas Express.js requires explicit async handling.

### 2. Type Safety

Pydantic provides runtime type validation, catching errors before they reach the database.

### 3. Auto Documentation

FastAPI automatically generates OpenAPI/Swagger documentation from code annotations.

### 4. Dependency Injection

FastAPI's dependency injection system reduces boilerplate and improves testability.

## 🐛 Common Migration Issues

### Issue 1: Foreign Key Constraints

**Problem:** `(3780, "Referencing column 'user_id' and referenced column 'id' in foreign key constraint are incompatible.")`

**Solution:** Ensure CHAR columns have matching charset and collation:
```python
mysql.CHAR(charset='utf8mb4', collation='utf8mb4_bin', length=36)
```

### Issue 2: Enum Case Sensitivity

**Problem:** MySQL ENUMs are case-sensitive, Python enums might have different casing.

**Solution:** Match exact case or use case-insensitive comparison:
```python
class UserPlan(str, enum.Enum):
    FREE = "free"  # lowercase to match MySQL
    STARTER = "starter"
```

### Issue 3: Async Session Management

**Problem:** Database connections not properly closed.

**Solution:** Always use context managers:
```python
async with AsyncSessionLocal() as session:
    # Do work
    await session.commit()
# Session automatically closed
```

### Issue 4: Celery Import Issues

**Problem:** Circular imports when setting up Celery.

**Solution:** Create separate `celery_app.py` and import tasks dynamically.

## ✅ Migration Checklist

- [x] Set up Python environment with Poetry
- [x] Install dependencies (FastAPI, SQLAlchemy, etc.)
- [x] Create database models
- [x] Set up Alembic migrations
- [x] Migrate conversion API endpoints
- [x] Integrate CloudConvert service
- [x] Set up Celery job queue
- [x] Implement JWT authentication
- [x] Add authorization middleware
- [x] Migrate PayFast payment integration
- [x] Run and verify migrations
- [x] Test all endpoints
- [x] Update documentation
- [x] Configure deployment

## 📈 Next Steps

1. **Update Frontend**: Update API client to point to Python backend (port 3007)
2. **Parallel Testing**: Run both backends side-by-side for comparison
3. **Load Testing**: Verify performance under load
4. **Monitoring**: Set up Sentry/logging for production
5. **Gradual Rollout**: Deploy to staging first, then production
6. **Decommission Node.js**: Once stable, shut down old backend

## 🔗 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [Pydantic Documentation](https://docs.pydantic.dev/)

---

**Migration Completed**: 2025-10-30
**Total Duration**: ~8 phases
**Lines of Code**: ~5,000+ Python (migrated from ~6,000 TypeScript)
**Status**: Production Ready ✅
