import { displaySnapshotList } from '../formatters';

describe('Formatters', () => {
  it('should display header and snapshots correctly', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const snapshots = [
      { number: 1, date: new Date(2024, 0, 15, 14, 30, 25) }, // Jan 15, 2024 14:30:25 local time
      { number: 2, date: new Date(2024, 0, 16, 9, 15, 42) },  // Jan 16, 2024 09:15:42 local time
    ];

    displaySnapshotList(snapshots);

    expect(consoleSpy).toHaveBeenCalledWith('Number  Datetime');
    expect(consoleSpy).toHaveBeenCalledWith('------  --------');
    expect(consoleSpy).toHaveBeenCalledWith('1       Jan 15, 2024 - 14:30:25');
    expect(consoleSpy).toHaveBeenCalledWith('2       Jan 16, 2024 - 09:15:42');

    consoleSpy.mockRestore();
  });

  it('should handle empty array gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    displaySnapshotList([]);

    expect(consoleSpy).toHaveBeenCalledWith('Number  Datetime');
    expect(consoleSpy).toHaveBeenCalledWith('------  --------');
    expect(consoleSpy).toHaveBeenCalledTimes(2); // Only header and divider

    consoleSpy.mockRestore();
  });
});