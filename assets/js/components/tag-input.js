import { escapeHtml } from '../utils.js';

/**
 * Creates a tag-style input that manages an array of strings.
 *
 * @param {HTMLElement} container — element to render into
 * @param {Object} options
 * @param {string[]} options.initialTags — starting tags
 * @param {string}   options.placeholder — input placeholder text
 * @param {string}   options.id — id for the wrapper (used by tests & form reads)
 * @returns {{ getTags: () => string[] }} — accessor for current tag values
 */
export function createTagInput(container, { initialTags = [], placeholder = 'Type and press Enter', id = 'tag-input' } = {}) {
  let tags = [...initialTags];

  function renderTags() {
    const tagList = container.querySelector('.tag-input__tags');
    tagList.innerHTML = tags.map((tag, i) =>
      `<span class="tag-input__tag" data-index="${i}">${escapeHtml(tag)}<button type="button" class="tag-input__remove" data-index="${i}" aria-label="Remove ${escapeHtml(tag)}">&times;</button></span>`
    ).join('');

    // Bind remove buttons
    tagList.querySelectorAll('.tag-input__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        tags.splice(Number(btn.dataset.index), 1);
        renderTags();
      });
    });
  }

  function addTag(value) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    // Avoid exact duplicates (case-insensitive)
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return false;
    tags.push(trimmed);
    renderTags();
    return true;
  }

  container.innerHTML = `
    <div class="tag-input" id="${escapeHtml(id)}">
      <div class="tag-input__tags"></div>
      <input type="text" class="tag-input__field" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;

  const input = container.querySelector('.tag-input__field');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (addTag(input.value)) {
        input.value = '';
      }
    }

    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
      tags.pop();
      renderTags();
    }
  });

  // Also add tag on blur (user tabs away or taps elsewhere on iPad)
  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addTag(input.value);
      input.value = '';
    }
  });

  renderTags();

  return {
    getTags: () => [...tags],
  };
}
