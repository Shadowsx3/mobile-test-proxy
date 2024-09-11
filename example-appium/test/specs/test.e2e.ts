import { expect } from '@wdio/globals'
import LoginPage from '../pageobjects/login.page.js'
import SecurePage from '../pageobjects/secure.page.js'
import { WebSocketClient } from '../WebSocketClient.js'

describe('My Login application', () => {
    let wsClient: WebSocketClient

    before(() => {
        wsClient = new WebSocketClient('ws://localhost:8765') // Replace with your WebSocket server URL
    })

    it('should login with valid credentials', async () => {
        await wsClient.addInterceptor(
            { url: 'https://the-internet.herokuapp.com/login' },
            '@login',
        )

        await LoginPage.open()

        await wsClient.waitForResponse('@login')

        await LoginPage.login('tomsmith', 'SuperSecretPassword!')

        await expect(SecurePage.flashAlert).toBeExisting()
        await expect(SecurePage.flashAlert).toHaveText(
            expect.stringContaining('You logged into a secure area!'),
        )
    })
})
