#!/bin/bash

# Script to migrate from in-memory cache to persistent cache
# This updates all imports automatically

echo "🔄 Migrating to persistent cache..."

# Files that import dataCache
FILES=(
  "src/hooks/useClients.ts"
  "src/hooks/useSalesMetrics.ts"
  "src/hooks/useOpportunities.ts"
  "src/hooks/usePerformanceData.ts"
  "src/components/infrastructure/InfrastructureOverview.tsx"
)

# Backup directory
BACKUP_DIR="cache-migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backups in $BACKUP_DIR..."

# Process each file
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ Processing $file"

    # Create backup
    cp "$file" "$BACKUP_DIR/$(basename $file).backup"

    # Replace import statement
    sed -i '' "s|from '../lib/cache'|from '../lib/cache-persistent'|g" "$file"
    sed -i '' "s|from '../../lib/cache'|from '../../lib/cache-persistent'|g" "$file"

    # Add alias for dataCache if needed
    sed -i '' "s|import { dataCache|import { persistentCache as dataCache|g" "$file"
    sed -i '' "s|import { DataCache|import { PersistentCache as DataCache|g" "$file"

  else
    echo "  ⚠️  File not found: $file"
  fi
done

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Summary:"
echo "  - Backups saved to: $BACKUP_DIR"
echo "  - Files updated: ${#FILES[@]}"
echo ""
echo "🧪 Next steps:"
echo "  1. Test your app: npm run dev"
echo "  2. Close browser and reopen to verify persistence"
echo "  3. If issues occur, restore from backup:"
echo "     cp $BACKUP_DIR/* src/hooks/"
echo ""
