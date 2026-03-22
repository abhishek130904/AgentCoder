import axios from "axios"

const API = axios.create({
  baseURL: "https://agentcoder-jz61.onrender.com/api"
})

export const createProject = (prompt: string) =>
  API.post("/projects", null, { params: { prompt } })

export const getStatus = (jobId: string) =>
  API.get(`/projects/${jobId}/status`)

export const getFiles = (jobId: string) =>
  API.get(`/projects/${jobId}/files`)

export const getFileContent = (jobId: string, path: string) =>
  API.get(`/projects/${jobId}/files/${path}`)

export const downloadProject = (jobId: string) =>
  `https://agentcoder-jz61.onrender.com/api/projects/${jobId}/download`