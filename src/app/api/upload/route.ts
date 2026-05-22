import { NextRequest, NextResponse } from 'next/server'
import { fetchMutation } from 'convex/nextjs'
import { api } from '../../../../convex/_generated/api'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

        // Get a short-lived upload URL from Convex
        const uploadUrl = await fetchMutation(api.files.generateUploadUrl)

        // Stream the file directly to Convex storage
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
        })

        if (!uploadRes.ok) {
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
        }

        const { storageId } = await uploadRes.json()
        return NextResponse.json({ storageId })
    } catch (err) {
        console.error('Upload error:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}