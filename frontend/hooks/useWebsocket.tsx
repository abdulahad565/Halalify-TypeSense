"use client"
import { useRef, useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"

interface UseWebSocketReturn {
    isConnected: boolean;
    connectionFailed: boolean;
    lastMessage: string | null;
    messageCount: number;
    sendMessage: (message: string) => void;
}

// Backoff waits between reconnect attempts, in ms. The delay doubles and touches
// the 30s ceiling exactly ONCE; after the last entry we stop retrying and prompt a
// refresh, rather than hammering the server at 30s over and over.
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000]
// A flapping server (accepts then instantly closes) resets the backoff index on
// each brief open, so this hard ceiling stops it looping well past the schedule.
const MAX_TOTAL_RECONNECTS = 12

const useWebsocket = (url: string): UseWebSocketReturn => {
    const wsRef = useRef<WebSocket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    // True only once every reconnect attempt has been exhausted — the UI uses this
    // to switch from "trying to reconnect" to a "please refresh" prompt.
    const [connectionFailed, setConnectionFailed] = useState(false)
    const [lastMessage, setLastMessage] = useState<string | null>(null)
    const [messageCount, setMessageCount] = useState<number>(0)
    const reconnectAttemptRef = useRef(0)
    const totalReconnectAttempts = useRef(0)

    useEffect(() => {
        const supabase = createClient()

        let reconnectTimeout: NodeJS.Timeout | undefined
        let stableTimeout: NodeJS.Timeout | undefined
        // Scoped to this effect instance. Set on cleanup (unmount / URL change)
        // so an intentional close doesn't count as a failure or trigger a reconnect.
        let cancelled = false

        // Pull the CURRENT access token every time we (re)connect. Supabase refreshes
        // it in the background, so re-reading getSession() here means a reconnect after
        // a drop uses a fresh token instead of the one captured at mount (which may
        // have expired) — otherwise every recovery would fail auth and force a reload.
        const buildAuthedUrl = async (): Promise<string> => {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token ?? ""
            return `${url}?token=${token}`
        }

        const scheduleReconnect = () => {
            if (cancelled) return
            // totalReconnectAttempts only resets after a *stable* connection (see
            // onopen), so it also guards against a flapping accept-then-close loop.
            totalReconnectAttempts.current += 1
            const idx = reconnectAttemptRef.current
            // Give up once the whole backoff schedule has been used (so the 30s step
            // runs exactly once), or if flapping has forced far more attempts than
            // the schedule length.
            if (idx >= RECONNECT_DELAYS_MS.length || totalReconnectAttempts.current > MAX_TOTAL_RECONNECTS) {
                console.log("Max reconnect attempts reached. Waiting for manual user action.")
                setConnectionFailed(true)
                return
            }
            const delay = RECONNECT_DELAYS_MS[idx]
            console.log(`Socket closed. Retrying in ${delay / 1000}s...`)
            reconnectTimeout = setTimeout(() => {
                reconnectAttemptRef.current += 1
                wsRef.current = null
                connect()
            }, delay)
        }

        const connect = async () => {
            if (cancelled) return
            if (reconnectAttemptRef.current >= RECONNECT_DELAYS_MS.length || totalReconnectAttempts.current > MAX_TOTAL_RECONNECTS) {
                setIsConnected(false)
                setConnectionFailed(true)
                return
            }

            let authedUrl: string
            try {
                authedUrl = await buildAuthedUrl()
            } catch (err) {
                // Couldn't read the session (offline / Supabase unavailable). Treat it
                // like any other failed attempt so the backoff schedule still applies.
                console.error("Failed to fetch auth session:", err)
                setIsConnected(false)
                scheduleReconnect()
                return
            }
            // The await above yields to the event loop; bail if we were torn down since.
            if (cancelled) return

            let ws: WebSocket
            try {
                ws = new WebSocket(authedUrl)
            } catch (err) {
                // e.g. malformed URL (NEXT_PUBLIC_BACKEND_WS_URL unset). Don't let
                // the throw re-run the effect into a tight loop.
                console.error("Failed to open WebSocket:", err)
                setIsConnected(false)
                scheduleReconnect()
                return
            }
            wsRef.current = ws

            ws.onopen = () => {
                console.log("Websocket connected successfully!")
                reconnectAttemptRef.current = 0
                setIsConnected(true)
                setConnectionFailed(false)
                // Only clear the failure cap once the connection has stayed open
                // a while — a flapping server shouldn't be able to reset it.
                stableTimeout = setTimeout(() => { totalReconnectAttempts.current = 0 }, 5000)
            }

            ws.onmessage = (event) => {
                setLastMessage(event.data)
                setMessageCount(prev => prev + 1)
            }

            ws.onclose = () => {
                clearTimeout(stableTimeout)
                setIsConnected(false)
                // Don't reconnect when the close was intentional (URL change/unmount).
                if (cancelled) return
                console.warn("Websocket connection closed!")
                scheduleReconnect()
            }

            ws.onerror = (error) => {
                console.error(`Websocket Error: ${error}`)
                wsRef.current?.close()
            }
        }

        connect()

        return () => {
            cancelled = true
            clearTimeout(reconnectTimeout)
            clearTimeout(stableTimeout)
            wsRef.current?.close()
        }
    }, [url])

    // Stable identity so consumers can safely list it in effect deps.
    const sendMessage = useCallback((message: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(message)
        }
    }, [])

    return { isConnected, connectionFailed, messageCount, lastMessage, sendMessage }
}

export default useWebsocket
