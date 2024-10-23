import {crawler} from "./crawler.js"

const requestId = crypto.randomUUID()
// Start the crawler with the provided URLs
const resp = await crawler.run(requestId, [{
    userData: {
        label: 'OCADO',
        requestId
    },
    url: 'https://www.ocado.com/products/asahi-super-dry-beer-lager-bottles-631029011'
}])

console.log(`resp = `, resp)

// Start the crawler with the provided URLs
// await crawler.run([{
//     userData: {
//         label: 'OCADO'
//     },
//     url: 'https://www.ocado.com/products/asahi-super-dry-beer-lager-bottles-631029011'
// }]);