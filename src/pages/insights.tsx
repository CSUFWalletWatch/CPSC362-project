import React from "react";
import "./Insights.css";

const Insights = () => {
  // Placeholder values
  const monthlyBudget = 2000;
  const spentSoFar = 850;
  const savingsGoal = 500;
  const savedSoFar = 200;

  // Date calculations
  const today = new Date();
  const lastDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  );

  const daysLeft = Math.max(
    1,
    lastDayOfMonth.getDate() - today.getDate() + 1
  );

  const weeksLeft = daysLeft / 7;

  // Spending calculations
  const remainingBudget = monthlyBudget - spentSoFar;
  const weeklySpendingLimit = remainingBudget / weeksLeft;

  // Savings calculations
  const remainingSavings = savingsGoal - savedSoFar;
  const weeklySavingsNeeded = remainingSavings / weeksLeft;

  return (
    <div className="insights-container">
      <h1>Insights</h1>

      <div className="insight-card">
        <h2>Spending Insight</h2>
        <p>Monthly Budget: ${monthlyBudget}</p>
        <p>Spent So Far: ${spentSoFar}</p>
        <p>Remaining This Month: ${remainingBudget.toFixed(2)}</p>
        <p>
          Weekly Spending Limit: ${weeklySpendingLimit.toFixed(2)} / week
        </p>
      </div>

      <div className="insight-card">
        <h2>Savings Insight</h2>
        <p>Savings Goal: ${savingsGoal}</p>
        <p>Saved So Far: ${savedSoFar}</p>
        <p>Remaining Savings Goal: ${remainingSavings.toFixed(2)}</p>
        <p>
          Weekly Savings Needed: ${weeklySavingsNeeded.toFixed(2)} / week
        </p>
      </div>
    </div>
  );
};

export default Insights;
