# convomem

Python SDK for the ConvoMem conversational memory API.

## Installation

```bash
pip install convomem
```

## Usage

```python
from convomem import ConvoMemClient, CaptureRequest

client = ConvoMemClient(api_key="sk-org-abc123")
result = client.capture(CaptureRequest(message="Hello", email="a@b.com"))
print(result.conversation_id)
```
