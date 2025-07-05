function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getDateNDaysAgo(n) {
    const now = new Date(); // current date and time
    now.setDate(now.getDate() - n); // subtract n days
    return formatDate(now);
}

// Create a function to get dates based on dynamic day range
export function getDatesForRange(dayRange = 3) {
    return {
        startDate: getDateNDaysAgo(dayRange), // configurable days back
        endDate: getDateNDaysAgo(1) // leave at 1 to get yesterday's data
    }
}

// Keep the original dates object for backward compatibility
export const dates = {
    startDate: getDateNDaysAgo(3), // alter days to increase/decrease data set
    endDate: getDateNDaysAgo(1) // leave at 1 to get yesterday's data
}