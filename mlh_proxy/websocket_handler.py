import json
from websockets.exceptions import ConnectionClosed
from interceptors import InterceptorManager


async def websocket_handler(websocket, path, websocket_clients):
    websocket_clients.add(websocket)

    try:
        async for message in websocket:
            data = json.loads(message)
            action = data.get('action')
            options = data.get('options', {})

            if action == 'intercept':
                InterceptorManager.add_interceptor(options)
            elif action == 'remove_intercept':
                InterceptorManager.remove_interceptor(options.get('id'))
            elif action == 'clear_all':
                InterceptorManager.clear_all()

            await websocket.send(json.dumps({"status": "ack"}))

    except ConnectionClosed:
        websocket_clients.remove(websocket)
        print("WebSocket connection closed.")
