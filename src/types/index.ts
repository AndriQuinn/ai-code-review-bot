export type ApiResponse<T = string> = {
    ok: boolean
    status: number
    content: T 
    message: string
}