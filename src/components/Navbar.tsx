import "@/app/globals.css"
import { ArrowDownToLine } from "lucide-react"
import Button from "@/components/ButtonIcon"

export default function Navbar() {
    return (
        <div className="flex flex-col md:flex-row justify-between items-center px-16 py-4 border-bottom-color-gray">
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
        <div className="flex justify-between gap-x-10 flex-col md:flex-row">
            <a className="text-sm cursor-pointer font-gray-transition-blue" > How it works </a>
            <a className="text-sm cursor-pointer font-gray-transition-blue"> Features </a>
            <a className="text-sm cursor-pointer font-gray-transition-blue"> Privacy </a>
        </div>
    )
}

function CTAButtons() {
    return (
        <div className="flex justify-between gap-x-1">
            <Button 
                icon={"/github.svg"}
                label="Github"
                onClick={() => console.log("Heelo")}
                className="border-color-gray font-gray-transition-blue py-2 px-4"
            />
            <Button 
                icon={ArrowDownToLine}
                label="Install App"
                onClick={() => console.log("Heelo")}
                className="background-gradient-blue font-white py-2 px-4"
            />
        </div>
    )
}