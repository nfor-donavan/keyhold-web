// Same rent-split maths as the mobile app: the month's total cost (rent +
// utilities) is shared out by how many days each person is present.
export function calculateSplit({ members, totalRent, utilities, year, month }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalUtilities = utilities.reduce((sum, u) => sum + (parseFloat(u.amount) || 0), 0);
  const totalCost = (parseFloat(totalRent) || 0) + totalUtilities;

  const weighted = members.map((m) => {
    const moveInDay = Math.min(Math.max(parseInt(m.moveInDay, 10) || 1, 1), daysInMonth);
    return { ...m, daysPresent: daysInMonth - moveInDay + 1 };
  });
  const totalWeight = weighted.reduce((sum, m) => sum + m.daysPresent, 0) || 1;

  return {
    daysInMonth,
    totalCost,
    totalUtilities,
    results: weighted.map((m) => ({ ...m, share: (totalCost * m.daysPresent) / totalWeight })),
  };
}
