from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import (
    FeedbackLookupResponse,
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
        FeedbackLookupRequest,
        MemoryAddRequest,
        MemoryIngestRequest,
        MemoryUpdateRequest,
    )


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
    ) -> Any:
        """Look up relevant memories for a topic by customer ID."""
        return self._client._request(
            "GET",
            f"/customers/{customer_id}/memories/lookup",
            params={"topic": topic},
            response_type=MemoryContext,
        )

    def lookup_by_identity(
        self,
        params: MemoryLookupParams,
    ) -> MemoryContext | None:
        """Look up relevant memories by customer identity (no UUID required)."""
        query: dict[str, str] = {"topic": params.topic}
        if params.phone is not None:
            query["phone"] = params.phone
        if params.email is not None:
            query["email"] = params.email
        if params.external_id is not None:
            query["externalId"] = params.external_id
        return self._client._request(
            "GET", "/customers/memories/lookup", params=query, response_type=MemoryContext
        )

    def list(
        self,
        customer_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List all memories for a customer with pagination."""
        query: dict[str, str] = {}
        if page is not None:
            query["page"] = str(page)
        if limit is not None:
            query["limit"] = str(limit)
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

    def lookup_feedback(
        self,
        request: FeedbackLookupRequest,
    ) -> Any:
        """Look up feedback-associated memories."""
        return self._client._request(
            "POST",
            "/memories/lookup-feedback",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=FeedbackLookupResponse,
        )


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
    ) -> Any:
        """Look up relevant memories for a topic by customer ID."""
        return await self._client._request(
            "GET",
            f"/customers/{customer_id}/memories/lookup",
            params={"topic": topic},
            response_type=MemoryContext,
        )

    async def lookup_by_identity(
        self,
        params: dict[str, str],
    ) -> Any:
        """Look up relevant memories by customer identity (no UUID required)."""
        return await self._client._request(
            "GET", "/customers/memories/lookup", params=params, response_type=MemoryContext
        )

    async def list(
        self,
        customer_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List all memories for a customer with pagination."""
        query: dict[str, str] = {}
        if page is not None:
            query["page"] = str(page)
        if limit is not None:
            query["limit"] = str(limit)
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

    async def lookup_feedback(
        self,
        request: FeedbackLookupRequest,
    ) -> Any:
        """Look up feedback-associated memories."""
        return await self._client._request(
            "POST",
            "/memories/lookup-feedback",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=FeedbackLookupResponse,
        )
