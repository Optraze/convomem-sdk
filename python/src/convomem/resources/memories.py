from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import (
    Memory,
    MemoryContext,
    MemoryIngestResponse,
    MemoryListResponse,
    MemoryLookupParams,
)
from convomem.resources._base import _BaseResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import (
        MemoryAddRequest,
        MemoryIngestRequest,
        MemoryUpdateRequest,
    )


def _lookup_query(params: MemoryLookupParams) -> dict[str, str]:
    data = params.model_dump(by_alias=True, exclude_none=True)
    return {
        key: str(value).lower() if isinstance(value, bool) else str(value)
        for key, value in data.items()
    }


class MemoriesResource(_BaseResource):
    """Synchronous resource for managing customer memories."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def ingest(
        self,
        customer_id: str,
        request: MemoryIngestRequest,
    ) -> Any:
        """Ingest a completed conversation for asynchronous memory extraction."""
        return self._client._request(
            "POST",
            f"/customers/{customer_id}/memories/ingest",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=MemoryIngestResponse,
        )

    def lookup(
        self,
        customer_id: str,
        topic: str,
        **options: Any,
    ) -> Any:
        """Look up relevant memories for a topic by customer ID."""
        return self._client._request(
            "GET",
            f"/customers/{customer_id}/memories/lookup",
            params=_lookup_query(MemoryLookupParams(topic=topic, **options)),
            response_type=MemoryContext,
        )

    def lookup_by_identity(
        self,
        params: MemoryLookupParams,
    ) -> MemoryContext | None:
        """Look up relevant memories by customer identity (no UUID required)."""
        query = _lookup_query(params)
        return self._client._request(
            "GET", "/customers/memories/lookup", params=query, response_type=MemoryContext
        )

    def list(
        self,
        customer_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
        include_expired: bool | None = None,
        as_of: str | None = None,
    ) -> Any:
        """List all memories for a customer with pagination."""
        query: dict[str, str] = {}
        if page is not None:
            query["page"] = str(page)
        if limit is not None:
            query["limit"] = str(limit)
        if include_expired is not None:
            query["includeExpired"] = str(include_expired).lower()
        if as_of is not None:
            query["asOf"] = as_of
        return self._client._request(
            "GET",
            f"/customers/{customer_id}/memories",
            params=query,
            response_type=MemoryListResponse,
        )

    def add(
        self,
        customer_id: str,
        request: MemoryAddRequest,
    ) -> Any:
        """Manually add a memory for a customer."""
        return self._client._request(
            "POST",
            f"/customers/{customer_id}/memories",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Memory,
        )

    def get(
        self,
        customer_id: str,
        mem_id: str,
    ) -> Any:
        """Get a specific memory by ID."""
        return self._client._request(
            "GET", f"/customers/{customer_id}/memories/{mem_id}", response_type=Memory
        )

    def update(
        self,
        customer_id: str,
        mem_id: str,
        request: MemoryUpdateRequest,
    ) -> None:
        """Update an existing customer memory."""
        self._client._request(
            "PATCH",
            f"/customers/{customer_id}/memories/{mem_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )

    def delete(
        self,
        customer_id: str,
        mem_id: str,
    ) -> None:
        """Delete a customer memory permanently."""
        self._client._request("DELETE", f"/customers/{customer_id}/memories/{mem_id}")


class AsyncMemoriesResource(_BaseResource):
    """Asynchronous resource for managing customer memories."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def ingest(
        self,
        customer_id: str,
        request: MemoryIngestRequest,
    ) -> Any:
        """Ingest a completed conversation for asynchronous memory extraction."""
        return await self._client._request(
            "POST",
            f"/customers/{customer_id}/memories/ingest",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=MemoryIngestResponse,
        )

    async def lookup(
        self,
        customer_id: str,
        topic: str,
        **options: Any,
    ) -> Any:
        """Look up relevant memories for a topic by customer ID."""
        return await self._client._request(
            "GET",
            f"/customers/{customer_id}/memories/lookup",
            params=_lookup_query(MemoryLookupParams(topic=topic, **options)),
            response_type=MemoryContext,
        )

    async def lookup_by_identity(
        self,
        params: MemoryLookupParams,
    ) -> Any:
        """Look up relevant memories by customer identity (no UUID required)."""
        return await self._client._request(
            "GET",
            "/customers/memories/lookup",
            params=_lookup_query(params),
            response_type=MemoryContext,
        )

    async def list(
        self,
        customer_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
        include_expired: bool | None = None,
        as_of: str | None = None,
    ) -> Any:
        """List all memories for a customer with pagination."""
        query: dict[str, str] = {}
        if page is not None:
            query["page"] = str(page)
        if limit is not None:
            query["limit"] = str(limit)
        if include_expired is not None:
            query["includeExpired"] = str(include_expired).lower()
        if as_of is not None:
            query["asOf"] = as_of
        return await self._client._request(
            "GET",
            f"/customers/{customer_id}/memories",
            params=query,
            response_type=MemoryListResponse,
        )

    async def add(
        self,
        customer_id: str,
        request: MemoryAddRequest,
    ) -> Any:
        """Manually add a memory for a customer."""
        return await self._client._request(
            "POST",
            f"/customers/{customer_id}/memories",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Memory,
        )

    async def get(
        self,
        customer_id: str,
        mem_id: str,
    ) -> Any:
        """Get a specific memory by ID."""
        return await self._client._request(
            "GET", f"/customers/{customer_id}/memories/{mem_id}", response_type=Memory
        )

    async def update(
        self,
        customer_id: str,
        mem_id: str,
        request: MemoryUpdateRequest,
    ) -> None:
        """Update an existing customer memory."""
        await self._client._request(
            "PATCH",
            f"/customers/{customer_id}/memories/{mem_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )

    async def delete(
        self,
        customer_id: str,
        mem_id: str,
    ) -> None:
        """Delete a customer memory permanently."""
        await self._client._request("DELETE", f"/customers/{customer_id}/memories/{mem_id}")
