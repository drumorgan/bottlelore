import * as logger from '../logger.js';
import { escapeHtml, showToast } from '../utils.js';
import { navigate } from '../router.js';
import * as gateway from '../supabase-gateway.js';
import * as state from '../state.js';
import { generateQR, getFlightUrl, downloadQR, printQR } from '../components/qr-generator.js';

export async function renderFlightList(container) {
  const winery = state.getCurrentWinery();
  if (!winery) {
    container.innerHTML = '<p>No winery assigned. Contact a super admin.</p>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading flights...</div>';

  try {
    const flights = await gateway.getFlightsByWinery(winery.id);
    state.setFlights(flights);

    const rows = flights.length === 0
      ? '<tr><td colspan="5">No flights yet. Create one to group wines together.</td></tr>'
      : flights.map(f => {
        const wineCount = f.flight_wines?.length || 0;
        return `
          <tr class="${f.is_active ? '' : 'row--inactive'}">
            <td>${escapeHtml(f.name)}</td>
            <td>${escapeHtml(f.description || '')}</td>
            <td>${wineCount}</td>
            <td>
              <span class="badge ${f.is_active ? 'badge--active' : 'badge--inactive'}">
                ${f.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td class="admin-table__actions">
              <button class="btn btn--small" data-edit="${escapeHtml(f.id)}">Edit</button>
              <button class="btn btn--small btn--outline" data-toggle="${escapeHtml(f.id)}" data-active="${f.is_active}">
                ${f.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button class="btn btn--small btn--outline" data-qr="${escapeHtml(f.id)}" data-slug="${escapeHtml(winery.slug)}">QR</button>
            </td>
          </tr>
        `;
      }).join('');

    container.innerHTML = `
      <header class="admin-section__header">
        <h1>Flights</h1>
        <button id="add-flight-btn" class="btn btn--primary">Add Flight</button>
      </header>
      <table class="admin-table">
        <thead>
          <tr><th>Name</th><th>Description</th><th>Wines</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div id="qr-modal" class="qr-modal" hidden>
        <div class="qr-modal__backdrop"></div>
        <div class="qr-modal__content">
          <h2 id="qr-modal-title">QR Code</h2>
          <div id="qr-modal-canvas"></div>
          <p id="qr-modal-url" class="qr-modal__url"></p>
          <div class="qr-modal__actions">
            <button id="qr-modal-download" class="btn btn--small btn--primary">Download PNG</button>
            <button id="qr-modal-print" class="btn btn--small btn--outline">Print</button>
          </div>
          <button id="qr-modal-close" class="btn btn--secondary">Close</button>
        </div>
      </div>
    `;

    document.getElementById('add-flight-btn').addEventListener('click', () => navigate('/admin/flights/new'));

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => navigate(`/admin/flights/${btn.dataset.edit}/edit`));
    });

    container.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.toggle;
        const currentlyActive = btn.dataset.active === 'true';
        const action = currentlyActive ? 'deactivate' : 'activate';
        const flight = flights.find(f => f.id === id);

        if (currentlyActive && !confirm(`Are you sure you want to deactivate "${flight?.name}"?`)) return;

        try {
          await gateway.toggleFlightActive(id, !currentlyActive);
          showToast(`Flight ${action}d.`, 'success');
          await renderFlightList(container);
        } catch (err) {
          logger.error('Failed to toggle flight', err);
          showToast(`Could not ${action} flight.`, 'error');
        }
      });
    });

    // QR code modal
    const qrModal = document.getElementById('qr-modal');
    let qrModalFlightName = '';
    container.querySelectorAll('[data-qr]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const flightId = btn.dataset.qr;
        const slug = btn.dataset.slug;
        const url = getFlightUrl(slug, flightId);
        const f = flights.find(x => x.id === flightId);
        qrModalFlightName = f ? f.name : 'QR Code';

        document.getElementById('qr-modal-title').textContent = qrModalFlightName;
        document.getElementById('qr-modal-url').textContent = url;
        document.getElementById('qr-modal-canvas').innerHTML = '';

        qrModal.hidden = false;
        await generateQR(document.getElementById('qr-modal-canvas'), url);
      });
    });
    document.getElementById('qr-modal-download').addEventListener('click', () => {
      const canvas = document.querySelector('#qr-modal-canvas canvas');
      if (canvas) downloadQR(canvas, qrModalFlightName);
    });
    document.getElementById('qr-modal-print').addEventListener('click', () => {
      const canvas = document.querySelector('#qr-modal-canvas canvas');
      if (canvas) printQR(canvas, qrModalFlightName);
    });
    document.getElementById('qr-modal-close').addEventListener('click', () => { qrModal.hidden = true; });
    document.querySelector('.qr-modal__backdrop').addEventListener('click', () => { qrModal.hidden = true; });
  } catch (err) {
    logger.error('Failed to load flights', err);
    showToast('Could not load flight list.', 'error');
  }
}

