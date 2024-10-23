import {BrowserPool, PlaywrightPlugin } from '@crawlee/browser-pool';
import playwright from 'playwright';

export const browserPool = new BrowserPool({
    browserPlugins: [new PlaywrightPlugin(playwright.chromium)],
    preLaunchHooks: [() => {
        console.log('Pre-launch browser...')
    }],
});

export const crawler = {
    async run(requestId, params) {
        const param = params[0];
        const page = await browserPool.newPage();
        await page.goto(param.url);
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
        const productId = new URL(productOpenGraphMeta['og:url'], param.url).pathname
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
        await page.close()
        return {
            requestId,
            price,
            pricePerItem,
            productId,
            ogProps: productOpenGraphMeta
        }
    }
}