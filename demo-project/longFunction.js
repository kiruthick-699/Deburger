// This file contains a very long function to trigger the long-function rule

function generateComprehensiveReport(userData, orderData, analyticsData) {
  // ISSUE: This function is intentionally long (exceeds 50 lines)
  
  console.log('Starting report generation...');
  
  // Process user data
  const userSummary = {
    totalUsers: userData.length,
    activeUsers: userData.filter(u => u.active).length,
    inactiveUsers: userData.filter(u => !u.active).length
  };
  
  console.log('User summary:', userSummary);
  
  // Process order data
  const orderSummary = {
    totalOrders: orderData.length,
    completedOrders: orderData.filter(o => o.status === 'completed').length,
    pendingOrders: orderData.filter(o => o.status === 'pending').length,
    cancelledOrders: orderData.filter(o => o.status === 'cancelled').length
  };
  
  console.log('Order summary:', orderSummary);
  
  // Calculate revenue
  const totalRevenue = orderData
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.amount, 0);
  
  console.log('Total revenue:', totalRevenue);
  
  // Process analytics
  const analyticsSummary = {
    pageViews: analyticsData.pageViews || 0,
    uniqueVisitors: analyticsData.uniqueVisitors || 0,
    bounceRate: analyticsData.bounceRate || 0,
    avgSessionDuration: analyticsData.avgSessionDuration || 0
  };
  
  console.log('Analytics summary:', analyticsSummary);
  
  // Generate recommendations
  const recommendations = [];
  
  if (userSummary.inactiveUsers > userSummary.activeUsers * 0.3) {
    recommendations.push('High inactive user rate - consider re-engagement campaign');
  }
  
  if (orderSummary.cancelledOrders > orderSummary.totalOrders * 0.1) {
    recommendations.push('High cancellation rate - review checkout process');
  }
  
  if (analyticsSummary.bounceRate > 0.6) {
    recommendations.push('High bounce rate - improve landing page');
  }
  
  // Build final report
  const report = {
    generatedAt: new Date().toISOString(),
    userMetrics: userSummary,
    orderMetrics: orderSummary,
    revenue: totalRevenue,
    analytics: analyticsSummary,
    recommendations: recommendations,
    summary: `Report for ${userData.length} users and ${orderData.length} orders`
  };
  
  console.log('Report generation complete');
  
  return report;
}

module.exports = { generateComprehensiveReport };
