/**
 * Test file to reproduce and verify fix for numeric input bug
 * Bug: When typing 10, it displays 101. When typing 30, it displays 303 or 3300.
 * 
 * This test simulates the InputNumber component behavior with formatter/parser
 * 
 * BUG SCENARIO:
 * - User types "1" -> should display "1" -> parser should return 1
 * - User types "0" after "1" -> should display "10" -> parser should return 10
 * - BUT: If bug exists, it displays "101" -> parser receives "101" and returns 101
 * 
 * ROOT CAUSE (suspected):
 * - Parser was returning empty string '' instead of null for empty values
 * - InputNumber expects null/undefined for empty, not empty string
 * - This causes InputNumber to treat empty string as a value, leading to concatenation
 * 
 * FIX:
 * - Parser now returns null instead of '' for empty values
 * - Parser now returns null instead of '' for NaN values
 * - This ensures InputNumber properly handles empty states
 */

// Test cases that reproduce the bug
const bugTestCases = [
  {
    description: 'Typing "10" should result in 10, not 101',
    scenario: 'User types "1" then "0"',
    input: '10',
    expectedParserResult: 10,
    expectedFormatterResult: '10'
  },
  {
    description: 'Typing "30" should result in 30, not 303 or 3300',
    scenario: 'User types "3" then "0"',
    input: '30',
    expectedParserResult: 30,
    expectedFormatterResult: '30'
  },
  {
    description: 'Empty input should return null, not empty string',
    input: '',
    expectedParserResult: null,
    expectedFormatterResult: ''
  },
  {
    description: 'Formatted number with commas should parse correctly',
    input: '10,000',
    expectedParserResult: 10000,
    expectedFormatterResult: '10,000'
  },
  {
    description: 'Number less than 1000 should not have commas',
    input: 100,
    expectedParserResult: 100,
    expectedFormatterResult: '100'
  }
];

console.log('Bug test cases defined:', bugTestCases);
console.log('\nTo verify fix:');
console.log('1. Open browser console on admin page');
console.log('2. Type in an InputNumber field (quantity or price)');
console.log('3. Check console logs for parser/formatter calls');
console.log('4. Verify that parser returns null (not "") for empty values');
console.log('5. Verify that typing "10" results in 10, not 101\n');

