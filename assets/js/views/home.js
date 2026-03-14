export function render(container) {
  container.innerHTML = `
    <div class="bottle-page day">
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px;">

        <div style="text-align: center; max-width: 340px;">
          <div style="font-family: 'Cormorant SC', serif; font-size: 11px; letter-spacing: 0.3em; color: var(--text-muted); margin-bottom: 12px;">WELCOME TO</div>
          <h1 style="font-family: 'Cormorant Garamond', serif; font-size: 48px; font-weight: 300; color: var(--text-primary); line-height: 1.1;">BottleLore</h1>
          <div style="font-family: 'Cormorant Garamond', serif; font-size: 15px; font-style: italic; color: var(--text-muted); margin-top: 8px;">Every bottle has a story</div>

          <div style="display: flex; align-items: center; gap: 12px; padding: 0 20px; margin: 28px 0;">
            <div style="flex: 1; height: 1px; background: var(--rule);"></div>
            <div style="width: 5px; height: 5px; background: var(--accent); transform: rotate(45deg); opacity: 0.6;"></div>
            <div style="flex: 1; height: 1px; background: var(--rule);"></div>
          </div>

          <p style="font-family: 'Lora', Georgia, serif; font-size: 15px; line-height: 1.7; color: var(--text-body);">
            Scan the QR code on any wine bottle to discover tasting notes, food pairings, and more.
          </p>
        </div>

        <div style="margin-top: 48px; text-align: center;">
          <a href="/admin" style="font-family: 'Cormorant SC', serif; font-size: 10px; letter-spacing: 0.25em; color: var(--text-muted); text-decoration: none; opacity: 0.5;">WINERY ADMIN</a>
        </div>

      </div>
    </div>
  `;
}
