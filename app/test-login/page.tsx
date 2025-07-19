"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestLogin() {
  const [logs, setLogs] = useState<string[]>([])
  const [testing, setTesting] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `${timestamp}: ${message}`
    console.log(logMessage)
    setLogs(prev => [...prev, logMessage])
  }

  const testBasicConnection = async () => {
    setTesting(true)
    setLogs([])
    
    try {
      addLog("=== TESTING BASIC SUPABASE CONNECTION ===")
      
      // Test 1: Basic Supabase client
      addLog("1. Testing Supabase client initialization...")
      if (supabase) {
        addLog("✅ Supabase client exists")
      } else {
        addLog("❌ Supabase client is null/undefined")
        return
      }

      // Test 2: Test basic auth methods exist
      addLog("2. Testing auth methods...")
      if (supabase.auth) {
        addLog("✅ supabase.auth exists")
        if (typeof supabase.auth.signInWithPassword === 'function') {
          addLog("✅ signInWithPassword method exists")
        } else {
          addLog("❌ signInWithPassword method missing")
        }
      } else {
        addLog("❌ supabase.auth is null/undefined")
        return
      }

      // Test 3: Try to get current session (should be quick)
      addLog("3. Testing getSession...")
      const startTime = Date.now()
      
      try {
        const { data, error } = await supabase.auth.getSession()
        const endTime = Date.now()
        addLog(`✅ getSession completed in ${endTime - startTime}ms`)
        addLog(`   Session: ${data.session ? 'exists' : 'null'}`)
        addLog(`   Error: ${error ? error.message : 'none'}`)
      } catch (sessionError: any) {
        addLog(`❌ getSession failed: ${sessionError.message}`)
      }

      // Test 4: Try a simple database query
      addLog("4. Testing database connection...")
      try {
        const dbStart = Date.now()
        const { data, error } = await supabase.from('users').select('count').limit(1)
        const dbEnd = Date.now()
        addLog(`✅ Database query completed in ${dbEnd - dbStart}ms`)
        addLog(`   Error: ${error ? error.message : 'none'}`)
        addLog(`   Data: ${data ? 'received' : 'null'}`)
      } catch (dbError: any) {
        addLog(`❌ Database query failed: ${dbError.message}`)
      }

    } catch (error: any) {
      addLog(`❌ Test failed: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const testActualLogin = async () => {
    setTesting(true)
    setLogs([])
    
    try {
      addLog("=== TESTING ACTUAL LOGIN FLOW ===")
      addLog("Testing with: test@example.com / password123")
      
      const startTime = Date.now()
      addLog("Calling supabase.auth.signInWithPassword...")
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
      })
      
      const endTime = Date.now()
      addLog(`signInWithPassword completed in ${endTime - startTime}ms`)
      
      if (error) {
        addLog(`❌ Login error: ${error.message}`)
        addLog(`   Error code: ${error.status || 'no status'}`)
      } else {
        addLog(`✅ Login successful!`)
        addLog(`   User: ${data.user?.email || 'no email'}`)
        addLog(`   Session: ${data.session ? 'exists' : 'null'}`)
      }
      
    } catch (error: any) {
      addLog(`❌ Login exception: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const clearLogs = () => setLogs([])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Login Diagnostic Tool</h1>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={testBasicConnection}
            disabled={testing}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Basic Connection'}
          </button>
          
          <button
            onClick={testActualLogin}
            disabled={testing}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 ml-4"
          >
            {testing ? 'Testing...' : 'Test Actual Login'}
          </button>
          
          <button
            onClick={clearLogs}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 ml-4"
          >
            Clear Logs
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Test Results</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">Click a test button to start debugging...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🔍 What to look for:</h3>
          <ul className="text-yellow-700 space-y-1 text-sm">
            <li>• <strong>Connection issues:</strong> If basic tests fail, it's an environment/config problem</li>
            <li>• <strong>Timeout issues:</strong> If calls take &gt;10 seconds, there's a network/server issue</li>
            <li>• <strong>Auth hanging:</strong> If login never completes, it's the deadlock bug or server issue</li>
            <li>• <strong>Database errors:</strong> If DB queries fail, check your Supabase project status</li>
          </ul>
        </div>
      </div>
    </div>
  )
}