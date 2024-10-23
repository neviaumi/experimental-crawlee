import { PlaywrightCrawler, Dataset } from 'crawlee';
import { createPlaywrightRouter } from 'crawlee';

const router = createPlaywrightRouter()

const playwrightCrawler = new PlaywrightCrawler({
    requestHandler: router,
})

export const crawler = {
    async run(requestId, params) {
        const taskStatistics = await playwrightCrawler.run(params)
        if (taskStatistics.requestsFailed !== 0) throw new Error("Unknown Error!")
        const store = await Dataset.open(requestId)
        const resp = await store.getData()
        await store.drop()
        return resp.items[0];
    }
}

router.addHandler("OCADO", async ({ request, page, log }) => {
    const requestId = request.userData['requestId']
    log.info(`Request running on ${requestId}`)
    const store = await Dataset.open(requestId)
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
    store.pushData({
        price,
        pricePerItem,
        productId,
        ogProps: productOpenGraphMeta
    })
    console.log({
        price,
        pricePerItem,
        productId,
        ogProps: productOpenGraphMeta
    })

})
