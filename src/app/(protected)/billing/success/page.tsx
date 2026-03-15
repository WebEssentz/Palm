"use client"

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const Page = () => {
    const router = useRouter()
    const redirected = useRef(false)
    const [timeOut, setTimeOut] = useState(false)

    const me = useQuery(api.user.getCurrentUser, {});

    const entitled = useQuery(
        api.subscription.hasEntitlement,
        me && me._id ? { userId: me._id as Id<"users"> } : "skip"
    );

    useEffect(() => {
        if (redirected.current) return;

        if (me === undefined) return;

        if (me === null) {
            redirected.current = true;
            router.replace("/auth/sign-in");
            return;
        }

        if (entitled) {
            redirected.current = true;
            router.replace("/dashboard")
        }
    }, [me, entitled, router])

    useEffect(() => {
        if (redirected.current) return;
        if (!me || entitled) return;

        const t = setTimeout(() => {
            if (redirected.current) return;
            setTimeOut(true);
            redirected.current = true;
            router.replace(`/billing/${me.name}`)
        }, 45_000);

        return () => clearTimeout(t)
    }, [me, entitled, router]) 

    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md p-8 text-center">
            <div className="mb-3">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent align-[-2px]"/>
            </div>
            <div className="mb-1 text-lg">
                Finalizing your subscription
            </div>
            <div className="text-sm text-gray-500" aria-live="polite">
                {me === undefined
                    ? "Checking your account...."
                    : entitled === undefined
                        ? "Waiting for Polar to confirm your payment...."
                        : entitled
                            ? "Success! Redirecting to dashboard...."
                            : timeOut
                                ? "This is taking longer than expected, redirecting to billing"
                                : "Something went wrong. Please check your email or contact support."
                }
            </div>
        </div>
        </div>
    )
}

export default Page