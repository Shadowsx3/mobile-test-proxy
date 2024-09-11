import WebSocket from 'ws'

export class WebSocketClient {
    private socket: WebSocket
    private pendingActions: Map<
        string,
        (value: void | PromiseLike<void>) => void
    > = new Map()

    constructor(url: string) {
        this.socket = new WebSocket(url)

        this.socket.on('open', () => {
            console.log('WebSocket connection established')
        })

        this.socket.on('message', (data: WebSocket.MessageEvent) => {
            const message = JSON.parse(data.toString())
            console.log('Received message from WebSocket:', message)

            if (message.status && this.pendingActions.has(message.action)) {
                const resolve = this.pendingActions.get(message.action)
                if (resolve) {
                    resolve(message.status)
                    this.pendingActions.delete(message.action)
                }
            }
        })

        this.socket.on('close', () => {
            console.log('WebSocket connection closed')
        })

        this.socket.on('error', (error: Error) => {
            console.error('WebSocket error:', error)
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
        await this.sendMessageWithAck('intercept', options)
    }

    async waitForResponse(expected: string, timeout = 10000): Promise<void> {
        return new Promise((resolve, reject) => {
            const onMessage = (message: WebSocket.MessageEvent) => {
                let data = message as any
                if (data instanceof Buffer) {
                    data = data.toString()
                }
                if (data.includes(expected)) {
                    this.socket.removeListener('message', onMessage)
                    resolve()
                }
            }

            this.socket.on('message', onMessage)

            setTimeout(() => {
                this.socket.removeListener('message', onMessage)
                reject(new Error(`Timed out waiting for response: ${expected}`))
            }, timeout)
        })
    }

    async clearAll(): Promise<void> {
        await this.sendMessageWithAck('clear_all', {})
    }

    private async sendMessageWithAck(
        action: string,
        options: any,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.pendingActions.set(action, resolve)
            this.sendMessage(action, options)

            setTimeout(() => {
                this.pendingActions.delete(action)
                reject(
                    new Error(
                        `Timed out waiting for acknowledgment of action: ${action}`,
                    ),
                )
            }, 10000)
        })
    }
}
