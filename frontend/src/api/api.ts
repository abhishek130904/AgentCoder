import axios from "axios"

// BUG-13 FIX: Use environment variable for API URL, falling back to "/api"
// which works with the Vite proxy in development. The old hardcoded
// production URL meant local development always hit production.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
})

export const createProject = (prompt: string) =>
  API.post("/projects", { prompt })

export const getStatus = (jobId: string) =>
  API.get(`/projects/${jobId}/status`)

export const getFiles = (jobId: string) =>
  API.get(`/projects/${jobId}/files`)

export const getFileContent = (jobId: string, path: string) =>
  API.get(`/projects/${jobId}/files/${path}`)

export const downloadProject = (jobId: string) => {
  const base = import.meta.env.VITE_API_URL || "/api"
  return `${base}/projects/${jobId}/download`
}