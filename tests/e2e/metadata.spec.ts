import { expect, test } from '@playwright/test';
import { metadata, pages } from '../../src/metadata';

for (const path of Object.keys(pages)) {
  test(`initial HTML, crawler metadata and public image: ${path}`, async ({ request, page }) => {
    // Image loading checks need stable geometry; motion has its own browser suite.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Four crawler requests, OG download, hard refresh and all lazy thumbnails share this budget.
    test.setTimeout(90_000);
    const expected = metadata(path);
    for (const agent of ['Mozilla/5.0', 'LinkedInBot', 'Twitterbot', 'facebookexternalhit']) {
      const response = await request.get(path, { headers: { 'User-Agent': agent } });
      expect(response.status()).toBe(200);
      const html = await response.text();
      // Inspect the server response without executing the app; HTML entities
      // in titles and attributes must decode to the intended metadata values.
      const parsed = await page.evaluate(source => {
        const document = new DOMParser().parseFromString(source, 'text/html');
        return {
          title: document.title,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
          tags: Object.fromEntries(Array.from(document.querySelectorAll('meta[name],meta[property]')).map(tag => [tag.getAttribute('name') ?? tag.getAttribute('property'), tag.getAttribute('content')])),
        };
      }, html);
      expect(parsed.title).toBe(expected.page.title);
      expect(parsed.canonical).toBe(expected.url);
      for (const [key, value] of Object.entries(expected.tags)) {
        expect(parsed.tags[key]).toBe(value);
      }
    }
    const image = await request.get(`/og/${expected.page.image}.png`);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
    const buffer = await image.body();
    expect(buffer.readUInt32BE(16)).toBe(1200);
    expect(buffer.readUInt32BE(20)).toBe(630);
    await page.goto(path);
    await page.reload();
    await expect(page).toHaveTitle(expected.page.title);
    // Exercise lazy images as a visitor does, rather than testing off-screen placeholders.
    for(const image of await page.locator('img').all()){
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(image => image.complete && image.naturalWidth > 0), {timeout:15000}).toBe(true);
    }
  });
}
