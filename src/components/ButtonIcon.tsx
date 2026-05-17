import Image from "next/image"
import { LucideIcon } from "lucide-react"

type ButtonProps = {
  label: string
  icon: LucideIcon | string
  className?: string
  onClick: () => void
}

export default function ButtonIcon( {label, icon: Icon, onClick, className} : ButtonProps) {
    return (
        <button className={`flex justify-center items-center rounded-lg border cursor-pointer ${className}`}> 
            {typeof Icon === "string" ? 
            <Image src={Icon} alt={label} width={20} height={20} className="me-1"/>
            :
            <Icon size={20} className="me-1"/>
            }
            <span className="text-sm"> {label} </span>
        </button>
    )
}