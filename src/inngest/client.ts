import { Inngest } from "inngest";
import { realtimeMiddleware } from '@inngest/realtime'

export const inngest = new Inngest({
    id: 'palm',
    middleware: [realtimeMiddleware()],
    eventKey: process.env.INNGEST_EVENT_KEY,
    isDev: process.env.NODE_ENV === 'development' 
})