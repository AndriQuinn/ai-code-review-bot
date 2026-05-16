import "@/app/globals.css"
import { ArrowDownToLine } from "lucide-react"
import Button from "@/components/Button"

export default function Navbar() {
    return (
        <div className="flex justify-between items-center px-16 py-4">
            <Logo/>
            <Pages/>
            <CTAButtons/>
        </div>
    )
}

function Logo() {
    return (
        <div>
            <h1 className="font-semibold text-xl"> Shoa </h1>
        </div>
    )
}

function Pages() {
    return (
        <div className="flex justify-between">
            <a className="mx-5" > How it works </a>
            <a className="mx-5"> Features </a>
            <a className="mx-5"> Privacy </a>
        </div>
    )
}

function CTAButtons() {
    return (
        <div className="flex justify-between">
            <Button 
                icon={ArrowDownToLine}
                label="Github"
                onClick={() => console.log("Heelo")}
            />
            <Button 
                icon={ArrowDownToLine}
                label="Install App"
                onClick={() => console.log("Heelo")}
                className="background-gradient-blue font-white"
            />
        </div>
    )
}