export async function renderFlightForm(container, flightId) {
  const winery = state.getCurrentWinery();
  if (!winery) {
    showToast('No winery found. Cannot manage flights.', 'error');
    navigate('/admin/flights');
    return;
  }

  container.innerHTML = '<div class="loading">Loading...</div>';

  let flight = null;
  let selectedWineIds = [];

  if (flightId) {
    try {
      flight = await gateway.getFlightById(flightId);
      selectedWineIds = (flight.flight_wines || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(fw => fw.wine_id);
    } catch (err) {
      logger.error('Failed to load flight', err, { flightId });
      showToast('Could not load flight.', 'error');
      navigate('/admin/flights');
      return;
    }
  }

  // Load all wines for the picker
  let wines = state.getWines();
  if (wines.length === 0) {
    try {
      wines = await gateway.getWinesByWinery(winery.id);
      state.setWines(wines);
    } catch (err) {
      logger.error('Failed to load wines for flight form', err);
      showToast('Could not load wines.', 'error');
    }
  }

  const isEdit = !!flight;
  const title = isEdit ? `Edit ${escapeHtml(flight.name)}` : 'Add New Flight';

  const wineCheckboxes = wines.map(w => {
    const checked = selectedWineIds.includes(w.id) ? 'checked' : '';
    const inactiveLabel = w.is_active === false ? ' <span class="badge badge--inactive">Inactive</span>' : '';
    return `
      <label class="wine-picker__item ${w.is_active === false ? 'wine-picker__item--inactive' : ''}">
        <input type="checkbox" name="flight_wines" value="${escapeHtml(w.id)}" ${checked} />
        ${escapeHtml(w.name)}
        ${w.varietal ? `<span class="wine-picker__varietal">${escapeHtml(w.varietal)}</span>` : ''}
        ${inactiveLabel}
      </label>
    `;
  }).join('');

  container.innerHTML = `
    <div class="admin-flight-form">
      <h1>${title}</h1>
      <form id="flight-form">
        <label for="flight-name">Name</label>
        <input type="text" id="flight-name" name="name" required value="${escapeHtml(flight?.name || '')}" />

        <label for="flight-description">Description</label>
        <textarea id="flight-description" name="description">${escapeHtml(flight?.description || '')}</textarea>

        <label for="flight-sort-order">Sort Order</label>
        <input type="number" id="flight-sort-order" name="sort_order" value="${flight?.sort_order ?? 0}" min="0" />

        ${isEdit ? `
        <div class="admin-winery-form__toggle">
          <label>
            <input type="checkbox" id="flight-active" ${flight.is_active ? 'checked' : ''} />
            Active
          </label>
        </div>` : ''}

        <fieldset class="wine-picker">
          <legend>Wines in this Flight</legend>
          ${wines.length === 0
            ? '<p>No wines available. Add wines first.</p>'
            : `<div class="wine-picker__list">${wineCheckboxes}</div>`
          }
        </fieldset>

        <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Create Flight'}</button>
        <button type="button" id="cancel-btn" class="btn btn--secondary">Cancel</button>
      </form>
      ${isEdit ? `
      <section class="admin-flight-form__qr">
        <h2>QR Code</h2>
        <div id="flight-qr-container"></div>
        <p id="flight-qr-url" class="qr-modal__url"></p>
        <div class="qr-modal__actions">
          <button type="button" id="flight-qr-download" class="btn btn--small btn--primary">Download PNG</button>
          <button type="button" id="flight-qr-print" class="btn btn--small btn--outline">Print</button>
        </div>
      </section>` : ''}
    </div>
  `;

  document.getElementById('cancel-btn').addEventListener('click', () => navigate('/admin/flights'));

  // Render QR code for existing flights
  if (isEdit) {
    const url = getFlightUrl(winery.slug, flight.id);
    document.getElementById('flight-qr-url').textContent = url;
    generateQR(document.getElementById('flight-qr-container'), url);

    document.getElementById('flight-qr-download').addEventListener('click', () => {
      const canvas = document.querySelector('#flight-qr-container canvas');
      if (canvas) downloadQR(canvas, flight.name);
    });
    document.getElementById('flight-qr-print').addEventListener('click', () => {
      const canvas = document.querySelector('#flight-qr-container canvas');
      if (canvas) printQR(canvas, flight.name);
    });
  }

  document.getElementById('flight-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const checkedWineIds = Array.from(
      document.querySelectorAll('input[name="flight_wines"]:checked')
    ).map(cb => cb.value);

    const data = {
      name: document.getElementById('flight-name').value.trim(),
      description: document.getElementById('flight-description').value.trim() || null,
      sort_order: parseInt(document.getElementById('flight-sort-order').value, 10) || 0,
    };

    if (isEdit) {
      const activeCheckbox = document.getElementById('flight-active');
      data.is_active = activeCheckbox.checked;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      if (isEdit) {
        await gateway.updateFlight(flight.id, data);
        await gateway.setFlightWines(flight.id, checkedWineIds);
        showToast('Flight updated.', 'success');
      } else {
        data.winery_id = winery.id;
        const newFlight = await gateway.createFlight(data);
        if (checkedWineIds.length > 0) {
          await gateway.setFlightWines(newFlight.id, checkedWineIds);
        }
        showToast('Flight created.', 'success');
      }
      navigate('/admin/flights');
    } catch (err) {
      logger.error('Failed to save flight', err);
      showToast('Could not save flight. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Flight';
    }
  });
}
