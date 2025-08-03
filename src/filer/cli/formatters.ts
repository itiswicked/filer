export function displaySnapshotList(snapshots: Array<{ number: number; date: Date }>): void {
  // Create formatted output with number and datetime columns
  console.log('Number  Datetime');
  console.log('------  --------');

  for (const snapshot of snapshots) {
    const numberStr = snapshot.number.toString().padEnd(6);
    const formattedDate = formatDate(snapshot.date);
    console.log(`${numberStr}  ${formattedDate}`);
  }
}

function formatDate(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${month} ${day}, ${year} - ${hours}:${minutes}:${seconds}`;
}