import jwt from 'jsonwebtoken'
import { successResponse, errorResponse } from '@/utils/response'
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export async function POST(req: Request) {

    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')
    const event = req.headers?.get('x-github-event')

    // Validate Request
    const error = checkRequest(event, signature, rawBody)
    if (error) return error
    console.log("Validate Request - SUCCESS")

    // Check Rate Limiter
    const payload = JSON.parse(rawBody);
    const rateLimiterError = await checkRateLimiter(payload)
    if (rateLimiterError) return rateLimiterError

    // Get Installion Token
    const installationToken = await getInstallationToken(payload.installation.id)

    // Validate Actions
    const action = payload.action;
    const isDraft = payload.pull_request.draft
    const REVIEWABLE_ACTIONS = ['opened', 'synchronize', 'reopened', 'ready_for_review']

    if (isDraft) return new Response('Event Ignored', { status: 200 })
    if (!REVIEWABLE_ACTIONS.includes(action)) return new Response('Event Ignored', { status: 200 })
    console.log(`Action ${action} - SUCCESS`)

    // Check Diff 
    const getDiff = await checkDiff(payload.pull_request.diff_url, installationToken)
    if (!getDiff.ok) return new Response(getDiff.message, { status: 500 })    
    console.log("DIFF Request - SUCCESS")

    // Review Diff 
    const diffText = getDiff.content
    const reviewResult = await aiReview(diffText)

    if (!reviewResult.ok) return new Response(reviewResult.message, { status: 500 })
    
    console.log("Review DIFF Request - SUCCESS")
    postReview(reviewResult.content, payload, payload.installation.id, installationToken)

    return new Response(JSON.stringify({message: 'OK', pending: "Currently trying to post the review"}), { status: 200  })
}

// --- Functions ---

// --- Check Request Validity ---
function checkRequest(event: string | null, signature: string | null, rawBody: string) {

    const secret = process.env.GITHUB_WEBHOOK_SECRET!
    const mySignature = 'sha256=' + createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
    
    if (!signature) return  new Response('Missing Signature', { status: 401 })
    if (signature != mySignature) return  new Response('Unauthorized', { status: 401 })
    if (event != 'pull_request') return new Response('Event Ignored', { status: 200 });   
}

// --- Rate Limiter ---
async function checkRateLimiter(payload: any) {
    const ratelimit = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(5, "1 h"), // 5 requests per hour
    })

    const prKey = `${payload.repository.full_name}:${payload.pull_request.number}`

    const { success } = await ratelimit.limit(prKey)

    if (!success) {
        return new Response('Rate limit exceeded', { status: 429 })
    }
}

// --- Check Diff URL ---
async function checkDiff(diffUrl: string, installationToken: string) {

    const diffResult = await fetchDiff(diffUrl, installationToken)

    if (!diffResult.ok) return errorResponse(diffResult.message, diffResult.status)
    if (!diffResult.content) return errorResponse('Empty Diff',  500)

    return successResponse(diffResult.content, diffResult.status)
}

// --- Fetch Diff URL ---
async function fetchDiff(diff: string, installationToken: string) {

    try {
        const response = await fetch(diff, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${installationToken}`,
                'Accept': 'application/vnd.github.v3.diff'
            }
        })

        if (response.status == 401) return errorResponse('Unauthorized', response.status)
        if (!response.ok) return errorResponse('Failed to fetch the diff', response.status)

        const data = await response.text()

        return successResponse(data, response.status)

    } catch (error) {
        console.log('Network error:', error)
        return errorResponse('Network error', 0)
    }
}

// --- Get AI Review ---
async function aiReview(diff: string | null) {

    // Fallback chain for models
    const MODELS = [
        "gemini-3.1-flash-lite-preview", 
        "gemini-2.5-flash-lite",      
        "gemini-3-flash-preview",     
        "gemini-2.5-flash"
    ]

    for (const model of MODELS) {

        const reviewContent = await fetchGeminiApi(model, diff)

        if (reviewContent.status == 401 ) return errorResponse('Unauthorized', reviewContent.status);
        if (!reviewContent.ok)  continue

        const reviewText = reviewContent.content

        return successResponse(reviewText, reviewContent.status)
    }

    return errorResponse('All Gemini models are currently unavailable, Please try again later', 500)
}

// --- Fetch Gemini API ---
async function fetchGeminiApi(model: string, diff: string | null) {

    try {

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text:`
                                You are a senior code reviewer. Review this pull request diff.

                                Provide feedback in this format:
                                ## Summary
                                One sentence describing what this PR does.

                                ## Issues
                                List any bugs, security issues, or logic errors. If none, say "No issues found."

                                ## Suggestions  
                                List improvements for clarity, performance, or best practices.

                                
                                Rules:
                                - be direct, natural, and easy to understand

                                Diff:
                                ${diff}
                            `
                        }]
                    }]
                })
            }
        )

        if (!response.ok) return errorResponse('Failed to fetch gemini api', response.status)

        const data = await response.json()
        const review = data.candidates[0].content.parts[0].text 

        return successResponse(review, response.status)

    } catch (error) {
        console.log('Network error:', error)
        return errorResponse('Network error', 0)
    }
}

// Post AI Review
async function postReview(review: string, payload: any, installationId: number, installationToken: string) {


    const owner     = payload.repository.owner.login  
    const repo      = payload.repository.name         
    const prNumber  = payload.pull_request.number     

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${installationToken}`,
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

    if (!response.ok) return errorResponse('Failed to post review', response.status)
    
    return successResponse(data, response.status)
}

// --- Get Installation Token ---
async function getInstallationToken(installationId: number) {

    // Check cache
    const redis = Redis.fromEnv()
    const cached = await redis.get(`installation_token:${installationId}`)
    if (cached) return cached as string // Return cached token if found

    // create JWT
    const jwtToken = createJWT()

    // exchange for installation token
    const response = await fetch(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Accept': 'application/vnd.github+json'
            }
        }
    )

    const data = await response.json()
    const token = data.token

    redis.set(`installation_token:${installationId}`, token, { ex: 55 * 60 }) // Cache the installtion token 

    return token  // installation token — valid for 1 hour
}

// Create JWT for the request
function createJWT() {

    const now = Math.floor(Date.now() / 1000)

    const privateKey = process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n')

    return jwt.sign(
        {
            iss: process.env.GITHUB_APP_ID,  // App ID
            iat: now,                        // issued now
            exp: now + 600                   // expires in 10 minutes
        },
        privateKey,
        { algorithm: 'RS256' }
    )
}
