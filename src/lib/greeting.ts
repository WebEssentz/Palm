/**
 * Greeting helper
 * Generates contextual greetings based on time of day and optional user name.
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

/**
 * Returns the current time of day bucket.
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
    const hour = date.getHours()
    if (hour >= 5 && hour < 12) {
        return 'morning'
    }
    if (hour >= 12 && hour < 17) {
        return 'afternoon'
    }
    return 'evening'
}

/**
 * Returns a greeting string such as "Good morning", "Good afternoon", or "Good evening".
 * If a name is provided, formats as "Good [timeOfDay], [firstName]".
 */
export function getGreeting(name?: string | null, date: Date = new Date()): string {
    const timeOfDay = getTimeOfDay(date)
    const capitalizedTime = timeOfDay.charAt(0) + timeOfDay.slice(1)
    const base = `Good ${capitalizedTime}`

    if (!name) {
        return base
    }

    const firstName = name.trim().split(/\s+/)[0]
    return firstName ? `${base}, ${firstName}` : base
}
