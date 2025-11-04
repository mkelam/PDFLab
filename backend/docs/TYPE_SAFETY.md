# TypeScript Type Safety Guidelines

## Core Principles

1. **NEVER use `any`** - Use `unknown` if you truly don't know the type
2. **ALWAYS define interfaces** for Sequelize models
3. **ALWAYS mark optional properties** with `?`
4. **NEVER use `as` type assertions** unless absolutely necessary
5. **ALWAYS handle null/undefined** explicitly

## Common Patterns

### Sequelize Models

```typescript
// ✅ CORRECT
export interface UserAttributes {
  id: string
  email: string
  name?: string // Optional
  created_at: Date
  updated_at: Date
}

export interface UserCreationAttributes
  extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'name'> {}

export class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  public id!: string
  public email!: string
  public name?: string
  public readonly created_at!: Date
  public readonly updated_at!: Date
}

// ❌ WRONG - Missing interfaces
export class User extends Model {
  public id: any
  public email: any
}
```

### Handling API Responses

```typescript
// ✅ CORRECT
import type { Request, Response } from 'express'

interface LoginRequest {
  email: string
  password: string
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as LoginRequest

  if (!email || !password) {
    res.status(400).json({ error: 'Missing credentials' })
    return
  }

  // ...
}

// ❌ WRONG - Implicit any
export const login = async (req, res) => {
  const { email, password } = req.body // any type
  // ...
}
```

### Enum Usage

```typescript
// ✅ CORRECT
export enum UserPlan {
  FREE = 'free',
  PRO = 'pro'
}

const plan: UserPlan = UserPlan.FREE

// ❌ WRONG - String literal
const plan = 'free' // Could be any string
```

### Null Checking

```typescript
// ✅ CORRECT
const user = await User.findByPk(userId)

if (!user) {
  throw new Error('User not found')
}

// Now TypeScript knows user is not null
console.log(user.email)

// ❌ WRONG - Non-null assertion
const user = await User.findByPk(userId)
console.log(user!.email) // Dangerous!
```

### Update Operations

```typescript
// ✅ CORRECT - Use undefined, not null
await ConversionJob.update(
  {
    input_file: undefined,
    output_file: undefined
  },
  { where: { id: job_id } }
)

// ❌ WRONG - Using null
await ConversionJob.update(
  {
    input_file: null, // TypeScript error
    output_file: null
  },
  { where: { id: job_id } }
)
```

### Enum Constants

```typescript
// ✅ CORRECT - Use enum constants
import { JobStatus } from '../models/ConversionJob'

await job.update({
  status: JobStatus.PENDING
})

// ❌ WRONG - String literals
await job.update({
  status: 'pending' // Type error
})
```

## Pre-Commit Checklist

Before committing, ensure:

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No `@ts-ignore` comments added
- [ ] All new models have proper interfaces
- [ ] All API handlers have type annotations
- [ ] Tests compile without errors

## When You See Type Errors

1. **Read the error carefully** - TypeScript errors are descriptive
2. **Check the tsconfig.json** - Ensure you understand the strict rules
3. **Don't use `any` as a quick fix** - Find the proper type
4. **Ask for help** - Better to ask than introduce type bugs

## Development Workflow

### Recommended Commands

```bash
# Development with live type checking (RECOMMENDED)
npm run dev:typecheck

# Just development server (faster, but no type checking)
npm run dev

# Before committing (runs automatically via pre-commit hook)
npm run validate

# Check type health
npm run type-health
```

### VSCode Setup

Install these recommended extensions:
- ESLint
- Prettier
- Error Lens (shows errors inline)
- TypeScript Next

Enable "Format on Save" and "Auto Fix on Save" in VSCode settings.

## Common TypeScript Errors We Fixed

### 1. Optional Properties in Model Interfaces

**Error**: Property 'name' is missing in type

**Fix**: Mark all optional fields in `UserCreationAttributes`:

```typescript
interface UserCreationAttributes extends Optional<
  UserAttributes,
  'id' | 'created_at' | 'updated_at' | 'name' // Add all optional fields
> {}
```

### 2. Readonly Property Assignments

**Error**: Cannot assign to 'updated_at' because it is a read-only property

**Fix**: Remove manual assignments - Sequelize handles this:

```typescript
// ❌ WRONG
user.updated_at = new Date()
await user.save()

// ✅ CORRECT
await user.save() // Sequelize auto-updates timestamps
```

### 3. Missing Imports

**Error**: Property 'QueryTypes' does not exist on type 'Sequelize'

**Fix**: Import QueryTypes from sequelize:

```typescript
import { Op, QueryTypes } from 'sequelize'

// Then use it
const results = await sequelize.query(sql, { type: QueryTypes.SELECT })
```

### 4. Dynamic File Size Functions

**Error**: Type '(req: Request) => number' is not assignable to type 'number'

**Fix**: Multer expects a static number:

```typescript
// ❌ WRONG
limits: {
  fileSize: (req) => getPlanLimit(req.userPlan)
}

// ✅ CORRECT
limits: {
  fileSize: 524288000 // Static max, validate plan in route handler
}
```

## Resources

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/docs/handbook/strict-mode.html)
- [Sequelize TypeScript](https://sequelize.org/docs/v6/other-topics/typescript/)
- [Express with TypeScript](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**Last Updated**: 2025-11-01
**Maintained by**: PDFLab Development Team
