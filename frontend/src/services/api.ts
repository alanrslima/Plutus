import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('plutos:token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('plutos:token')
      localStorage.removeItem('plutos:user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
