import { fetchMutation, fetchQuery } from "convex/nextjs";
import { inngest } from "./client";
import { api } from "../../convex/_generated/api";
import { extractOrderLike, extractSubscriptionLike, grantKey, isEntitledStatus, isPolarWebhookEvent, PolarOrder, PolarSubscription, ReceivedEvent, toMs } from "@/types/polar";
import { Id } from "../../convex/_generated/dataModel";

export const autosaveProjectWorkflow = inngest.createFunction(
    {id: 'autosave-project-workflow'},
    {event: 'project/autosave.requested'},
    async ({event}) => {
        const { projectId, shapesData, viewportData } = event.data
        try {
            await fetchMutation(api.projects.updateProjectSketches, {
                projectId,
                sketchesData: shapesData,
                viewportData
            })

            return { success: true }
        } catch (error) {
            console.error('Error saving project:', error)
            return { success: false }
        }
    }
)

export const handlePolarEvent = inngest.createFunction(
    { id: 'polar-webhook-handler' },
    { event: 'polar/webhook.received' },
    async ({event, step}) => {
        if (!isPolarWebhookEvent(event.data)) {
            return 
        }  

        const incoming = event.data as ReceivedEvent
        const type = incoming.type
        const dataUnknown = incoming.data

        const sub: PolarSubscription | null = extractSubscriptionLike(dataUnknown)
        const order: PolarOrder | null = extractOrderLike(dataUnknown)

        if (!sub && !order) {
            return
        }
        
        const userId: Id<"users"> | null = await step.run(
            'resolve-user',
            async () => {
                const metaUserId = 
                    (sub?.metadata?.userId as string | undefined) ??
                    (order?.metadata?.userId as string | undefined)

                if (metaUserId) {
                    return metaUserId as unknown as Id<"users">
                }

                const email = sub?.customer?.email ?? order?.customer?.email ?? null

                if (email) {
                    try {
                        const foundUserId = await fetchQuery(api.user.getUserIdByEmail, {
                            email,
                        })

                        return foundUserId
                    } catch (error) {
                        console.error('Error resolving user by email:', error)
                        return null
                    }
                }
                return null
            }
        )
        console.log('Resolved user ID:', userId)
        if (!userId) {
            console.error('Could not resolve user ID for Polar event:', incoming)
            return
        }

        const polarSubscriptionId = sub?.id ?? order?.subscription_id ?? ''
        console.log('Polar subscription ID:', polarSubscriptionId)
        if (!polarSubscriptionId) {
            console.error('Could not resolve Polar subscription ID for event:', incoming)
            return
        }

        const currentPeriodEnd = toMs(sub?.current_period_end)

        const payload = {
            userId,
            polarCustomerId: sub?.customer_id ?? order?.customer_id ?? '',
            polarSubscriptionId,
            currentPeriodEnd,
            productId: sub?.product_id ?? sub?.product?.id ?? undefined,
            priceId: sub?.prices?.[0]?.id ?? undefined,
            planCode: sub?.plan_code ?? sub?.product?.name ?? undefined,
            status: sub?.status ?? "updated",
            trialEndsAt: toMs(sub?.trial_ends_at),
            cancelAt: toMs(sub?.cancel_at),
            canceledAt: toMs(sub?.canceled_at),
            seats: sub?.seats ?? undefined,
            metadata: dataUnknown,
            creditsGrantPerPeriod: 10,
            creditsRolloverLimit: 100,
        }

        const subscriptionId = await step.run(
            'upsert-subscription',
            async () => {
                try {
                    const existingByPolar = await fetchQuery(
                        api.subscription.getByPolarId,
                        {
                            polarSubscriptionId: payload.polarSubscriptionId
                        }
                    )

                    const exisitingByUser = await fetchQuery(
                        api.subscription.getSubscriptionsForUser,
                        {
                            userId: payload.userId
                        }
                    )

                    if (
                        existingByPolar &&
                        exisitingByUser &&
                        existingByPolar._id !== exisitingByUser._id
                    ) {
                        console.warn('Polar subscription ID already exists for user:', userId)
                        console.warn('  - By Polar ID: ', existingByPolar._id)
                        console.warn('  - By User ID: ', exisitingByUser._id)
                    } 

                    const result = await fetchMutation(
                        api.subscription.upsertFromPolar,
                        payload
                    )

                    const allUserSubs = await fetchQuery(
                        api.subscription.getAllForUser,
                        {
                            userId: payload.userId
                        }
                    )

                    if (allUserSubs && allUserSubs.length > 1) {
                        allUserSubs.forEach((sub) => {
                            console.warn('Existing subscription for user:', userId, 'Subscription ID:', sub._id, 'Polar Subscription ID:', sub.polarSubscriptionId)
                        })
                    }

                    return result
                } catch (error) {
                    console.error('Error upserting subscription:', error)
                    throw error
                }
            }
        )

        const looksCreate = /subscription\.created/i.test(type)
        const looksRenew = /subscription\.renew|order\.created|invoice\.paid|order\.paid/i.test(type)

        const entitled = isEntitledStatus(payload.status)

        console.log(`User ${userId} subscription status: ${payload.status} (entitled: ${entitled}) looksCreate: ${looksCreate} looksRenew: ${looksRenew}`)
        const idk = grantKey(polarSubscriptionId, currentPeriodEnd, incoming.id)

        console.log("Idempotency key for this event:", idk)

        if (
            entitled &&
            (looksCreate || looksRenew || true) 
        ) {
            const grant = await step.run(
                'grant-credits',
                async () => {
                    try {
                        const result = await fetchMutation(
                            api.subscription.grantCreditsIfNeeded,
                            {
                                subscriptionId,
                                idempotencyKey: idk,
                                amount: 10,
                                reason: looksCreate ? 'initial-grant' : 'renewal-grant'
                            }
                        )
                        return result
                    } catch (err) {
                        console.error('Error granting credits:', err)
                        throw err
                    }
                }
            )

            console.log('Granted credits:', grant)

            if (grant.ok && !('skipped' in grant && grant.skipped)) {
                await step.sendEvent(
                    'credits-granted',
                    {
                        name: 'billing/credits.granted',
                        id: `credits-granted:${polarSubscriptionId}:${currentPeriodEnd ?? 'first'}`,
                        subscriptionId,
                        amount: 'granted' in grant ? (grant.granted ?? 10) : 10,
                        balance: 'balance' in grant ? grant.balance : undefined,
                        periodEnd: currentPeriodEnd
                    }
                )
                console.log('Sent credits granted event')
            } else {
                console.log('Skipped credits granted event')
            }
        } else {
            console.log('Not entitled, skipping credits granted event')
        }

        await step.sendEvent(
            'sub-synced',
            {
                name: 'billing/subscription.synced',
                id: `sub-synced:${polarSubscriptionId}:${currentPeriodEnd ?? 'first'}`,
                data: {
                    userId,
                    polarSubscriptionId,
                    status: payload.status,
                    currentPeriodEnd
                }
            }
        )

        console.log('Sent subscription synced event')
        
        if (currentPeriodEnd && currentPeriodEnd > Date.now()){
            const runAt = new Date(
                Math.max(Date.now() + 5000, currentPeriodEnd - 3 * 24 * 60 * 60 * 1000)
            )
            await step.sleepUntil('wait-until-expiry', runAt)
            const stillEntitled = await step.run(
                'check-entitlement',
                async () => {
                    try {
                        const result = await fetchQuery(
                            api.subscription.hasEntitlement,
                            {
                                userId
                            }
                        )
                        console.log('User still entitled:', result)
                        return result
                    } catch (err) {
                        console.error('Error checking entitlement:', err)
                        throw err
                    }
                }
            )

            if (stillEntitled) {
                await step.sendEvent(
                    'pre-expiry',
                    {
                        name: 'billing/subscription.pre_expiry',
                        data: {
                            userId,
                            runAt: runAt.toISOString(),
                            periodEnd: currentPeriodEnd
                        }
                    }
                )
            }
        }
    }
)

