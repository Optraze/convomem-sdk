from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import (
    Complaint,
    ConversationListResponse,
    EntityGraphResponse,
    InsightListResponse,
    InsightsDashboard,
    PipelineStats,
)
from convomem.resources._base import _BaseResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import (
        InsightActionRequest,
    )


class InsightsResource(_BaseResource):
    """Synchronous resource for accessing analytics and insights."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def dashboard(self) -> Any:
        """Get the insights dashboard overview."""
        return self._client._request("GET", "/insights/dashboard", response_type=InsightsDashboard)

    def buying_signals(
        self,
        *,
        customer_id: str | None = None,
        limit: int | None = None,
    ) -> Any:
        """Get buying signals detected from customer conversations."""
        params: dict[str, str] = {}
        if customer_id is not None:
            params["customerId"] = customer_id
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request("GET", "/insights/buying-signals", params=params)

    def sentiment_time_series(
        self,
        *,
        customer_id: str | None = None,
        days: int | None = None,
    ) -> Any:
        """Get sentiment time series data."""
        params: dict[str, str] = {}
        if customer_id is not None:
            params["customerId"] = customer_id
        if days is not None:
            params["days"] = str(days)
        return self._client._request("GET", "/insights/sentiment", params=params)

    def complaints(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List customer complaints with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request("GET", "/insights/complaints", params=params)

    def get_complaint(
        self,
        complaint_id: str,
    ) -> Any:
        """Get a single complaint by its unique ID."""
        return self._client._request(
            "GET", f"/insights/complaints/{complaint_id}", response_type=Complaint
        )

    def frequent_issues(self) -> Any:
        """Get frequently occurring issues across all customers."""
        return self._client._request("GET", "/insights/frequent-issues")

    def memory_in_action(
        self,
        *,
        limit: int | None = None,
    ) -> Any:
        """Get examples of memories being actively used in conversations."""
        params: dict[str, str] = {}
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request("GET", "/insights/memory-in-action", params=params)

    def channel_breakdown(self) -> Any:
        """Get channel distribution breakdown."""
        return self._client._request("GET", "/insights/channels")

    def pipeline_stats(self) -> Any:
        """Get sales pipeline statistics."""
        return self._client._request(
            "GET", "/insights/pipeline-stats", response_type=PipelineStats
        )

    def entity_graph_stats(self) -> Any:
        """Get entity graph statistics."""
        return self._client._request("GET", "/insights/entity-graph/stats")

    def entity_graph(
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
            "GET", "/insights/entity-graph", params=params, response_type=EntityGraphResponse
        )

    def recent_conversations(
        self,
        *,
        limit: int | None = None,
    ) -> Any:
        """Get recent conversations across all customers."""
        params: dict[str, str] = {}
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request("GET", "/insights/recent-conversations", params=params)

    def list_conversations(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List conversations across all customers with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request(
            "GET", "/insights/conversations", params=params, response_type=ConversationListResponse
        )

    def list(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
        type: str | None = None,
    ) -> Any:
        """List insights with pagination and optional type filter."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if type is not None:
            params["type"] = type
        return self._client._request(
            "GET", "/insights", params=params, response_type=InsightListResponse
        )

    def action(
        self,
        insight_id: str,
        request: InsightActionRequest,
    ) -> None:
        """Take action on an insight."""
        self._client._request(
            "POST",
            f"/insights/{insight_id}/action",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )


class AsyncInsightsResource(_BaseResource):
    """Asynchronous resource for accessing analytics and insights."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def dashboard(self) -> Any:
        """Get the insights dashboard overview."""
        return await self._client._request(
            "GET", "/insights/dashboard", response_type=InsightsDashboard
        )

    async def buying_signals(
        self,
        *,
        customer_id: str | None = None,
        limit: int | None = None,
    ) -> Any:
        """Get buying signals detected from customer conversations."""
        params: dict[str, str] = {}
        if customer_id is not None:
            params["customerId"] = customer_id
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request("GET", "/insights/buying-signals", params=params)

    async def sentiment_time_series(
        self,
        *,
        customer_id: str | None = None,
        days: int | None = None,
    ) -> Any:
        """Get sentiment time series data."""
        params: dict[str, str] = {}
        if customer_id is not None:
            params["customerId"] = customer_id
        if days is not None:
            params["days"] = str(days)
        return await self._client._request("GET", "/insights/sentiment", params=params)

    async def complaints(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List customer complaints with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request("GET", "/insights/complaints", params=params)

    async def get_complaint(
        self,
        complaint_id: str,
    ) -> Any:
        """Get a single complaint by its unique ID."""
        return await self._client._request(
            "GET", f"/insights/complaints/{complaint_id}", response_type=Complaint
        )

    async def frequent_issues(self) -> Any:
        """Get frequently occurring issues across all customers."""
        return await self._client._request("GET", "/insights/frequent-issues")

    async def memory_in_action(
        self,
        *,
        limit: int | None = None,
    ) -> Any:
        """Get examples of memories being actively used in conversations."""
        params: dict[str, str] = {}
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request("GET", "/insights/memory-in-action", params=params)

    async def channel_breakdown(self) -> Any:
        """Get channel distribution breakdown."""
        return await self._client._request("GET", "/insights/channels")

    async def pipeline_stats(self) -> Any:
        """Get sales pipeline statistics."""
        return await self._client._request(
            "GET", "/insights/pipeline-stats", response_type=PipelineStats
        )

    async def entity_graph_stats(self) -> Any:
        """Get entity graph statistics."""
        return await self._client._request("GET", "/insights/entity-graph/stats")

    async def entity_graph(
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
            "GET", "/insights/entity-graph", params=params, response_type=EntityGraphResponse
        )

    async def recent_conversations(
        self,
        *,
        limit: int | None = None,
    ) -> Any:
        """Get recent conversations across all customers."""
        params: dict[str, str] = {}
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request("GET", "/insights/recent-conversations", params=params)

    async def list_conversations(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List conversations across all customers with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request(
            "GET", "/insights/conversations", params=params, response_type=ConversationListResponse
        )

    async def list(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
        type: str | None = None,
    ) -> Any:
        """List insights with pagination and optional type filter."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if type is not None:
            params["type"] = type
        return await self._client._request(
            "GET", "/insights", params=params, response_type=InsightListResponse
        )

    async def action(
        self,
        insight_id: str,
        request: InsightActionRequest,
    ) -> None:
        """Take action on an insight."""
        await self._client._request(
            "POST",
            f"/insights/{insight_id}/action",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )
