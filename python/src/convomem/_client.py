from __future__ import annotations

import random
import time
from typing import Any, TypeVar, cast

import httpx
from pydantic import BaseModel

from convomem._errors import ConvoMemApiError, ConvoMemError, ConvoMemTimeoutError
from convomem._types import CaptureRequest, CaptureResponse

DEFAULT_BASE_URL = "https://api.convomem.com/api/v1"
T = TypeVar("T", bound=BaseModel)


class ConvoMemClient:
    """Synchronous ConvoMem API client.

    Example::

        from convomem import ConvoMemClient, CaptureRequest

        client = ConvoMemClient(api_key="sk-org-abc123")
        result = client.capture(CaptureRequest(message="Hello", email="a@b.com"))
        print(result.conversation_id)
    """

    def __init__(
        self,
        api_key: str,
        *,
        timeout: float = 30.0,
        max_retries: int = 0,
        retry_delay: float = 1.0,
    ) -> None:
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_delay = retry_delay
        self._http = httpx.Client(
            base_url=DEFAULT_BASE_URL,
            headers={"X-API-Key": self._api_key},
            timeout=httpx.Timeout(timeout),
        )

        # Instantiate integration-scope resources
        from convomem.resources.conversations import ConversationsResource
        from convomem.resources.customers import CustomersResource
        from convomem.resources.embed import EmbedResource
        from convomem.resources.memories import MemoriesResource

        self.customers = CustomersResource(self)
        self.memories = MemoriesResource(self)
        self.conversations = ConversationsResource(self)
        self.embed = EmbedResource(self)

    def capture(self, request: CaptureRequest) -> CaptureResponse:
        """Capture a message and auto-manage session."""
        result = self._request(
            "POST",
            "/capture",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=CaptureResponse,
        )
        assert result is not None, "/capture should always return a response"
        return result

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        body: dict[str, Any] | None = None,
        response_type: type[T] | None = None,
    ) -> T | None:
        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                response = self._http.request(method, path, params=params, json=body)

                if response.status_code >= 400:
                    # Retry on 5xx and 429
                    if (
                        response.status_code >= 500 or response.status_code == 429
                    ) and attempt < self._max_retries:
                        delay = random.random() * self._retry_delay * (attempt + 1)
                        time.sleep(delay)
                        continue

                    # Parse error body
                    try:
                        error_body = response.json()
                    except Exception:
                        error_body = response.text

                    raise ConvoMemApiError(
                        status=response.status_code,
                        message=f"ConvoMem API error {response.status_code}: {response.text}",
                        url=str(response.url),
                        body=error_body,
                    )

                # Parse successful response
                if response.status_code == 204 or not response.content:
                    return None
                data = response.json()
                if response_type is not None:
                    return response_type.model_validate(data)
                return cast("T", data)

            except httpx.TimeoutException as exc:
                last_error = ConvoMemTimeoutError(
                    f"Request timed out after {self._timeout}s",
                    timeout=self._timeout,
                )
                if attempt < self._max_retries:
                    delay = random.random() * self._retry_delay * (attempt + 1)
                    time.sleep(delay)
                    continue
                raise last_error from exc
            except httpx.HTTPError as exc:
                raise ConvoMemError(f"HTTP error: {exc}") from exc

        raise last_error or ConvoMemError("Request failed after retries")

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> ConvoMemClient:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()
