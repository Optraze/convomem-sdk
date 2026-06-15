from __future__ import annotations

import asyncio
import random
from typing import Any, TypeVar, cast

import httpx
from pydantic import BaseModel

from convomem._errors import ConvoMemApiError, ConvoMemError, ConvoMemTimeoutError
from convomem._types import CaptureRequest, CaptureResponse

DEFAULT_BASE_URL = "https://api.convomem.com/api/v1"
T = TypeVar("T", bound=BaseModel)


class AsyncConvoMemClient:
    """Asynchronous ConvoMem API client.

    Example::

        import asyncio
        from convomem import AsyncConvoMemClient, CaptureRequest

        async def main():
            async with AsyncConvoMemClient(api_key="sk-org-abc123") as client:
                result = await client.capture(
                    CaptureRequest(message="Hello", email="a@b.com")
                )
                print(result.conversation_id)

        asyncio.run(main())
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
        max_retries: int = 0,
        retry_delay: float = 1.0,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._max_retries = max_retries
        self._retry_delay = retry_delay
        self._http = httpx.AsyncClient(
            base_url=self._base_url,
            headers={"X-API-Key": self._api_key},
            timeout=httpx.Timeout(timeout),
        )

        # Instantiate async resources
        from convomem.resources.conversations import AsyncConversationsResource
        from convomem.resources.customers import AsyncCustomersResource
        from convomem.resources.embed import AsyncEmbedResource
        from convomem.resources.entities import AsyncEntitiesResource
        from convomem.resources.insights import AsyncInsightsResource
        from convomem.resources.memories import AsyncMemoriesResource
        from convomem.resources.orgs import AsyncOrgsResource
        from convomem.resources.webhooks import AsyncWebhooksResource

        self.customers = AsyncCustomersResource(self)
        self.memories = AsyncMemoriesResource(self)
        self.conversations = AsyncConversationsResource(self)
        self.embed = AsyncEmbedResource(self)
        self.entities = AsyncEntitiesResource(self)
        self.orgs = AsyncOrgsResource(self)
        self.insights = AsyncInsightsResource(self)
        self.webhooks = AsyncWebhooksResource(self)

    async def capture(self, request: CaptureRequest) -> CaptureResponse:
        """Capture a message and auto-manage session."""
        result = await self._request(
            "POST",
            "/capture",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=CaptureResponse,
        )
        assert result is not None, "/capture should always return a response"
        return result

    async def _request(
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
                response = await self._http.request(method, path, params=params, json=body)

                if response.status_code >= 400:
                    # Retry on 5xx and 429
                    if (
                        response.status_code >= 500 or response.status_code == 429
                    ) and attempt < self._max_retries:
                        delay = random.random() * self._retry_delay * (attempt + 1)
                        await asyncio.sleep(delay)
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
                    await asyncio.sleep(delay)
                    continue
                raise last_error from exc
            except httpx.HTTPError as exc:
                raise ConvoMemError(f"HTTP error: {exc}") from exc

        raise last_error or ConvoMemError("Request failed after retries")

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._http.aclose()

    async def __aenter__(self) -> AsyncConvoMemClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()
