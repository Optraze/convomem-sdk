from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import Webhook
from convomem.resources._base import _BaseResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import WebhookCreateRequest, WebhookUpdateRequest


class WebhooksResource(_BaseResource):
    """Synchronous resource for managing webhook subscriptions."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def create(
        self,
        org_id: str,
        request: WebhookCreateRequest,
    ) -> Any:
        """Create a new webhook subscription for an organization."""
        return self._client._request(
            "POST",
            f"/orgs/{org_id}/webhooks",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Webhook,
        )

    def list(
        self,
        org_id: str,
    ) -> Any:
        """List all webhook subscriptions for an organization."""
        return self._client._request("GET", f"/orgs/{org_id}/webhooks")

    def update(
        self,
        org_id: str,
        webhook_id: str,
        request: WebhookUpdateRequest,
    ) -> Any:
        """Update an existing webhook subscription."""
        return self._client._request(
            "PATCH",
            f"/orgs/{org_id}/webhooks/{webhook_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Webhook,
        )

    def delete(
        self,
        org_id: str,
        webhook_id: str,
    ) -> None:
        """Delete a webhook subscription permanently."""
        self._client._request("DELETE", f"/orgs/{org_id}/webhooks/{webhook_id}")


class AsyncWebhooksResource(_BaseResource):
    """Asynchronous resource for managing webhook subscriptions."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def create(
        self,
        org_id: str,
        request: WebhookCreateRequest,
    ) -> Any:
        """Create a new webhook subscription for an organization."""
        return await self._client._request(
            "POST",
            f"/orgs/{org_id}/webhooks",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Webhook,
        )

    async def list(
        self,
        org_id: str,
    ) -> Any:
        """List all webhook subscriptions for an organization."""
        return await self._client._request("GET", f"/orgs/{org_id}/webhooks")

    async def update(
        self,
        org_id: str,
        webhook_id: str,
        request: WebhookUpdateRequest,
    ) -> Any:
        """Update an existing webhook subscription."""
        return await self._client._request(
            "PATCH",
            f"/orgs/{org_id}/webhooks/{webhook_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Webhook,
        )

    async def delete(
        self,
        org_id: str,
        webhook_id: str,
    ) -> None:
        """Delete a webhook subscription permanently."""
        await self._client._request("DELETE", f"/orgs/{org_id}/webhooks/{webhook_id}")
