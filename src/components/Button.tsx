import Image from "next/image"
import { LucideIcon } from "lucide-react"

type ButtonProps = {
  label: string
  icon: LucideIcon
  className?: string
  onClick: () => void
}

export default function ButtonIcon( {label, icon: Icon, onClick, className} : ButtonProps) {
    return (
        <button className={`flex justify-center mx-1 items-center rounded-lg border py-2 px-4 ${className}`}> 
            <Icon size={20} className="me-1"/>
            <span className="text-sm"> {label} </span>
        </button>
    )
}