export const getPreviousPeriods = (period, numberOfPeriods, periodType) => {
    const periods = [];
    let currentDate = new Date(period.startDate);

    for (let i = 0; i < numberOfPeriods; i++) {
        const newPeriod = new Date(currentDate);
        if (periodType === 'monthly') {
            newPeriod.setMonth(newPeriod.getMonth() - i);
        } else if (periodType === 'yearly') {
            newPeriod.setFullYear(newPeriod.getFullYear() - i);
        }
        periods.push({
            id: newPeriod.toISOString().split('T')[0], // Adjust format as needed
            displayName: newPeriod.toDateString(),
        });
    }

    return periods.reverse();
};
