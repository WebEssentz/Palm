import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk"


export const GET = async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
        return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const polar = new Polar({
        accessToken: 'polar_oat_eBhBQmGYbWzMsjx8xGVLiKrK6cOhRe7jG0t7G2wmfWG',
        server: "sandbox"
    })

    // const polar = new Polar({
    //     accessToken: process.env.POLAR_ACCESS_TOKEN!,
    //     server: (process.env.POLAR_ENV ?? 'sandbox') as 'sandbox' | 'production'
    // })


    const session = await polar.checkouts.create({
        products: [process.env.POLAR_PRO_PLAN!],
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
        metadata: {
            userId,
        }
    })

    return NextResponse.json({ url: session.url })
}