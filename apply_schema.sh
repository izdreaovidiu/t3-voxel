#!/bin/bash
# Script to apply Prisma schema changes

echo "Pushing Prisma schema to database..."
npx prisma db push

echo "Generating Prisma client..."
npx prisma generate

echo "Done! You can now test the invite functionality."
