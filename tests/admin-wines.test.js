import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../assets/js/supabase-gateway.js', () => ({
  getWinesByWinery: vi.fn(),
  getWineById: vi.fn(),
  createWine: vi.fn(),
  updateWine: vi.fn(),
  toggleWineActive: vi.fn(),
}));

vi.mock('../assets/js/router.js', () => ({
  navigate: vi.fn(),
}));

vi.mock('../assets/js/logger.js', () => ({
  error: vi.fn(),
  breadcrumb: vi.fn(),
}));

vi.mock('../assets/js/components/qr-generator.js', () => ({
  generateQR: vi.fn(),
  getBottleUrl: vi.fn((slug, id) => `http://localhost/${slug}/${id}`),
}));

// Let the real tag-input run — it's a pure DOM component, no external deps to mock

import { renderWineList, renderWineForm } from '../assets/js/views/admin-wines.js';
import * as gateway from '../assets/js/supabase-gateway.js';
import * as state from '../assets/js/state.js';
import { navigate } from '../assets/js/router.js';

const MOCK_WINERY = { id: 'w1', name: 'Test Winery', slug: 'test-winery' };

const MOCK_WINES = [
  { id: 'wine-1', name: 'Merlot', varietal: 'Merlot', vintage_year: 2021, price: '$30', is_active: true, food_pairings: ['Steak', 'Pasta'] },
  { id: 'wine-2', name: 'Chardonnay', varietal: 'Chardonnay', vintage_year: 2022, price: '$25', is_active: false, food_pairings: [] },
];

