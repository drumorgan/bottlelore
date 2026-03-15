import { describe, it, expect } from 'vitest';
import { TABLES } from '../assets/js/database-tables.js';

describe('TABLES', () => {
  it('exports all required table names', () => {
    expect(TABLES.WINERIES).toBe('wineries');
    expect(TABLES.WINES).toBe('wines');
    expect(TABLES.WINERY_ADMINS).toBe('winery_admins');
    expect(TABLES.FLIGHTS).toBe('flights');
    expect(TABLES.FLIGHT_WINES).toBe('flight_wines');
  });

  it('has exactly 5 tables', () => {
    expect(Object.keys(TABLES)).toHaveLength(5);
  });
});
