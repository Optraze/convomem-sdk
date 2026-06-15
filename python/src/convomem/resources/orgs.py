from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import Org, OrgApiKey, OrgMember
from convomem.resources._base import _BaseResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import (
        OrgApiKeyCreateRequest,
        OrgCreateRequest,
        OrgMemberAddRequest,
        OrgMemberUpdateRequest,
        OrgUpdateRequest,
    )


class OrgsResource(_BaseResource):
    """Synchronous resource for managing organizations, members, API keys, and audit logs."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def create(
        self,
        request: OrgCreateRequest,
    ) -> Any:
        """Create a new organization."""
        return self._client._request(
            "POST",
            "/orgs",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Org,
        )

    def get(
        self,
        org_id: str,
    ) -> Any:
        """Get an organization by its unique ID."""
        return self._client._request("GET", f"/orgs/{org_id}", response_type=Org)

    def update(
        self,
        org_id: str,
        request: OrgUpdateRequest,
    ) -> Any:
        """Update an existing organization."""
        return self._client._request(
            "PATCH",
            f"/orgs/{org_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Org,
        )

    def add_member(
        self,
        org_id: str,
        request: OrgMemberAddRequest,
    ) -> Any:
        """Add a member to an organization."""
        return self._client._request(
            "POST",
            f"/orgs/{org_id}/members",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=OrgMember,
        )

    def get_member(
        self,
        org_id: str,
        uid: str,
    ) -> Any:
        """Get a member of an organization by user ID."""
        return self._client._request(
            "GET", f"/orgs/{org_id}/members/{uid}", response_type=OrgMember
        )

    def update_member(
        self,
        org_id: str,
        uid: str,
        request: OrgMemberUpdateRequest,
    ) -> Any:
        """Update a member's role in an organization."""
        return self._client._request(
            "PATCH",
            f"/orgs/{org_id}/members/{uid}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=OrgMember,
        )

    def remove_member(
        self,
        org_id: str,
        uid: str,
    ) -> None:
        """Remove a member from an organization."""
        self._client._request("DELETE", f"/orgs/{org_id}/members/{uid}")

    def create_api_key(
        self,
        org_id: str,
        request: OrgApiKeyCreateRequest | None = None,
    ) -> Any:
        """Create a new API key for an organization."""
        body = (
            request.model_dump(by_alias=True, exclude_none=True) if request is not None else None
        )
        return self._client._request(
            "POST", f"/orgs/{org_id}/api-keys", body=body, response_type=OrgApiKey
        )

    def list_api_keys(
        self,
        org_id: str,
    ) -> Any:
        """List all API keys for an organization."""
        return self._client._request("GET", f"/orgs/{org_id}/api-keys")

    def delete_api_key(
        self,
        org_id: str,
        key_id: str,
    ) -> None:
        """Delete an API key from an organization."""
        self._client._request("DELETE", f"/orgs/{org_id}/api-keys/{key_id}")

    def get_audit_logs(
        self,
        org_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """Get audit logs for an organization with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request("GET", f"/orgs/{org_id}/audit-logs", params=params)


class AsyncOrgsResource(_BaseResource):
    """Asynchronous resource for managing organizations, members, API keys, and audit logs."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def create(
        self,
        request: OrgCreateRequest,
    ) -> Any:
        """Create a new organization."""
        return await self._client._request(
            "POST",
            "/orgs",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Org,
        )

    async def get(
        self,
        org_id: str,
    ) -> Any:
        """Get an organization by its unique ID."""
        return await self._client._request("GET", f"/orgs/{org_id}", response_type=Org)

    async def update(
        self,
        org_id: str,
        request: OrgUpdateRequest,
    ) -> Any:
        """Update an existing organization."""
        return await self._client._request(
            "PATCH",
            f"/orgs/{org_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Org,
        )

    async def add_member(
        self,
        org_id: str,
        request: OrgMemberAddRequest,
    ) -> Any:
        """Add a member to an organization."""
        return await self._client._request(
            "POST",
            f"/orgs/{org_id}/members",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=OrgMember,
        )

    async def get_member(
        self,
        org_id: str,
        uid: str,
    ) -> Any:
        """Get a member of an organization by user ID."""
        return await self._client._request(
            "GET", f"/orgs/{org_id}/members/{uid}", response_type=OrgMember
        )

    async def update_member(
        self,
        org_id: str,
        uid: str,
        request: OrgMemberUpdateRequest,
    ) -> Any:
        """Update a member's role in an organization."""
        return await self._client._request(
            "PATCH",
            f"/orgs/{org_id}/members/{uid}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=OrgMember,
        )

    async def remove_member(
        self,
        org_id: str,
        uid: str,
    ) -> None:
        """Remove a member from an organization."""
        await self._client._request("DELETE", f"/orgs/{org_id}/members/{uid}")

    async def create_api_key(
        self,
        org_id: str,
        request: OrgApiKeyCreateRequest | None = None,
    ) -> Any:
        """Create a new API key for an organization."""
        body = (
            request.model_dump(by_alias=True, exclude_none=True) if request is not None else None
        )
        return await self._client._request(
            "POST", f"/orgs/{org_id}/api-keys", body=body, response_type=OrgApiKey
        )

    async def list_api_keys(
        self,
        org_id: str,
    ) -> Any:
        """List all API keys for an organization."""
        return await self._client._request("GET", f"/orgs/{org_id}/api-keys")

    async def delete_api_key(
        self,
        org_id: str,
        key_id: str,
    ) -> None:
        """Delete an API key from an organization."""
        await self._client._request("DELETE", f"/orgs/{org_id}/api-keys/{key_id}")

    async def get_audit_logs(
        self,
        org_id: str,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """Get audit logs for an organization with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request("GET", f"/orgs/{org_id}/audit-logs", params=params)
