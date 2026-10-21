import { apiRequest } from "./apiClient"
import type {
  MyProfileResponse,
  MemberProfileResponse,
  ProfilePatch,
  ExperienceResponse,
  ExperienceUpsert,
  CertificateResponse,
  CertificateUpsert,
} from "../types/profile"

const owner = "/api/me/profile"
const member = (userId: string) =>
  `/api/users/${encodeURIComponent(userId)}/profile`
const json = (method: string, payload: unknown) => ({
  method,
  body: JSON.stringify(payload),
})

export const getMyProfile = (signal?: AbortSignal) =>
  apiRequest<MyProfileResponse>(owner, { signal }).then((res) => res.data)
export const patchMyProfile = (patch: ProfilePatch) =>
  apiRequest<MyProfileResponse>(owner, json("PATCH", patch)).then(
    (res) => res.data,
  )
export const getMemberProfile = (userId: string, signal?: AbortSignal) =>
  apiRequest<MemberProfileResponse>(member(userId), { signal }).then(
    (res) => res.data,
  )

export const getExperiences = (userId?: string, signal?: AbortSignal) =>
  apiRequest<ExperienceResponse[]>(
    `${userId ? member(userId) : owner}/experiences`,
    { signal },
  ).then((res) => res.data)
export const createExperience = (payload: ExperienceUpsert) =>
  apiRequest<ExperienceResponse>(
    `${owner}/experiences`,
    json("POST", payload),
  ).then((res) => res.data)
export const updateExperience = (id: string, payload: ExperienceUpsert) =>
  apiRequest<ExperienceResponse>(
    `${owner}/experiences/${encodeURIComponent(id)}`,
    json("PUT", payload),
  ).then((res) => res.data)
export const deleteExperience = async (id: string): Promise<void> => {
  await apiRequest<void>(`${owner}/experiences/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export const getCertificates = (userId?: string, signal?: AbortSignal) =>
  apiRequest<CertificateResponse[]>(
    `${userId ? member(userId) : owner}/certificates`,
    { signal },
  ).then((res) => res.data)
export const createCertificate = (payload: CertificateUpsert) =>
  apiRequest<CertificateResponse>(
    `${owner}/certificates`,
    json("POST", payload),
  ).then((res) => res.data)
export const updateCertificate = (id: string, payload: CertificateUpsert) =>
  apiRequest<CertificateResponse>(
    `${owner}/certificates/${encodeURIComponent(id)}`,
    json("PUT", payload),
  ).then((res) => res.data)
export const deleteCertificate = async (id: string): Promise<void> => {
  await apiRequest<void>(`${owner}/certificates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}
