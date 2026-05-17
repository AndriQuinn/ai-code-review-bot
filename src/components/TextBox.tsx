
type TextBoxProps = {
    text: string,
    className?: string
}

export default function TextBox( {text, className}: TextBoxProps) {
    return (
        <div className={`font-gray ${className}`}>
            {text}
        </div>
    )
}