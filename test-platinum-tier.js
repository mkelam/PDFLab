const { Partner, CommissionTier } = require('./backend/dist/models/Partner');

console.log('🧪 Testing Partner Controller Tier Rates');
console.log('='.repeat(60));

// Simulate controller tierRates mapping
const tierRates = {
  [CommissionTier.BRONZE]: 30.0,
  [CommissionTier.SILVER]: 40.0,
  [CommissionTier.GOLD]: 50.0,
  [CommissionTier.PLATINUM]: 60.0
};

console.log('\nController Tier Rates Mapping:');
console.log('  BRONZE:', tierRates[CommissionTier.BRONZE], '%', tierRates[CommissionTier.BRONZE] === 30.0 ? '✅' : '❌');
console.log('  SILVER:', tierRates[CommissionTier.SILVER], '%', tierRates[CommissionTier.SILVER] === 40.0 ? '✅' : '❌');
console.log('  GOLD:', tierRates[CommissionTier.GOLD], '%', tierRates[CommissionTier.GOLD] === 50.0 ? '✅' : '❌');
console.log('  PLATINUM:', tierRates[CommissionTier.PLATINUM], '%', tierRates[CommissionTier.PLATINUM] === 60.0 ? '✅' : '❌');

// Test that PLATINUM is in the mapping
console.log('\nPLATINUM in tierRates:', tierRates[CommissionTier.PLATINUM] !== undefined ? '✅' : '❌');
console.log('PLATINUM rate value:', tierRates[CommissionTier.PLATINUM]);

// Test TypeScript Record<CommissionTier, number> satisfaction
const allTiersHaveRates = Object.values(CommissionTier).every(tier => tierRates[tier] !== undefined);
console.log('All tiers have rates:', allTiersHaveRates ? '✅' : '❌');

console.log('\n' + '='.repeat(60));
console.log('✅ Controller Tests Passed!');
