export async function captureAndUploadSnapshot(
    shapeId: string,
    html: string,
    dims: { w: number; h: number },
    projectId: string
): Promise<string | null> {
    try {
        // Render HTML in offscreen iframe
        const iframe = document.createElement('iframe')
        iframe.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: 1280px;
            height: ${Math.round(dims.h * (1280 / dims.w))}px;
            border: none;
            visibility: hidden;
        `
        document.body.appendChild(iframe)

        await new Promise<void>((resolve) => {
            iframe.onload = () => resolve()
            iframe.srcdoc = html
            // Fallback timeout
            setTimeout(resolve, 3000)
        })

        // Give scripts a moment to run (Tailwind, etc.)
        await new Promise(r => setTimeout(r, 800))

        // Capture with html2canvas
        const { default: html2canvas } = await import('html2canvas')
        const canvas = await html2canvas(iframe.contentDocument!.body, {
            width: 1280,
            height: Math.round(dims.h * (1280 / dims.w)),
            scale: 0.25,  // produce ~320px wide image
            useCORS: true,
            logging: false,
        })

        document.body.removeChild(iframe)

        // Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed')), 'image/webp', 0.85)
        )

        // Get upload URL
        const uploadRes = await fetch('/api/snapshots/upload-url', {
            method: 'POST',
        })
        const { url: uploadUrl, storageId } = await uploadRes.json()

        // Upload blob to storage
        await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'image/webp' },
            body: blob,
        })

        // Save to Convex and get permanent URL
        const saveRes = await fetch('/api/snapshots/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shapeId, projectId, storageId }),
        })
        const { url: thumbnailUrl } = await saveRes.json()

        return thumbnailUrl

    } catch (e) {
        console.error('Snapshot failed:', e)
        return null
    }
}
