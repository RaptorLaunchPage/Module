"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DirectTest() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const testDirectLogin = async () => {
    setIsLoading(true)
    setResult('')
    
    try {
      console.log('🧪 DIRECT TEST: Starting login...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      console.log('🧪 DIRECT TEST: Response received:', { data, error })
      
      if (error) {
        setResult(`❌ Error: ${error.message}`)
      } else {
        setResult(`✅ Success: User ${data.user?.email} logged in`)
      }
      
    } catch (err: any) {
      console.error('🧪 DIRECT TEST: Exception:', err)
      setResult(`❌ Exception: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', fontFamily: 'Arial' }}>
      <h1>Direct Supabase Auth Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>This page tests Supabase auth directly without the AuthProvider</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        
        <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        
        <button 
          onClick={testDirectLogin} 
          disabled={isLoading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: isLoading ? '#ccc' : '#007bff', 
            color: 'white', 
            border: 'none', 
            cursor: 'pointer' 
          }}
        >
          {isLoading ? 'Testing...' : 'Test Direct Login'}
        </button>
      </div>

      {result && (
        <div style={{ 
          padding: '10px', 
          border: '1px solid #ccc', 
          backgroundColor: result.includes('❌') ? '#ffe6e6' : '#e6ffe6',
          marginBottom: '20px'
        }}>
          <strong>Result:</strong> {result}
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>Check browser console for detailed logs</p>
      </div>
    </div>
  )
}