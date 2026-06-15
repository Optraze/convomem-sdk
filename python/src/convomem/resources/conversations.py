from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import Conversation, ConversationListResponse
from convomem.resources._base import _BaseResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import (
        ConversationEndRequest,
        ConversationEscalateRequest,
    )


class ConversationsResource(_BaseResource):
    """Synchronous resource for managing customer conversations."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def start(
        self,
        customer_id: str,
        channel: str,
    ) -> Any:
        """Start a new conversation for a customer."""
        return self._client._request(
            "POST",
            f"/customers/{customer_id}/conversations",
            body={"channel": channel},
            response_type=Conversation,
        )

    def list(
        self,
        customer_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List conversations for a customer with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request(
            "GET",
            f"/customers/{customer_id}/conversations",
            params=params,
            response_type=ConversationListResponse,
        )

    def end(
        self,
        customer_id: str,
        conv_id: str,
        *,
        outcome: str | None = None,
    ) -> Any:
        """End a conversation by path parameters."""
        body: dict[str, str] = {}
        if outcome is not None:
            body["outcome"] = outcome
        return self._client._request(
            "PATCH",
            f"/customers/{customer_id}/conversations/{conv_id}",
            body=body if body else None,
            response_type=Conversation,
        )

    def end_flat(
        self,
        request: ConversationEndRequest,
    ) -> None:
        """End a conversation using flat body parameters."""
        self._client._request(
            "POST",
            "/customers/conversations/end",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )

    def escalate(
        self,
        customer_id: str,
        conv_id: str,
        *,
        reason: str | None = None,
    ) -> Any:
        """Escalate a conversation by path parameters."""
        body: dict[str, str] = {}
        if reason is not None:
            body["reason"] = reason
        return self._client._request(
            "PATCH",
            f"/customers/{customer_id}/conversations/{conv_id}/escalate",
            body=body if body else None,
            response_type=Conversation,
        )

    def escalate_flat(
        self,
        request: ConversationEscalateRequest,
    ) -> None:
        """Escalate a conversation using flat body parameters."""
        self._client._request(
            "POST",
            "/customers/conversations/escalate",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )


class AsyncConversationsResource(_BaseResource):
    """Asynchronous resource for managing customer conversations."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def start(
        self,
        customer_id: str,
        channel: str,
    ) -> Any:
        """Start a new conversation for a customer."""
        return await self._client._request(
            "POST",
            f"/customers/{customer_id}/conversations",
            body={"channel": channel},
            response_type=Conversation,
        )

    async def list(
        self,
        customer_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List conversations for a customer with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request(
            "GET",
            f"/customers/{customer_id}/conversations",
            params=params,
            response_type=ConversationListResponse,
        )

    async def end(
        self,
        customer_id: str,
        conv_id: str,
        *,
        outcome: str | None = None,
    ) -> Any:
        """End a conversation by path parameters."""
        body: dict[str, str] = {}
        if outcome is not None:
            body["outcome"] = outcome
        return await self._client._request(
            "PATCH",
            f"/customers/{customer_id}/conversations/{conv_id}",
            body=body if body else None,
            response_type=Conversation,
        )

    async def end_flat(
        self,
        request: ConversationEndRequest,
    ) -> None:
        """End a conversation using flat body parameters."""
        await self._client._request(
            "POST",
            "/customers/conversations/end",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )

    async def escalate(
        self,
        customer_id: str,
        conv_id: str,
        *,
        reason: str | None = None,
    ) -> Any:
        """Escalate a conversation by path parameters."""
        body: dict[str, str] = {}
        if reason is not None:
            body["reason"] = reason
        return await self._client._request(
            "PATCH",
            f"/customers/{customer_id}/conversations/{conv_id}/escalate",
            body=body if body else None,
            response_type=Conversation,
        )

    async def escalate_flat(
        self,
        request: ConversationEscalateRequest,
    ) -> None:
        """Escalate a conversation using flat body parameters."""
        await self._client._request(
            "POST",
            "/customers/conversations/escalate",
            body=request.model_dump(by_alias=True, exclude_none=True),
        )
