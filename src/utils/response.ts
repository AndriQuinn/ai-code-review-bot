import type { ApiResponse } from "@/types"

// success response
export function successResponse(content: string, status = 200): ApiResponse {
    return { ok: true, status, content, message: 'Success' }
}

// error response
export function errorResponse(message: string, status = 500): ApiResponse {
    return { ok: false, status, content: '', message }
}