#!/bin/bash

echo "Applying ServerInvite table migration..."

# Execută SQL-ul direct în database
psql $DATABASE_URL -f prisma/migrations/001_add_server_invites.sql

echo "Generating Prisma client..."
npx prisma generate

echo "Migration complete! ServerInvite table is now available."
echo "Restart your development server to use the new table."
