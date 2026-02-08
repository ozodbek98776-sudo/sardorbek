const mongoose = require('mongoose');
require('dotenv').config();

const Expense = require('../models/Expense');

async function checkExpensePerformance() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Count total expenses
    console.log('\n📊 Analyzing expense data...');
    const totalCount = await Expense.countDocuments();
    console.log(`Total expenses: ${totalCount.toLocaleString()}`);

    // 2. Count by date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const todayCount = await Expense.countDocuments({ date: { $gte: today } });
    const weekCount = await Expense.countDocuments({ date: { $gte: weekAgo } });
    const monthCount = await Expense.countDocuments({ date: { $gte: monthAgo } });
    const yearCount = await Expense.countDocuments({ date: { $gte: yearAgo } });
    const oldCount = await Expense.countDocuments({ date: { $lt: yearAgo } });

    console.log(`\nExpenses by date range:`);
    console.log(`  Today: ${todayCount.toLocaleString()}`);
    console.log(`  Last 7 days: ${weekCount.toLocaleString()}`);
    console.log(`  Last 30 days: ${monthCount.toLocaleString()}`);
    console.log(`  Last year: ${yearCount.toLocaleString()}`);
    console.log(`  Older than 1 year: ${oldCount.toLocaleString()}`);

    // 3. Count by category
    console.log(`\nExpenses by category:`);
    const byCategory = await Expense.aggregate([
      { $group: { 
        _id: '$category', 
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      } },
      { $sort: { count: -1 } }
    ]);
    
    byCategory.forEach(cat => {
      console.log(`  ${cat._id}: ${cat.count.toLocaleString()} (${(cat.total / 1000000).toFixed(2)}M so'm)`);
    });

    // 4. Test query performance
    console.log(`\n⏱️ Testing query performance...`);
    
    // Test 1: Get recent expenses
    const start1 = Date.now();
    await Expense.find()
      .select('category amount description date createdBy')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .limit(20)
      .lean();
    const time1 = Date.now() - start1;
    console.log(`  Recent 20 expenses: ${time1}ms`);

    // Test 2: Get stats
    const start2 = Date.now();
    await Expense.aggregate([
      {
        $facet: {
          total: [{ $group: { _id: null, total: { $sum: '$amount' } } }],
          today: [
            { $match: { date: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          byCategory: [
            { $group: { 
              _id: '$category', 
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            } }
          ]
        }
      }
    ]).allowDiskUse(true);
    const time2 = Date.now() - start2;
    console.log(`  Stats aggregation: ${time2}ms`);

    // Test 3: Filtered query
    const start3 = Date.now();
    await Expense.find({ 
      category: 'kommunal',
      date: { $gte: monthAgo }
    })
      .select('category amount description date')
      .sort({ date: -1 })
      .limit(20)
      .lean();
    const time3 = Date.now() - start3;
    console.log(`  Filtered query (category + date): ${time3}ms`);

    // 5. Performance recommendations
    console.log(`\n💡 Performance recommendations:`);
    
    if (totalCount > 10000) {
      console.log(`  ⚠️ Large dataset (${totalCount.toLocaleString()} records)`);
      console.log(`     - Consider archiving expenses older than 1 year`);
      console.log(`     - Use pagination with smaller page sizes`);
      console.log(`     - Add date range filters by default`);
    }
    
    if (time1 > 1000) {
      console.log(`  ⚠️ Slow recent query (${time1}ms)`);
      console.log(`     - Check if indexes are being used`);
      console.log(`     - Run: db.expenses.explain() in MongoDB`);
    }
    
    if (time2 > 2000) {
      console.log(`  ⚠️ Slow stats query (${time2}ms)`);
      console.log(`     - Consider caching stats for 30-60 seconds`);
      console.log(`     - Use materialized views for stats`);
    }
    
    if (oldCount > 5000) {
      console.log(`  ⚠️ Many old records (${oldCount.toLocaleString()})`);
      console.log(`     - Archive expenses older than 1 year to separate collection`);
      console.log(`     - This will improve query performance significantly`);
    }

    console.log('\n✅ Performance check completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking performance:', error);
    process.exit(1);
  }
}

checkExpensePerformance();
