"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

// Utility to get logs from localStorage
function getStoredLogs() {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem("debug-logs") || "[]")
  } catch {
    return []
  }
}

// Utility to store logs in localStorage
function storeLogs(logs: any[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("debug-logs", JSON.stringify(logs))
}

// Patch console methods to capture logs
function patchConsole(setLogs: (logs: any[]) => void) {
  if (typeof window === "undefined") return
  if ((window as any).__console_patched) return
  (window as any).__console_patched = true

  const orig = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  }
  const addLog = (level: string, ...args: any[]) => {
    const entry = {
      level,
      message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      time: new Date().toISOString(),
    }
    const logs = getStoredLogs().concat(entry).slice(-500) // keep last 500
    storeLogs(logs)
    setLogs([...logs])
  }
  console.log = (...args) => { addLog("log", ...args); orig.log(...args) }
  console.warn = (...args) => { addLog("warn", ...args); orig.warn(...args) }
  console.error = (...args) => { addLog("error", ...args); orig.error(...args) }
  console.info = (...args) => { addLog("info", ...args); orig.info(...args) }
  window.addEventListener("error", (e) => addLog("error", e.message))
  window.addEventListener("unhandledrejection", (e: any) => addLog("error", e.reason?.message || e.reason))
}

export default function DebugLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Patch console and load logs on mount
  useEffect(() => {
    setLogs(getStoredLogs())
    patchConsole(setLogs)
    const interval = setInterval(() => setLogs(getStoredLogs()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  const handleRefresh = () => setLogs(getStoredLogs())
  const handleCopy = () => {
    navigator.clipboard.writeText(logs.map(l => `[${l.time}] [${l.level}] ${l.message}`).join("\n"))
  }
  const handleClear = () => {
    storeLogs([])
    setLogs([])
  }

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-black text-white">
      <h1 className="text-2xl font-bold mb-4">Debug Log Console</h1>
      <div className="flex gap-2 mb-2">
        <Button size="sm" onClick={handleRefresh}>Refresh</Button>
        <Button size="sm" onClick={handleCopy}>Copy Logs</Button>
        <Button size="sm" variant="destructive" onClick={handleClear}>Clear Logs</Button>
        <label className="ml-4 flex items-center gap-1 text-xs">
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} /> Auto-scroll
        </label>
      </div>
      <div className="bg-gray-900 rounded p-2 h-[60vh] overflow-y-auto text-xs font-mono border border-gray-700">
        {logs.length === 0 && <div className="text-gray-400">No logs yet.</div>}
        {logs.map((log, i) => (
          <div key={i} className={
            log.level === "error" ? "text-red-400" :
            log.level === "warn" ? "text-yellow-300" :
            log.level === "info" ? "text-blue-300" :
            "text-gray-100"
          }>
            <span className="text-gray-500">[{log.time}]</span> [<span className="uppercase">{log.level}</span>] {log.message}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}