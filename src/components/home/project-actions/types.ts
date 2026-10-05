import { Id } from '../../../../convex/_generated/dataModel'

export interface ProjectActionItem {
    _id: string
    name: string
    projectNumber?: number
    thumbnail?: string
    thumbnailStorageId?: string
    lastEditedBy?: string
    lastModified: number
    createdAt?: number
    isPublic?: boolean
    workspaceId?: string
    visibility?: 'workspace' | 'private'
    createdBy?: string
    folderId?: string
    isPinned?: boolean
    authorName?: string
}

export interface FolderOptionItem {
    _id: string
    name: string
    projectCount?: number
    color?: string
    emoji?: string
}
