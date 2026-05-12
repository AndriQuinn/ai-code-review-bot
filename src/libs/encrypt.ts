import { createCipheriv, randomBytes } from 'crypto'

export function encrypt(text: string): string {
    const iv = randomBytes(16)
    const ALGORITHM = 'aes-256-cbc'

    const cipher = createCipheriv(ALGORITHM, process.env.ENCRYPTION_KEY!, iv)

    const encrypted = Buffer.concat([
        cipher.update(text, 'utf-8'),
        cipher.final()
    ])

    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

