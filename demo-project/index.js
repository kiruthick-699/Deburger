// This file intentionally contains issues that will be detected by the AI Debugging Assistant
// Issues: unused variables, async without try-catch

const express = require('express');
const lodash = require('lodash'); // ISSUE: unused import

const app = express();
const PORT = 3000;

// ISSUE: Unused variable
const unusedConfig = {
  timeout: 5000,
  retries: 3
};

// ISSUE: Async function without try-catch
async function fetchUserData(userId) {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  const data = await response.json();
  return data;
}

// ISSUE: Async function without error handling
async function processOrders(orders) {
  const results = await Promise.all(
    orders.map(order => fetchOrderDetails(order.id))
  );
  return results;
}

async function fetchOrderDetails(orderId) {
  const response = await fetch(`https://api.example.com/orders/${orderId}`);
  return response.json();
}

app.get('/users/:id', async (req, res) => {
  // ISSUE: Async handler without try-catch
  const user = await fetchUserData(req.params.id);
  res.json(user);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
