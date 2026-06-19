import { execSync } from 'child_process';

const testScripts = [
  'test:auth',
  'test:rbac',
  'test:profile',
  'test:jobs',
  'test:resumes',
  'test:applications',
  'test:notifications',
  'test:analytics',
  'test:dashboard',
  'test:ai-analysis',
  'test:match-engine',
  'test:career-advisor',
];

async function runAll() {
  let passedCount = 0;
  let failedCount = 0;
  const failedTests: string[] = [];

  console.log('🏁 Starting all Integration Tests sequentially...\n');

  for (const script of testScripts) {
    console.log(`\n======================================================`);
    console.log(`🏃 Running npm run ${script}...`);
    console.log(`======================================================\n`);

    try {
      execSync(`npm run ${script}`, { stdio: 'inherit' });
      passedCount++;
      console.log(`\n✅ npm run ${script} passed successfully!\n`);
    } catch {
      failedCount++;
      failedTests.push(script);
      console.error(`\n❌ npm run ${script} failed!\n`);
    }
  }

  console.log('\n======================================================');
  console.log('📊 INTEGRATION TEST SUITE SUMMARY');
  console.log('======================================================');
  console.log(`Total test suites: ${testScripts.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log(`\n❌ Failed test suites: ${failedTests.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\n🎉 All integration tests passed perfectly!');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
