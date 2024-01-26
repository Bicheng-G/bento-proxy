import { NextResponse } from 'next/server';
import { HTMLRewriter } from '@cloudflare/html-rewriter';

export default async function handler(req) {
    const urlObj = new URL(req.url);
    const path = urlObj.pathname;
    let url = 'https://bento.me' + path;

    if (path.includes('v1')) {
        url = 'https://api.bento.me' + path;
    }

    if (url === 'https://bento.me/') {
        url = 'https://bento.me/' + process.env.BENTO_USERNAME;
    }

    let headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    };

    const response = await fetch(url, { headers });
    const contentType = response.headers.get('content-type');

    let results = await parseResponseByContentType(response, contentType);

    if (!(results instanceof ArrayBuffer)) {
        results = results.replaceAll('https://api.bento.me', process.env.BASE_URL);
    }

    headers['content-type'] = contentType;
    return new NextResponse(results, { headers });
}

async function parseResponseByContentType(response, contentType) {
    if (!contentType) return await response.text();

    switch (true) {
        case contentType.includes('application/json'):
            return JSON.stringify(await response.json());
        case contentType.includes('text/html'):
            const transformedResponse = new HTMLRewriter()
                .on('body', {
                    element(element) {
                        element.append(
                            `
                            <style>
                                /* Custom CSS */
                            </style>
                            `,
                            { html: true },
                        );
                        element.append(
                            `
                            <script>
                                /* Custom JS */
                            </script>
                            `,
                            { html: true },
                        );
                    },
                })
                .transform(response);
            return await transformedResponse.text();
        case contentType.includes('font'):
        case contentType.includes('image'):
            return await response.arrayBuffer();
        default:
            return await response.text();
    }
}
