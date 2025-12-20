// Sample JS file with unused variable
const unusedVariable = "never used";

function calculateSum(a, b) {
  return a + b;
}

// Sample async function without try-catch
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return data;
}

// Long function with deep nesting
function processData(items) {
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'valid') {
        if (item.active) {
          if (item.score > 50) {
            console.log('Processing: ' + item.name);
          }
        }
      }
    }
  }
}

export { calculateSum, fetchData, processData };
