import { expect } from '@wdio/globals'
import LoginPage from '../pageobjects/login.page.js'
import SecurePage from '../pageobjects/secure.page.js'
import { WebSocketClient } from '../WebSocketClient.js'
import { readFile } from 'fs/promises'

describe('My Login application', () => {
    let wsClient: WebSocketClient

    before(async () => {
        wsClient = new WebSocketClient('ws://localhost:8765')
        await wsClient.connect()
    })

    it('should login with valid credentials', async () => {
        await LoginPage.open()

        await LoginPage.login('tomsmith', 'SuperSecretPassword!')

        await expect(SecurePage.flashAlert).toBeExisting()
        await expect(SecurePage.flashAlert).toHaveText(
            expect.stringContaining('You logged into a secure area!'),
        )
    })

    it('should login with valid credentials and get a hedgehog', async () => {
        const htmlContent = await readFile(
            './test/fixtures/secure-response.txt',
            'utf-8',
        )

        await wsClient.addInterceptor({ url: '/secure' }, '@secure', {
            content: htmlContent,
        })

        await LoginPage.open()

        await LoginPage.login('tomsmith', 'SuperSecretPassword!')

        await wsClient.waitForResponse('@secure')

        await expect(SecurePage.flashAlert).toBeExisting()
        await expect(SecurePage.flashAlert).toHaveText(
            expect.stringContaining('I Love Hedgehogs!'),
        )
    })
})
