from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import EmbedTokenResponse
from convomem.resources._base import _BaseResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import EmbedTokenRequest


class EmbedResource(_BaseResource):
    """Synchronous resource for managing embed tokens and handoff context."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def create_token(
        self,
        request: EmbedTokenRequest,
    ) -> Any:
        """Mint a short-lived embed token for the agent handoff panel."""
        return self._client._request(
            "POST",
            "/embed/tokens",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=EmbedTokenResponse,
        )

    def get_handoff(
        self,
        token: str,
    ) -> Any:
        """Fetch handoff context using an embed token (public endpoint)."""
        return self._client._request("GET", "/embed/handoff", params={"token": token})


class AsyncEmbedResource(_BaseResource):
    """Asynchronous resource for managing embed tokens and handoff context."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def create_token(
        self,
        request: EmbedTokenRequest,
    ) -> Any:
        """Mint a short-lived embed token for the agent handoff panel."""
        return await self._client._request(
            "POST",
            "/embed/tokens",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=EmbedTokenResponse,
        )

    async def get_handoff(
        self,
        token: str,
    ) -> Any:
        """Fetch handoff context using an embed token (public endpoint)."""
        return await self._client._request("GET", "/embed/handoff", params={"token": token})
