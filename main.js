import {crawler, browserPool} from "./crawler.js"
import {createServer} from "node:http"

const server = createServer(async (req, res) => {
    const reqId = req.headers['request-id']
    if (!reqId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Request ID is required')
        return;
    }
    const resp = await crawler.run(reqId, [{
    userData: {
        label: 'OCADO',
        requestId: reqId
    },
    url: 'https://www.ocado.com/products/asahi-super-dry-beer-lager-bottles-631029011'
}])
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.assign(resp, {reqId})));
})
server.listen(3000, () => {
    console.log('Server listening on port 3000')
    Promise.all([
        'b8367ade-9544-4ab5-887f-4a043ed7d442',
        'f37d1463-8785-4cde-b38b-235e79070783',
        'fba8e239-fc62-475b-929f-affe55c92238',
        '02195a79-b5cb-4825-8f3f-292b480bb27b',
        '53dc6c46-e91b-43ce-8a9c-c45f2734ce15',
        '3961e622-8609-4cf5-9b4e-248d5dd99b8d',
        '5922bff5-da03-46c3-9b5c-669ad487b098',
        'bf58c058-1d73-4333-8ec4-49af5aaeacf2'
    ]
        .map(async (requestId) => {
            console.time(requestId);
            const resp = await fetch('http://localhost:3000', {
                headers: {
                    'request-id': requestId
                }
            }).then(resp => resp.json())
            console.timeEnd(requestId);
            return resp
    }))
        .finally(async () => {
            await browserPool.destroy()
            server.close()
        })
})