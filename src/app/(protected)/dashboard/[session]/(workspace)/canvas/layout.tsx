'use client'

import Toolbar from "@/components/canvas/toolbar"
import React from "react"

type Props = {
    children: React.ReactNode
}

const Layout = (props: Props) => {
    return (
        <div className="w-full h-screen">
            {props.children}
            <Toolbar />
        </div>
    )
}

export default Layout