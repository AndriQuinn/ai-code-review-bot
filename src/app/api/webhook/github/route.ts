export async function POST(req: Request, res: Response) {
    const event = req.headers.get('x-github-event');
    const payload = await req.json();
    console.log('Payload:', req.body);
    return new Response('OK', { status: 200 })
}


// // server.js
// const express = require('express');
// const app = express();
// app.use(express.json());

// app.post('/webhook', (req, res) => {
//   console.log('Event received:', req.headers['x-github-event']);
//   console.log('Payload:', req.body);
//   res.status(200).send('OK');
// });

// app.listen(3000, () => console.log('Running on port 3000'));