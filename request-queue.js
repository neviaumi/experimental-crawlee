import {BrowserPool, PlaywrightPlugin } from '@crawlee/browser-pool';
import playwright from 'playwright';
import pLimit from "p-limit"

const limit = pLimit(4);
const browserPool = new BrowserPool({
    browserPlugins: [new PlaywrightPlugin(playwright.chromium)],
});

export function processRequest(request) {
    return limit(async () => {
        const page = await browserPool.newPage();
        await page.goto(request.url);
        const productOpenGraphMeta = Object.fromEntries(
            await page
                .locator('meta[property^="og:"]')
                .evaluateAll(elements =>
                    elements.map(ele => [
                        ele.getAttribute('property'),
                        ele.getAttribute('content'),
                    ]),
                ),
        );
        const productId = new URL(productOpenGraphMeta['og:url'], request.url).pathname
            .split('/')
            .pop();
        const priceInfo = Object.fromEntries(
            (
                await page
                    .locator('meta[itemprop]')
                    .evaluateAll(elements =>
                        elements.map(ele => [
                            ele.getAttribute('itemprop'),
                            ele.getAttribute('content'),
                        ]),
                    )
            ).filter((entity) =>['price', 'priceCurrency'].includes(String(entity[0]))));
        const pricePerItem = (await page.locator('.bop-price__per').isVisible())
            ? await page.locator('.bop-price__per').textContent()
            : null;

        const price = new Intl.NumberFormat('en-GB', {
            currency: priceInfo.priceCurrency,
            style: 'currency',
        }).format(Number(priceInfo.price));
        return {
            requestId: request.id,
            price,
            pricePerItem,
            productId,
            ogProps: productOpenGraphMeta
        }
    })
}
export function destroy() {
    return browserPool.destroy()
}