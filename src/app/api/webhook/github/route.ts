import { createHmac } from 'crypto'

export async function POST(req: Request) {

    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    const event = req.headers?.get('x-github-event')

    // Validate Request
    const error = checkRequest(event, signature, rawBody)
    if (error) return error

    // Validate Actions
    const payload = JSON.parse(rawBody);
    const action = payload.action;
    const isDraft = payload.pull_request.draft
    const REVIEWABLE_ACTIONS = ['opened', 'synchronize', 'reopened', 'ready_for_review']

    if (isDraft) return new Response('Event Ignored', { status: 200 })
    if (!REVIEWABLE_ACTIONS.includes(action)) return new Response('Event Ignored', { status: 200 })

    // Check Diff 
    const getDiff = await checkDiff(payload.pull_request.diff_url)
    if (!getDiff.ok) return new Response(getDiff.message, { status: 500 })    

    // Review Diff 
    const diffText = getDiff.content
    const reviewResult = await aiReview(diffText)

    if (!reviewResult.ok) return new Response('Something wrong happened', { status: 500 })
    
    postReview(reviewResult.content, payload)

    return new Response(JSON.stringify({message: 'OK', pending: "Currently trying to post the review"}), { status: 200  })
}

// --- Functions ---

// --- Check Validity ---
function checkRequest(event: string | null, signature: string | null, rawBody: string) {

    const secret = process.env.GITHUB_WEBHOOK_SECRET!
    const mySignature = 'sha256=' + createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
    
    if (!signature) return  new Response('Missing Signature', { status: 401 })
    if (signature != mySignature) return  new Response('Unauthorized', { status: 401 })
    if (event != 'pull_request') return new Response('Event Ignored', { status: 200 });   
}

// --- Get AI Review ---
async function aiReview(diff: string | null) {

    const MODELS = [
        "gemini-3.1-flash-lite-preview", 
        "gemini-2.5-flash-lite",      
        "gemini-3-flash-preview",     
        "gemini-2.5-flash"
    ]

    for (const model of MODELS) {

        const reviewContent = await fetchGeminiApi(model, diff)

        if (reviewContent.status == 401 ) return { ok: false, status: reviewContent.status, content: null };
        if (!reviewContent.ok)  continue

        const reviewText = reviewContent.content

        return { ok: reviewContent.ok, status: reviewContent.status, content: reviewText }
    }

    return { ok: false, status: 500, content: 'All Gemini models are currently unavailable, Please try again later' }
}

// --- Fetch Gemini API ---
async function fetchGeminiApi(model: string, diff: string | null) {

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `
                        You are a code reviewer. 
                        Review this pull request diff and give concise, 
                        actionable feedback. Focus on bugs, security issues, 
                        and code clarity. Diff: 
                        
                        ${diff}

                        Rules:
                        - be direct, natural, easy to understand
                    `
                    }]
                }]
            })
        }
        
    )

    if (!response.ok) return { ok: response.ok, status: response.status, content: null }

    const data = await response.json()
    const review = data.candidates[0].content.parts[0].text 

    return { ok: response.ok , status: response.status, content: review }
}

// --- Fetch Diff URL ---
async function fetchDiff(diff: string) {

    const response = await fetch(diff, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3.diff'
        }
    })

    if (response.status == 401) return { ok: response.ok, status: response.status, content: 'Unauthorized' }
    if (!response.ok) return { ok: response.ok, status: response.status, content: null }

    const data = await response.text()

    return { ok: response.ok, status: response.status, content: data }
}

async function checkDiff(diffUrl: string) {

    const diffResult = await fetchDiff(diffUrl)

    if (!diffResult.ok) return {  message: 'Failed to fetch diff', ok: diffResult.ok, status: 500, content: null }
    if (!diffResult.content) return {  message: 'Empty diff', ok: false, status: 500, content: null }
    
    return { message: 'Success', ok: diffResult.ok, status: diffResult.status, content: diffResult.content }
}

async function postReview(review: string, payload: any) {

    const owner     = payload.repository.owner.login  
    const repo      = payload.repository.name         
    const prNumber  = payload.pull_request.number     

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            body: review,
            event: 'COMMENT'
        })
    })

    const data = await response.json()

    console.log('GitHub API response status:', response.status)

    if (!response.ok) return { message: 'Failed to post review', ok: false, status: response.status, data: data }
    
    return { ok: true, status: response.status, data }
}
