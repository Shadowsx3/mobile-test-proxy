import asyncio
import json
import websockets
from mitmproxy import http
from mitmproxy.tools.dump import DumpMaster
from mitmproxy.options import Options

interceptors = []


class RequestLogger:
    def __init__(self, websocket):
        self.websocket = websocket

    def response(self, flow: http.HTTPFlow) -> None:
        global interceptors
        to_remove = []

        for idx, intercept in enumerate(interceptors):
            if 'url' in intercept['match'] and intercept['match']['url'] in flow.request.url:
                if 'response' in intercept:
                    flow.response = http.Response.make(
                        intercept['response'].get('status', 200),
                        json.dumps(intercept['response'].get('body', {})),
                        intercept['response'].get('headers', {"Content-Type": "application/json"})
                    )
                asyncio.create_task(self.websocket.send(intercept['as']))

                if not intercept.get('persist', False):  # Remove if not persistent
                    to_remove.append(idx)

        # Remove non-persistent intercepts
        for idx in reversed(to_remove):
            interceptors.pop(idx)


async def websocket_handler(websocket):
    global interceptors

    async for message in websocket:
        data = json.loads(message)
        action = data.get('action')
        options = data.get('options', {})

        if action == 'intercept':
            interceptors.append(options)
            await websocket.send(json.dumps({'status': 'ok', 'action': 'intercept'}))
        elif action == 'remove_intercept':
            interceptors = [i for i in interceptors if i.get('id') != options.get('id')]
            await websocket.send(json.dumps({'status': 'ok', 'action': 'remove_intercept'}))
        elif action == 'clear_all':
            interceptors.clear()
            await websocket.send(json.dumps({'status': 'ok', 'action': 'clear_all'}))


async def start_proxy(websocket):
    options = Options(listen_host='0.0.0.0', listen_port=8080)
    master = DumpMaster(options)
    master.addons.add(RequestLogger(websocket))

    try:
        print("Starting mitmproxy...")
        await master.run()
    except KeyboardInterrupt:
        print("Stopping mitmproxy...")
        master.shutdown()


async def main():
    async with websockets.serve(websocket_handler, "localhost", 8765,ping_interval=30, ping_timeout=60) as websocket_server:
        print("WebSocket server started on ws://localhost:8765")
        await asyncio.gather(
            websocket_server.wait_closed(),
            start_proxy(websocket_server)
        )


if __name__ == '__main__':
    asyncio.run(main())
