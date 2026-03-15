import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock supabase-gateway
vi.mock('../assets/js/supabase-gateway.js', () => ({
  getWineById: vi.fn(),
}));

// Mock logger
vi.mock('../assets/js/logger.js', () => ({
  breadcrumb: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

import { render } from '../assets/js/views/bottle-page.js';
import { getWineById } from '../assets/js/supabase-gateway.js';

describe('bottle-page view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    getWineById.mockImplementation(() => new Promise(() => {})); // never resolves
    render(container, 'test-winery', 'wine-1'); // don't await
    expect(container.innerHTML).toContain('Loading wine details');
  });

  it('renders wine details on success', async () => {
    getWineById.mockResolvedValue({
      id: 'wine-1',
      name: 'Estate Merlot',
      varietal: 'Merlot',
      vintage_year: 2021,
      region: 'Napa Valley',
      price: '$45',
      description: 'A rich, full-bodied red.',
      tasting_notes: 'Dark cherry, vanilla, and oak.',
      food_pairings: ['Grilled steak', 'Aged cheddar'],
      wineries: { name: 'Sunset Vineyard', slug: 'test-winery' },
    });

    await render(container, 'test-winery', 'wine-1');

    expect(container.innerHTML).toContain('Estate Merlot');
    expect(container.innerHTML).toContain('Sunset Vineyard');
    expect(container.innerHTML).toContain('Merlot');
    expect(container.innerHTML).toContain('2021');
    expect(container.innerHTML).toContain('Napa Valley');
    expect(container.innerHTML).toContain('$45');
    expect(container.innerHTML).toContain('A rich, full-bodied red.');
    expect(container.innerHTML).toContain('Dark cherry, vanilla, and oak.');
    expect(container.innerHTML).toContain('Grilled steak');
    expect(container.innerHTML).toContain('Aged cheddar');
  });

  it('shows error state when wine not found', async () => {
    getWineById.mockRejectedValue(new Error('Not found'));

    await render(container, 'test-winery', 'bad-id');

    expect(container.innerHTML).toContain('Wine not found');
    expect(container.innerHTML).toContain('QR code may be invalid');
  });

  it('shows error when slug does not match', async () => {
    getWineById.mockResolvedValue({
      id: 'wine-1',
      name: 'Estate Merlot',
      wineries: { name: 'Sunset Vineyard', slug: 'sunset-vineyard' },
    });

    await render(container, 'wrong-slug', 'wine-1');

    expect(container.innerHTML).toContain('Wine not found');
  });

  it('renders without optional fields', async () => {
    getWineById.mockResolvedValue({
      id: 'wine-1',
      name: 'Simple Wine',
      wineries: { name: 'Test Winery', slug: 'test-winery' },
      // no varietal, region, price, description, tasting_notes, food_pairings
    });

    await render(container, 'test-winery', 'wine-1');

    expect(container.innerHTML).toContain('Simple Wine');
    expect(container.innerHTML).toContain('Test Winery');
    expect(container.innerHTML).not.toContain('About This Wine');
    expect(container.innerHTML).not.toContain('Tasting Notes');
    expect(container.innerHTML).not.toContain('Food Pairings');
  });

  it('escapes HTML in wine data (XSS prevention)', async () => {
    getWineById.mockResolvedValue({
      id: 'wine-1',
      name: '<script>alert("xss")</script>',
      varietal: '<img onerror=alert(1)>',
      wineries: { name: 'Safe Winery', slug: 'safe' },
    });

    await render(container, 'safe', 'wine-1');

    expect(container.innerHTML).not.toContain('<script>');
    expect(container.innerHTML).not.toContain('<img');
    expect(container.innerHTML).toContain('&lt;script&gt;');
  });
});
