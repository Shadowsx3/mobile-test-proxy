import { WebSocket, MessageEvent } from 'ws'

export class WebSocketClient {
    private socket: WebSocket
    private interceptors: Map<string, number> // To store alias and the count of intercepted messages

    constructor(url: string) {
        this.socket = new WebSocket(url)
        this.interceptors = new Map<string, number>()
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket.on('open', () => {
                console.log('WebSocket connection established')
                resolve()
            })

            this.socket.on('error', (error: Error) => {
                console.error('WebSocket error:', error)
                reject(error)
            })

            // Listen to incoming messages and update the count in the appropriate interceptor
            this.socket.on('message', (message: MessageEvent) => {
                let data = message as any
                if (data instanceof Buffer) {
                    data = data.toString()
                }

                this.interceptors.forEach((count, alias) => {
                    if (data.includes(alias)) {
                        this.interceptors.set(alias, count + 1) // Increment the count for the alias
                        console.log(
                            `Intercepted message for ${alias}. Count: ${count + 1}`,
                        )
                    }
                })
            })
        })
    }

    private sendMessage(action: string, options: any): void {
        const message = JSON.stringify({ action, options })
        this.socket.send(message)
    }

    async addInterceptor(
        match: { url: string; method?: string },
        as: string,
        response?: any,
        persist = false,
    ): Promise<void> {
        const options = {
            match,
            as,
            response,
            persist,
        }

        this.interceptors.set(as, 0)

        this.sendMessage('intercept', options)
    }

    async waitForResponse(
        expected: string,
        expectedCount: number = 1,
        timeout = 10000,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const initialCount = this.interceptors.get(expected) || 0

            if (initialCount >= expectedCount) {
                console.log(
                    `Wait for ${expected} resolved immediately. Count: ${initialCount}`,
                )
                resolve()
                return
            }

            let receivedCount = initialCount

            const onMessage = (message: MessageEvent) => {
                let data = message as any
                if (data instanceof Buffer) {
                    data = data.toString()
                }
                if (data.includes(expected)) {
                    receivedCount += 1
                    console.log(
                        `Received message for ${expected}. Count: ${receivedCount}`,
                    )
                    if (receivedCount >= expectedCount) {
                        console.log(
                            `Wait for ${expected} resolved after receiving message. Final Count: ${receivedCount}`,
                        )
                        this.socket.removeListener('message', onMessage)
                        resolve()
                    }
                }
            }

            this.socket.on('message', onMessage)

            setTimeout(() => {
                this.socket.removeListener('message', onMessage)
                reject(
                    new Error(
                        `Timed out waiting for response: ${expected}. Count received: ${receivedCount}`,
                    ),
                )
            }, timeout)
        })
    }

    async clearAll(): Promise<void> {
        this.interceptors.clear()
        this.sendMessage('clear_all', {})
    }
}
