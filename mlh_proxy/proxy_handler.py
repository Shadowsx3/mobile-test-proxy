import asyncio
from mitmproxy import http
from mitmproxy.options import Options
from mitmproxy.tools.dump import DumpMaster
from interceptors import InterceptorManager


class RequestLogger:
    def __init__(self, websocket_clients, debug=False):
        self.websocket_clients = websocket_clients
        self.debug = debug  # Added debug flag

    def request(self, flow: http.HTTPFlow) -> None:
        request_data = {
            "type": "request",
            "method": flow.request.method,
            "url": flow.request.url,
            "headers": dict(flow.request.headers),
            "content": flow.request.content.decode('utf-8', errors='ignore') if flow.request.content else ""
        }
        if self.debug:  # Print only if debug is True
            print(f"Request: {request_data}")

    def response(self, flow: http.HTTPFlow) -> None:
        if InterceptorManager.apply_intercept(flow, self.broadcast):
            if self.debug:
                print("Mocked response applied.")

        response_data = {
            "type": "response",
            "status_code": flow.response.status_code,
            "url": flow.request.url,
            "headers": dict(flow.response.headers),
            "content": flow.response.content.decode('utf-8', errors='ignore') if flow.response.content else ""
        }

        if self.debug:
            print(f"Response: {response_data}")

    async def broadcast(self, data):
        if self.websocket_clients:
            await asyncio.gather(*(client.send(data) for client in self.websocket_clients if client.open))


async def start_proxy(websocket_clients, debug=False):
    options = Options(listen_host='0.0.0.0', listen_port=8080, ignore_hosts=[".*google.*"])
    master = DumpMaster(options)
    master.addons.add(RequestLogger(websocket_clients, debug=debug))  # Pass debug flag to RequestLogger

    try:
        if debug:
            print("Starting mitmproxy in debug mode...")
        else:
            print("Starting mitmproxy...")
        await master.run()
    except KeyboardInterrupt:
        print("Stopping mitmproxy...")
        master.shutdown()
