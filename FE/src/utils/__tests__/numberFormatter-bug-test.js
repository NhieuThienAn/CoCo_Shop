/**
 * Test to reproduce and verify fix for numeric input concatenation bug
 * 
 * BUG SCENARIO:
 * - User types "1" -> should display "1" -> parser receives "1" -> returns 1 -> onChange(1) -> state = 1
 * - User types "0" after "1" -> should display "10" -> parser receives "10" -> returns 10 -> onChange(10) -> state = 10
 * - BUT BUG: Parser receives "101" instead of "10" -> returns 101 -> onChange(101) -> state = 101 -> displays "101"
 * 
 * This test simulates the InputNumber component behavior
 */

// Simulate the current parser implementation
const parseInteger = (value) => {
  console.log('[TEST] parseInteger called with:', { value, type: typeof value });
  
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  const strValue = value.toString();
  const cleaned = strValue.replace(/\D/g, '');
  
  if (cleaned === '') {
    return null;
  }
  
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
};

// Simulate the current formatter implementation
const formatInteger = (value) => {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  let numStr;
  if (typeof value === 'string') {
    numStr = value.replace(/,/g, '').replace(/\./g, '');
  } else if (typeof value === 'number') {
    numStr = String(Math.floor(value || 0));
  } else {
    numStr = String(Math.floor(Number(value) || 0));
  }
  
  const shouldAddCommas = numStr.length >= 4;
  return shouldAddCommas 
    ? numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : numStr;
};

// Simulate InputNumber behavior
class MockInputNumber {
  constructor() {
    this.state = null; // Internal state
    this.displayValue = ''; // What user sees
  }

  // Simulate user typing
  simulateTyping(char) {
    console.log(`\n[TEST] User types: "${char}"`);
    console.log('[TEST] Current state:', { state: this.state, displayValue: this.displayValue });
    
    // InputNumber receives the new display value (what user typed)
    // This is where the bug might occur - if displayValue already has content
    const newDisplayValue = this.displayValue + char;
    console.log('[TEST] New display value (what parser will receive):', newDisplayValue);
    
    // Parser is called with the display value
    const parsedValue = parseInteger(newDisplayValue);
    console.log('[TEST] Parser returned:', parsedValue);
    
    // onChange is called with parsed value
    this.onChange(parsedValue);
    
    // Formatter is called with new state
    this.displayValue = formatInteger(this.state);
    console.log('[TEST] After formatting, display value:', this.displayValue);
    console.log('[TEST] Final state:', { state: this.state, displayValue: this.displayValue });
  }

  onChange(value) {
    console.log('[TEST] onChange called with:', value);
    this.state = value;
  }

  // Simulate the bug scenario: parser receives concatenated value
  simulateBugScenario() {
    console.log('\n=== SIMULATING BUG SCENARIO: Typing "10" results in "101" ===\n');
    
    // Step 1: User types "1"
    this.simulateTyping('1');
    // Expected: state = 1, display = "1"
    // If bug exists, might have: state = 1, display = "1" but parser received something else
    
    // Step 2: User types "0" 
    // BUG: If parser receives "10" + old state "1" = "101" or "10" + "1" = "101"
    this.simulateTyping('0');
    // Expected: state = 10, display = "10"
    // Bug result: state = 101, display = "101"
    
    console.log('\n=== BUG CHECK ===');
    if (this.state === 101) {
      console.log('❌ BUG REPRODUCED: State is 101 instead of 10');
      console.log('   This means parser received "101" instead of "10"');
      return true;
    } else if (this.state === 10) {
      console.log('✓ No bug: State is correctly 10');
      return false;
    } else {
      console.log(`⚠ Unexpected state: ${this.state}`);
      return true;
    }
  }
}

// Run test
console.log('=== Testing Number Formatter Parser Bug ===\n');

const test = new MockInputNumber();
const bugReproduced = test.simulateBugScenario();

if (bugReproduced) {
  console.log('\n❌ TEST FAILED: Bug was reproduced');
  console.log('   Need to investigate why parser receives concatenated value');
  process.exit(1);
} else {
  console.log('\n✓ TEST PASSED: No bug detected in this simulation');
  console.log('   However, the actual bug might occur in real InputNumber component');
  console.log('   Check browser console logs when typing in admin pages');
  process.exit(0);
}

