from __future__ import annotations

from typing import TYPE_CHECKING, Any

from convomem._types import Customer, CustomerListResponse, CustomerLookupResponse, HandoffResponse
from convomem.resources._base import _BaseCustomersResource

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient
    from convomem._types import (
        CustomerCreateRequest,
        CustomerLookupParams,
        CustomerUpdateRequest,
        HandoffParams,
    )


class CustomersResource(_BaseCustomersResource):
    """Synchronous resource for managing customer records and handoff context."""

    def __init__(self, client: ConvoMemClient) -> None:
        self._client = client

    def lookup(
        self,
        params: CustomerLookupParams,
    ) -> Any:
        """Lookup a customer by identifier with optional semantic memory retrieval."""
        query = self._lookup_params(
            customer_id=params.customer_id,
            phone=params.phone,
            email=params.email,
            external_id=params.external_id,
            topic=params.topic,
            auto_create=params.auto_create,
            user_name=params.user_name,
        )
        return self._client._request(
            "GET", "/customers/lookup", params=query, response_type=CustomerLookupResponse
        )

    def create(
        self,
        request: CustomerCreateRequest,
    ) -> Any:
        """Create a new customer record."""
        return self._client._request(
            "POST",
            "/customers",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Customer,
        )

    def list(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List customers with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return self._client._request(
            "GET", "/customers", params=params, response_type=CustomerListResponse
        )

    def get(
        self,
        customer_id: str,
    ) -> Any:
        """Get a single customer by their unique ID."""
        return self._client._request("GET", f"/customers/{customer_id}", response_type=Customer)

    def update(
        self,
        customer_id: str,
        request: CustomerUpdateRequest,
    ) -> Any:
        """Update an existing customer record."""
        return self._client._request(
            "PATCH",
            f"/customers/{customer_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Customer,
        )

    def delete(
        self,
        customer_id: str,
    ) -> None:
        """Permanently delete a customer and all associated data."""
        self._client._request("DELETE", f"/customers/{customer_id}")

    def handoff(
        self,
        params: HandoffParams,
    ) -> Any:
        """Generate a cross-channel agent handoff briefing."""
        query: dict[str, str] = {}
        if params.customer_id is not None:
            query["customerId"] = params.customer_id
        if params.phone is not None:
            query["phone"] = params.phone
        if params.email is not None:
            query["email"] = params.email
        if params.external_id is not None:
            query["externalId"] = params.external_id
        if params.narrative is not None:
            query["narrative"] = params.narrative
        if params.fresh is not None:
            query["fresh"] = params.fresh
        return self._client._request(
            "GET", "/customers/handoff", params=query, response_type=HandoffResponse
        )

    def handoff_by_id(
        self,
        customer_id: str,
        *,
        narrative: str | None = None,
        fresh: str | None = None,
    ) -> Any:
        """Generate a cross-channel agent handoff briefing by customer ID."""
        params: dict[str, str] = {}
        if narrative is not None:
            params["narrative"] = narrative
        if fresh is not None:
            params["fresh"] = fresh
        return self._client._request(
            "GET",
            f"/customers/{customer_id}/handoff",
            params=params,
            response_type=HandoffResponse,
        )


class AsyncCustomersResource(_BaseCustomersResource):
    """Asynchronous resource for managing customer records and handoff context."""

    def __init__(self, client: AsyncConvoMemClient) -> None:
        self._client = client

    async def lookup(
        self,
        params: CustomerLookupParams,
    ) -> Any:
        """Lookup a customer by identifier with optional semantic memory retrieval."""
        query = self._lookup_params(
            customer_id=params.customer_id,
            phone=params.phone,
            email=params.email,
            external_id=params.external_id,
            topic=params.topic,
            auto_create=params.auto_create,
            user_name=params.user_name,
        )
        return await self._client._request(
            "GET", "/customers/lookup", params=query, response_type=CustomerLookupResponse
        )

    async def create(
        self,
        request: CustomerCreateRequest,
    ) -> Any:
        """Create a new customer record."""
        return await self._client._request(
            "POST",
            "/customers",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Customer,
        )

    async def list(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
    ) -> Any:
        """List customers with pagination."""
        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        return await self._client._request(
            "GET", "/customers", params=params, response_type=CustomerListResponse
        )

    async def get(
        self,
        customer_id: str,
    ) -> Any:
        """Get a single customer by their unique ID."""
        return await self._client._request(
            "GET", f"/customers/{customer_id}", response_type=Customer
        )

    async def update(
        self,
        customer_id: str,
        request: CustomerUpdateRequest,
    ) -> Any:
        """Update an existing customer record."""
        return await self._client._request(
            "PATCH",
            f"/customers/{customer_id}",
            body=request.model_dump(by_alias=True, exclude_none=True),
            response_type=Customer,
        )

    async def delete(
        self,
        customer_id: str,
    ) -> None:
        """Permanently delete a customer and all associated data."""
        await self._client._request("DELETE", f"/customers/{customer_id}")

    async def handoff(
        self,
        params: HandoffParams,
    ) -> Any:
        """Generate a cross-channel agent handoff briefing."""
        query: dict[str, str] = {}
        if params.customer_id is not None:
            query["customerId"] = params.customer_id
        if params.phone is not None:
            query["phone"] = params.phone
        if params.email is not None:
            query["email"] = params.email
        if params.external_id is not None:
            query["externalId"] = params.external_id
        if params.narrative is not None:
            query["narrative"] = params.narrative
        if params.fresh is not None:
            query["fresh"] = params.fresh
        return await self._client._request(
            "GET", "/customers/handoff", params=query, response_type=HandoffResponse
        )

    async def handoff_by_id(
        self,
        customer_id: str,
        *,
        narrative: str | None = None,
        fresh: str | None = None,
    ) -> Any:
        """Generate a cross-channel agent handoff briefing by customer ID."""
        params: dict[str, str] = {}
        if narrative is not None:
            params["narrative"] = narrative
        if fresh is not None:
            params["fresh"] = fresh
        return await self._client._request(
            "GET",
            f"/customers/{customer_id}/handoff",
            params=params,
            response_type=HandoffResponse,
        )
