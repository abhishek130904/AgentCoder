import axios from "axios"

// Use environment variable for API URL.
// - In local dev: Vite proxy handles "/api" → http://127.0.0.1:8000
// - In production (Vercel): falls back to the Render backend URL
const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? "/api" : "https://agentcoder-jz61.onrender.com/api")

const API = axios.create({
  baseURL: API_BASE,
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
  return `${API_BASE}/projects/${jobId}/download`
}