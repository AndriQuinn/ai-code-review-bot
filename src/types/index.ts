export type ApiResponse<T = string> = {
    ok: boolean
    status: number
    content: T | null
    message: string
}