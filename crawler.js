import {BrowserPool, PlaywrightPlugin } from '@crawlee/browser-pool';
import playwright from 'playwright';

const _browserPool = new BrowserPool({
    browserPlugins: [new PlaywrightPlugin(playwright.chromium)],
    preLaunchHooks: [() => {
        console.log('Pre-launch browser...')
    }],
});

class RequestQueue {
    #tasks = [];
    #status;
    #browserPool;
    #concurrent;
    #running;
    constructor({ concurrent = 1, browserPool }) {
        this.#concurrent = concurrent;
        this.#browserPool = browserPool;
        this.#status = 'idle';
        this.#running = 0;
    }

    async destroy() {
        await this.#browserPool.destroy()
        this.#status = 'destroyed';
        this.#tasks = []
    }

    // Method to add a task to the queue
    async processRequest(request) {
        if (this.#status === 'destroyed') {
            throw new Error('RequestQueue has been destroyed');
        }
        return new Promise((resolve, reject) => {
            const task = async ({page}) => {
                try {
                    const result = await this.#handleRequest(page, request);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            this.#tasks.push(task);
            this.#runNext().catch(reject);
        });
    }

    // Method to run the next task in the queue
    async #runNext() {
        if (this.#running >= this.#concurrent || this.#tasks.length === 0) {
            return;
        }

        this.#running++;
        const task = this.#tasks.shift();
        const page = await this.#browserPool.newPage();

        task({page}).finally(() =>
            page.close().then(() => {
                this.#running--;
                this.#runNext();
            })
        )

    }

    async #handleRequest(page, request) {
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
    }
}


const requestQueue = new RequestQueue({concurrent: 4, browserPool: _browserPool});
export const processRequest = requestQueue.processRequest.bind(requestQueue)
export function destroy() {
    return requestQueue.destroy()
}