describe('admin-wines', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
    state.resetAllState();
    vi.clearAllMocks();
  });

  // ── renderWineList ────────────────────────────────────────────────────

  describe('renderWineList', () => {
    it('shows message when no winery is set', async () => {
      await renderWineList(container);
      expect(container.innerHTML).toContain('not assigned to any winery');
    });

    it('renders wine table with all wines', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.getWinesByWinery.mockResolvedValue(MOCK_WINES);

      await renderWineList(container);

      expect(container.innerHTML).toContain('Merlot');
      expect(container.innerHTML).toContain('Chardonnay');
      expect(container.innerHTML).toContain('2021');
      expect(container.innerHTML).toContain('$30');
      expect(container.querySelectorAll('tbody tr').length).toBe(2);
    });

    it('shows Active/Inactive badges', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.getWinesByWinery.mockResolvedValue(MOCK_WINES);

      await renderWineList(container);

      const badges = container.querySelectorAll('.badge');
      const badgeTexts = Array.from(badges).map(b => b.textContent.trim());
      expect(badgeTexts).toContain('Active');
      expect(badgeTexts).toContain('Inactive');
    });

    it('has Add Wine button that navigates', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.getWinesByWinery.mockResolvedValue([]);

      await renderWineList(container);

      container.querySelector('#add-wine-btn').click();
      expect(navigate).toHaveBeenCalledWith('/admin/wines/new');
    });

    it('has Edit buttons that navigate to edit page', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.getWinesByWinery.mockResolvedValue(MOCK_WINES);

      await renderWineList(container);

      const editBtn = container.querySelector('[data-edit="wine-1"]');
      editBtn.click();
      expect(navigate).toHaveBeenCalledWith('/admin/wines/wine-1/edit');
    });

    it('applies row--inactive class to inactive wines', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.getWinesByWinery.mockResolvedValue(MOCK_WINES);

      await renderWineList(container);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].classList.contains('row--inactive')).toBe(false);
      expect(rows[1].classList.contains('row--inactive')).toBe(true);
    });

    it('has a QR modal that starts hidden', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.getWinesByWinery.mockResolvedValue(MOCK_WINES);

      await renderWineList(container);

      const modal = container.querySelector('#qr-modal');
      expect(modal).not.toBeNull();
      expect(modal.hidden).toBe(true);
    });

    it('shows toast on fetch error', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.getWinesByWinery.mockRejectedValue(new Error('Network error'));

      await renderWineList(container);

      const toast = document.getElementById('bl-toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Could not load wine list');
    });
  });

  // ── renderWineForm ────────────────────────────────────────────────────

  describe('renderWineForm', () => {
    it('redirects when no winery is set', async () => {
      await renderWineForm(container, null);
      expect(navigate).toHaveBeenCalledWith('/admin/wines');
    });

    it('renders "Add New Wine" form when wineId is null', async () => {
      state.setCurrentWinery(MOCK_WINERY);

      await renderWineForm(container, null);

      expect(container.innerHTML).toContain('Add New Wine');
      expect(container.querySelector('#wine-form')).not.toBeNull();
      expect(container.querySelector('button[type="submit"]').textContent).toBe('Create Wine');
    });

    it('renders "Edit" form when wineId is provided', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      state.setWines(MOCK_WINES);

      await renderWineForm(container, 'wine-1');

      expect(container.innerHTML).toContain('Edit Merlot');
      expect(container.querySelector('#wine-name').value).toBe('Merlot');
      expect(container.querySelector('button[type="submit"]').textContent).toBe('Save Changes');
    });

    it('cancel button navigates back to wine list', async () => {
      state.setCurrentWinery(MOCK_WINERY);

      await renderWineForm(container, null);

      container.querySelector('#cancel-btn').click();
      expect(navigate).toHaveBeenCalledWith('/admin/wines');
    });

    it('submits new wine data via createWine', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.createWine.mockResolvedValue({ id: 'wine-new' });

      await renderWineForm(container, null);

      container.querySelector('#wine-name').value = 'New Cab';
      container.querySelector('#wine-varietal').value = 'Cabernet';
      container.querySelector('#wine-vintage').value = '2023';
      container.querySelector('#wine-region').value = 'Sonoma';
      container.querySelector('#wine-price').value = '$50';

      // Add food pairings via the tag input
      const tagField = container.querySelector('.tag-input__field');
      tagField.value = 'Steak';
      tagField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      tagField.value = 'Lamb';
      tagField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      container.querySelector('#wine-form').dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(gateway.createWine).toHaveBeenCalledWith({
          name: 'New Cab',
          varietal: 'Cabernet',
          vintage_year: 2023,
          region: 'Sonoma',
          price: '$50',
          description: null,
          tasting_notes: null,
          food_pairings: ['Steak', 'Lamb'],
          winery_id: 'w1',
        });
        expect(navigate).toHaveBeenCalledWith('/admin/wines');
      });
    });

    it('submits edit via updateWine', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      state.setWines(MOCK_WINES);
      gateway.updateWine.mockResolvedValue({ id: 'wine-1' });

      await renderWineForm(container, 'wine-1');

      container.querySelector('#wine-name').value = 'Updated Merlot';
      container.querySelector('#wine-form').dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(gateway.updateWine).toHaveBeenCalledWith('wine-1', expect.objectContaining({
          name: 'Updated Merlot',
        }));
        expect(navigate).toHaveBeenCalledWith('/admin/wines');
      });
    });

    it('shows toast and re-enables button on save failure', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      gateway.createWine.mockRejectedValue(new Error('DB error'));

      await renderWineForm(container, null);

      container.querySelector('#wine-name').value = 'Fail Wine';
      const submitBtn = container.querySelector('button[type="submit"]');
      container.querySelector('#wine-form').dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(submitBtn.disabled).toBe(false);
      });

      expect(submitBtn.textContent).toBe('Create Wine');
      expect(document.getElementById('bl-toast').textContent).toContain('Could not save wine');
    });

    it('fetches wine from gateway when not in state cache', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      // Don't call state.setWines — wine not in cache
      gateway.getWineById.mockResolvedValue(MOCK_WINES[0]);

      await renderWineForm(container, 'wine-1');

      expect(gateway.getWineById).toHaveBeenCalledWith('wine-1');
      expect(container.innerHTML).toContain('Edit Merlot');
    });

    it('loads existing food pairings as tags when editing', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      state.setWines(MOCK_WINES);

      await renderWineForm(container, 'wine-1');

      const tags = container.querySelectorAll('.tag-input__tag');
      expect(tags.length).toBe(2);
      expect(tags[0].textContent).toContain('Steak');
      expect(tags[1].textContent).toContain('Pasta');
    });

    it('shows QR section only for existing wines', async () => {
      state.setCurrentWinery(MOCK_WINERY);
      state.setWines(MOCK_WINES);

      // New wine — no QR
      await renderWineForm(container, null);
      expect(container.querySelector('#wine-qr-container')).toBeNull();

      // Existing wine — has QR
      await renderWineForm(container, 'wine-1');
      expect(container.querySelector('#wine-qr-container')).not.toBeNull();
    });
  });
});
