/**
 * Data-transfer types shared by the API routes and the React components.
 * (Dates arrive as ISO strings over JSON.)
 */

export type Role = 'OWNER' | 'EDITOR' | 'VIEWER'

export interface UserDTO {
  id: string
  email: string
  name: string
  color: string
}

export interface DocumentListItem {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  owner: Pick<UserDTO, 'id' | 'name' | 'color'>
  collaboratorCount: number
  myRole: Role
}

export interface DocumentDetail {
  id: string
  title: string
  ownerId: string
  createdAt: string
  updatedAt: string
  owner: Pick<UserDTO, 'id' | 'name' | 'color'>
  myRole: Role
}

export interface CollaboratorDTO {
  userId: string
  name: string
  email: string
  color: string
  role: Role
  joinedAt: string
}
