import { applyPromoCodeLimitsUpdates } from './src/utils/applyPromoCodeLimitsUpdates.ts';
import { applyPromoCodeFunctionMigration } from './src/utils/applyMigration.ts';

async function applyMigrations() {
  console.log('Starting migration process...');
  
  // First, apply the promo code limits updates
  const limitsResult = await applyPromoCodeLimitsUpdates();
  console.log('Promo code limits update result:', limitsResult);
  
  // Then, apply the promo code function migration
  const functionResult = await applyPromoCodeFunctionMigration();
  console.log('Promo code function migration result:', functionResult);
  
  console.log('Migration process completed.');
  
  if (limitsResult.success && functionResult.success) {
    console.log('All migrations applied successfully!');
    console.log('Please restart the application to see the changes.');
  } else {
    console.error('Some migrations failed:');
    if (!limitsResult.success) {
      console.error('- Promo code limits update:', limitsResult.message);
    }
    if (!functionResult.success) {
      console.error('- Promo code function migration:', functionResult.message);
    }
  }
}

// Run the migrations
applyMigrations().catch(error => {
  console.error('Migration process failed with error:', error);
});
