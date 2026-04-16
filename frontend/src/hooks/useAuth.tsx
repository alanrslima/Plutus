import React, { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../services/api'
import { User } from '../types'

interface AuthContextData {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('plutos:user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('plutos:token'))

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    setUser(data.user)
    setToken(data.token)
    localStorage.setItem('plutos:token', data.token)
    localStorage.setItem('plutos:user', JSON.stringify(data.user))
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await api.post('/auth/register', { name, email, password })
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('plutos:token')
    localStorage.removeItem('plutos:user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
