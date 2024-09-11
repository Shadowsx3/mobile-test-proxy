# Proxy Mock Server

This tool allows you to mock and intercept HTTP requests in real-time via WebSocket. You can create custom interceptors, mock responses, and wait for specific requests. Ideal for mobile automation testing.

## Features
- Intercept and mock HTTP requests based on URL, headers, etc.
- Broadcast intercepted requests and responses to WebSocket clients.
- Dynamic interceptors (add, remove, and clear) via WebSocket.

## Setup

### Requirements
- Python 3.7+
- Install dependencies with:
  ```bash
  pip install -r requirements.txt

### Running the Server
```bash
python server.py
```

WebSocket server runs on ws://localhost:8765  
Proxy listens on http://0.0.0.0:8080

## WebSocket API

### Add Interceptor
```json
{
  "action": "intercept",
  "options": {
    "id": "123",
    "match": { "url": "example.com/api" },
    "response": {
      "status_code": 200,
      "content": {"key": "value"},
      "headers": {"Content-Type": "application/json"}
    },
    "persist": false
  }
}
```

### Remove Interceptor
```json
{
  "action": "remove_intercept",
  "options": {
    "id": "123"
  }
}
```
          
### Clear All Interceptors
```json
{
  "action": "clear_all"
}
```