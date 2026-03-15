import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTagInput } from '../assets/js/components/tag-input.js';

describe('tag-input', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  // ── Rendering ─────────────────────────────────────────────────────────

  it('renders with no initial tags', () => {
    const { getTags } = createTagInput(container);

    expect(getTags()).toEqual([]);
    expect(container.querySelector('.tag-input')).not.toBeNull();
    expect(container.querySelector('.tag-input__field')).not.toBeNull();
    expect(container.querySelectorAll('.tag-input__tag').length).toBe(0);
  });

  it('renders initial tags', () => {
    const { getTags } = createTagInput(container, {
      initialTags: ['Steak', 'Salmon'],
    });

    expect(getTags()).toEqual(['Steak', 'Salmon']);
    expect(container.querySelectorAll('.tag-input__tag').length).toBe(2);
    expect(container.querySelector('.tag-input__tag').textContent).toContain('Steak');
  });

  it('applies custom id and placeholder', () => {
    createTagInput(container, {
      id: 'my-tags',
      placeholder: 'Add a pairing',
    });

    expect(container.querySelector('#my-tags')).not.toBeNull();
    expect(container.querySelector('.tag-input__field').placeholder).toBe('Add a pairing');
  });

  // ── Adding tags ───────────────────────────────────────────────────────

  it('adds tag on Enter key', () => {
    const { getTags } = createTagInput(container);
    const input = container.querySelector('.tag-input__field');

    input.value = 'Grilled steak';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(getTags()).toEqual(['Grilled steak']);
    expect(input.value).toBe('');
    expect(container.querySelectorAll('.tag-input__tag').length).toBe(1);
  });

  it('adds tag on comma key', () => {
    const { getTags } = createTagInput(container);
    const input = container.querySelector('.tag-input__field');

    input.value = 'Aged cheddar';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));

    expect(getTags()).toEqual(['Aged cheddar']);
    expect(input.value).toBe('');
  });

  it('adds tag on blur', () => {
    const { getTags } = createTagInput(container);
    const input = container.querySelector('.tag-input__field');

    input.value = 'Dark chocolate';
    input.dispatchEvent(new Event('blur'));

    expect(getTags()).toEqual(['Dark chocolate']);
    expect(input.value).toBe('');
  });

  it('trims whitespace from tags', () => {
    const { getTags } = createTagInput(container);
    const input = container.querySelector('.tag-input__field');

    input.value = '  Lamb chops  ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(getTags()).toEqual(['Lamb chops']);
  });

  it('ignores empty/whitespace-only input', () => {
    const { getTags } = createTagInput(container);
    const input = container.querySelector('.tag-input__field');

    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(getTags()).toEqual([]);
  });

  it('ignores blur with empty input', () => {
    const { getTags } = createTagInput(container);
    const input = container.querySelector('.tag-input__field');

    input.value = '';
    input.dispatchEvent(new Event('blur'));

    expect(getTags()).toEqual([]);
  });

  it('prevents duplicate tags (case-insensitive)', () => {
    const { getTags } = createTagInput(container, { initialTags: ['Steak'] });
    const input = container.querySelector('.tag-input__field');

    input.value = 'steak';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(getTags()).toEqual(['Steak']); // no duplicate
    // Input should not be cleared since tag was rejected
    expect(input.value).toBe('steak');
  });

  // ── Removing tags ─────────────────────────────────────────────────────

  it('removes tag when X button is clicked', () => {
    const { getTags } = createTagInput(container, {
      initialTags: ['A', 'B', 'C'],
    });

    // Remove the middle tag (index 1)
    const removeBtn = container.querySelectorAll('.tag-input__remove')[1];
    removeBtn.click();

    expect(getTags()).toEqual(['A', 'C']);
    expect(container.querySelectorAll('.tag-input__tag').length).toBe(2);
  });

  it('removes last tag on Backspace when input is empty', () => {
    const { getTags } = createTagInput(container, {
      initialTags: ['First', 'Second'],
    });
    const input = container.querySelector('.tag-input__field');

    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

    expect(getTags()).toEqual(['First']);
  });

  it('does NOT remove tag on Backspace when input has text', () => {
    const { getTags } = createTagInput(container, {
      initialTags: ['First'],
    });
    const input = container.querySelector('.tag-input__field');

    input.value = 'typing';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

    expect(getTags()).toEqual(['First']); // unchanged
  });

  // ── XSS ───────────────────────────────────────────────────────────────

  it('escapes HTML in tag content', () => {
    createTagInput(container, {
      initialTags: ['<script>alert(1)</script>'],
    });

    const tagEl = container.querySelector('.tag-input__tag');
    // The tag text is rendered as escaped HTML — not as a live script element
    expect(tagEl.textContent).toContain('<script>alert(1)</script>');
    // Verify no actual script element was created in the DOM
    expect(container.querySelector('script')).toBeNull();
  });

  // ── getTags returns a copy ────────────────────────────────────────────

  it('getTags returns a copy, not the internal array', () => {
    const { getTags } = createTagInput(container, { initialTags: ['A'] });

    const result = getTags();
    result.push('mutated');

    expect(getTags()).toEqual(['A']); // internal state unchanged
  });
});
