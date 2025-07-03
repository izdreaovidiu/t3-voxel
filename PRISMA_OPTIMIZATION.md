# Prisma Connection Pool Optimization

## Problem
The application was experiencing connection pool timeouts due to:
- Infinite loops in React components causing excessive database queries
- Default connection pool settings being too restrictive
- Socket reconnections creating multiple database connections

## Solutions Applied

### 1. Connection Pool Configuration
Update your `.env` file with optimized DATABASE_URL:

```bash
# For PostgreSQL - Optimized for development
DATABASE_URL="postgresql://postgres:password@localhost:5432/voxel?connection_limit=25&pool_timeout=20&connect_timeout=10"

# For Production (adjust based on your database plan)
DATABASE_URL="postgresql://user:password@host:port/db?connection_limit=15&pool_timeout=15&connect_timeout=5"
```

### 2. Connection Pool Parameters Explained

- `connection_limit`: Maximum number of database connections (default: 17)
  - Development: 25 (allows for more concurrent connections during dev)
  - Production: 15 (adjust based on your database plan limits)

- `pool_timeout`: Time in seconds to wait for a connection (default: 10)
  - Increased to 20s for development to handle slower local databases
  - Keep at 15s for production

- `connect_timeout`: Time in seconds to wait for initial connection
  - Set to 10s for development, 5s for production

### 3. Database Connection Best Practices

#### In your components:
- ✅ Use `useCallback` for socket functions to prevent recreations
- ✅ Use proper dependency arrays in `useEffect`
- ✅ Check `isConnected` before socket operations
- ❌ Don't include socket functions in useEffect dependencies if they're wrapped in useCallback

#### In your socket server:
- ✅ Track user connections to prevent duplicates
- ✅ Check if user is already in channel before joining
- ✅ Properly clean up connections on disconnect
- ❌ Don't allow multiple joins to the same channel/server

### 4. Monitoring Connection Pool Usage

Add this to your development script to monitor connections:

```javascript
// Add to your dev script or create a monitoring endpoint
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// This will log all database queries and connection info
```

### 5. Additional Optimizations

#### Schema-level:
- Use proper indexes for frequently queried fields
- Consider using `relationMode = "prisma"` for better connection handling

#### Application-level:
- Implement proper error boundaries in React
- Use connection pooling at the application level if needed
- Consider implementing query caching for frequently accessed data

### 6. Troubleshooting

If you still get connection pool errors:

1. **Check for infinite loops**: Look for React components that trigger useEffect continuously
2. **Monitor socket connections**: Ensure users aren't connecting multiple times
3. **Increase pool size**: Temporarily increase connection_limit to identify the root cause
4. **Use Prisma logging**: Enable query logging to see which queries are consuming connections

### 7. Emergency Fix

If problems persist, restart your development environment:

```bash
# Stop all processes
pkill -f "node.*next"
pkill -f "socket"

# Clear Next.js cache
rm -rf .next

# Restart database
# For PostgreSQL:
brew services restart postgresql

# Restart development
bun run dev
```
