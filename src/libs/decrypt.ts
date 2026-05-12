import { createDecipheriv } from 'crypto'

export function decrypt(text: string): string {

    const [ivHex, encryptedHex] = text.split(':')

    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const ALGORITHM = 'aes-256-cbc'

    const decipher = createDecipheriv(ALGORITHM, process.env.ENCRYPTION_KEY!, iv)

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ])

    return decrypted.toString('utf-8')
}