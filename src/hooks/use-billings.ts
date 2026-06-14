// hooks/use-subscription-plan.ts
import { useLazyGetCheckoutQuery } from "@/redux/api/billing"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { toast } from "sonner"

export const useSubscriptionPlan = () => {
    const [trigger, { isFetching }] = useLazyGetCheckoutQuery()
    const me = useQuery(api.user.getCurrentUser)

    const onSubscribe = async () => {
        try {
            const res = await trigger(me?._id).unwrap()
            window.location.href = res.url
        } catch (error) {
            console.log("Checkout error: ", error)
            toast.error('Failed to create checkout session. Please try again.')
        }
    }

    return {
        onSubscribe,
        isFetching,
    }
}