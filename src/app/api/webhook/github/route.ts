import { createHmac } from 'crypto'

export async function POST(req: Request) {

    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    const event = req.headers?.get('x-github-event')

    const error = checkRequest(event, signature, rawBody)
    console.log(error)
    if (error) return error

    const payload = await req.json();

    
    
    
    return new Response('OK', { status: 200 })
}

function checkRequest(event: string | null, signature: string | null, rawBody: string) {

    const secret = process.env.GITHUB_WEBHOOK_SECRET!
    const mySignature = 'sha256=' + createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
    
    if (signature != mySignature) return  new Response('Unauthorized', { status: 401 })
    if (event != 'pull_request') return new Response('Event Ignored', { status: 200 });   
}

async function aiReview() {
    const response = await fetch('')
}