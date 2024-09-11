import asyncio
from websockets import serve
from proxy_handler import start_proxy
from websocket_handler import websocket_handler


async def main():
    websocket_clients = set()

    async with serve(lambda ws, path: websocket_handler(ws, path, websocket_clients), '0.0.0.0', 8765, ping_interval=30,
                     ping_timeout=60):
        print("WebSocket server started on ws://localhost:8765")
        await asyncio.gather(
            start_proxy(websocket_clients, True),
        )


if __name__ == '__main__':
    asyncio.run(main())
