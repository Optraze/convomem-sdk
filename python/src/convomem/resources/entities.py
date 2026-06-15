from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import Entity, EntityGraphResponse, EntityListResponse
from convomem.resources._base import _BaseResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import EntitySearchParams


class EntitiesResource(_BaseResource):
    """Synchronous resource for managing knowledge graph entities."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def list(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
        type: str | None = None,
    ) -> Any:
        """List entities with pagination and optional type filter."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if type is not None:
            params["type"] = type
        return self._client._request(
            "GET", "/entities", params=params, response_type=EntityListResponse
        )

    def get(
        self,
        entity_id: str,
    ) -> Any:
        """Get a single entity by its unique ID."""
        return self._client._request("GET", f"/entities/{entity_id}", response_type=Entity)

    def search(
        self,
        params: EntitySearchParams,
    ) -> Any:
        """Search entities by query text with optional type filter."""
        query: dict[str, str] = {"query": params.query}
        if params.type is not None:
            query["type"] = params.type
        if params.limit is not None:
            query["limit"] = str(params.limit)
        return self._client._request(
            "GET", "/entities/search", params=query, response_type=EntityListResponse
        )

    def get_graph(
        self,
        *,
        entity_id: str | None = None,
        depth: int | None = None,
    ) -> Any:
        """Get the entity relationship graph."""
        params: dict[str, str] = {}
        if entity_id is not None:
            params["entityId"] = entity_id
        if depth is not None:
            params["depth"] = str(depth)
        return self._client._request(
            "GET", "/entities/graph", params=params, response_type=EntityGraphResponse
        )

    def delete(
        self,
        entity_id: str,
    ) -> None:
        """Delete an entity permanently."""
        self._client._request("DELETE", f"/entities/{entity_id}")


class AsyncEntitiesResource(_BaseResource):
    """Asynchronous resource for managing knowledge graph entities."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def list(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
        type: str | None = None,
    ) -> Any:
        """List entities with pagination and optional type filter."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if type is not None:
            params["type"] = type
        return await self._client._request(
            "GET", "/entities", params=params, response_type=EntityListResponse
        )

    async def get(
        self,
        entity_id: str,
    ) -> Any:
        """Get a single entity by its unique ID."""
        return await self._client._request("GET", f"/entities/{entity_id}", response_type=Entity)

    async def search(
        self,
        params: EntitySearchParams,
    ) -> Any:
        """Search entities by query text with optional type filter."""
        query: dict[str, str] = {"query": params.query}
        if params.type is not None:
            query["type"] = params.type
        if params.limit is not None:
            query["limit"] = str(params.limit)
        return await self._client._request(
            "GET", "/entities/search", params=query, response_type=EntityListResponse
        )

    async def get_graph(
        self,
        *,
        entity_id: str | None = None,
        depth: int | None = None,
    ) -> Any:
        """Get the entity relationship graph."""
        params: dict[str, str] = {}
        if entity_id is not None:
            params["entityId"] = entity_id
        if depth is not None:
            params["depth"] = str(depth)
        return await self._client._request(
            "GET", "/entities/graph", params=params, response_type=EntityGraphResponse
        )

    async def delete(
        self,
        entity_id: str,
    ) -> None:
        """Delete an entity permanently."""
        await self._client._request("DELETE", f"/entities/{entity_id}")
