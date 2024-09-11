import asyncio

from mitmproxy import http


class InterceptorManager:
    interceptors = []

    @classmethod
    def add_interceptor(cls, options):
        cls.interceptors.append(options)
        print(f"Added interceptor: {options}")

    @classmethod
    def remove_interceptor(cls, intercept_id):
        cls.interceptors = [i for i in cls.interceptors if i.get('id') != intercept_id]
        print(f"Removed interceptor with id: {intercept_id}")

    @classmethod
    def clear_all(cls):
        cls.interceptors.clear()
        print("Cleared all interceptors.")

    @classmethod
    def apply_intercept(cls, flow: http.HTTPFlow, broadcast):
        to_remove = []
        for idx, intercept in enumerate(cls.interceptors):
            if 'url' in intercept['match'] and intercept['match']['url'] in flow.request.url:
                if 'response' in intercept:
                    flow.response = cls._mock_response(intercept['response'], flow.response)
                if not intercept.get('persist', False):
                    to_remove.append(idx)
                asyncio.create_task(broadcast(intercept['as']))

        for idx in reversed(to_remove):
            cls.interceptors.pop(idx)
        return bool(to_remove)

    @staticmethod
    def _mock_response(mock_data, response: http.Response):
        return http.Response.make(
            mock_data.get('status_code', response.status_code),
            mock_data.get('content', response.content),
            mock_data.get('headers', response.headers)
        )
