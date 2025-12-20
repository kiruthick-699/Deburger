// This file contains multiple unused variables and imports

const fs = require('fs'); // ISSUE: Unused import
const path = require('path'); // ISSUE: Unused import

// ISSUE: Multiple unused variables
const API_KEY = 'abc123';
const MAX_RETRIES = 3;
const TIMEOUT = 5000;
const DEBUG_MODE = true;

function calculateTotal(items) {
  // ISSUE: Unused variable
  const taxRate = 0.08;
  
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  
  // Only using subtotal, not applying tax
  return subtotal;
}

function formatUserName(firstName, lastName, middleName) {
  // ISSUE: middleName parameter is unused
  return `${firstName} ${lastName}`;
}

// ISSUE: Unused function
function deprecatedHelper() {
  console.log('This function is no longer used');
}

module.exports = {
  calculateTotal,
  formatUserName
};
