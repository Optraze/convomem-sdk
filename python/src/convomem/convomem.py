"""ConvoMem flat API client — primary SDK entry point.

Identity routing: if ``customer_id`` is set on the ``CustomerIdentity``,
the path-based route is used (``/customers/:id/…``).  Otherwise the flat
route is used and the server resolves the identity from email/phone/externalId.
No client-side lookup round-trip in either case.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal

from convomem._types import CustomerIdentity as CustomerIdentity  # noqa: F401

if TYPE_CHECKING:
    from convomem._async_client import AsyncConvoMemClient
    from convomem._client import ConvoMemClient


# ── Helpers ───────────────────────────────────────────────────────────────────


def _identity_body(identity: CustomerIdentity) -> dict[str, str]:
    """Build the identity portion of a JSON request body."""
    d: dict[str, str] = {}
    if identity.customer_id:
        d["customerId"] = identity.customer_id
    if identity.external_id:
        d["externalId"] = identity.external_id
    if identity.email:
        d["email"] = identity.email
    if identity.phone:
        d["phone"] = identity.phone
    return d


def _identity_params(identity: CustomerIdentity) -> dict[str, str]:
    """Build the identity portion of query parameters."""
    return _identity_body(identity)


# ── Sync ConvoMem ─────────────────────────────────────────────────────────────


class ConvoMem:
    """Primary synchronous ConvoMem API client.

    Example::

        from convomem import ConvoMem, CustomerIdentity

        client = ConvoMem(api_key="sk-org-…")

        ctx = client.lookup("billing question", CustomerIdentity(email="alice@example.com"))
        # … generate reply using ctx.context …
        client.capture(
            [{"role": "user", "content": "What's my invoice?"}, {"role": "assistant", "content": "…"}],
            CustomerIdentity(email="alice@example.com"),
            channel="CHAT",
        )
    """

    def __init__(
        self,
        api_key: str,
        *,
        timeout: float = 10.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        from convomem._client import ConvoMemClient

        self._http: ConvoMemClient = ConvoMemClient(
            api_key=api_key,
            timeout=timeout,
            max_retries=max_retries,
            retry_delay=retry_delay,
        )

    # ── A. Capture ──────────────────────────────────────────

    def capture(
        self,
        messages: list[dict[str, str]],
        identity: CustomerIdentity,
        *,
        channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"] | None = None,
        user_name: str | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        """Send conversation turns for background memory extraction.

        Fire-and-forget: returns before extracted facts are searchable.
        Send turns verbatim — do not skip or summarise.
        """
        from convomem._types import CaptureResponse

        body: dict[str, Any] = {"messages": messages}
        if identity.customer_id:
            body["customerId"] = identity.customer_id
        if identity.external_id:
            body["externalId"] = identity.external_id
        if identity.email:
            body["email"] = identity.email
        if identity.phone:
            body["phoneNumber"] = identity.phone  # /capture uses phoneNumber
        if channel:
            body["channel"] = channel
        if user_name:
            body["userName"] = user_name
        if idempotency_key:
            body["idempotencyKey"] = idempotency_key
        result = self._http._request("POST", "/capture", body=body, response_type=CaptureResponse)
        assert result is not None
        return result

    # ── B. Recall ────────────────────────────────────────────

    def lookup(
        self,
        topic: str,
        identity: CustomerIdentity,
        *,
        auto_create: bool | None = None,
        user_name: str | None = None,
    ) -> Any:
        """Recall semantically relevant memories and return a prompt-ready context string."""
        from convomem._types import MemoryContext

        extra: dict[str, str] = {}
        if auto_create is not None:
            extra["autoCreate"] = "true" if auto_create else "false"
        if user_name:
            extra["userName"] = user_name

        if identity.customer_id:
            result = self._http._request(
                "GET",
                f"/customers/{identity.customer_id}/memories/lookup",
                params={"topic": topic, **extra},
                response_type=MemoryContext,
            )
        else:
            params = {"topic": topic, **_identity_params(identity), **extra}
            result = self._http._request(
                "GET", "/customers/memories/lookup", params=params, response_type=MemoryContext
            )
        assert result is not None
        return result

    def list_memories(
        self,
        identity: CustomerIdentity,
        *,
        page: int | None = None,
        limit: int | None = None,
        category: str | None = None,
    ) -> Any:
        """List all stored memories for a customer with pagination."""
        from convomem._types import MemoryListResponse

        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if category:
            params["category"] = category

        if identity.customer_id:
            result = self._http._request(
                "GET", f"/customers/{identity.customer_id}/memories", params=params,
                response_type=MemoryListResponse,
            )
        else:
            result = self._http._request(
                "GET", "/customers/memories", params={**params, **_identity_params(identity)},
                response_type=MemoryListResponse,
            )
        assert result is not None
        return result

    # ── C. Manual memory CRUD ────────────────────────────────

    def add_memory(
        self,
        content: str,
        identity: CustomerIdentity,
        *,
        category: str | None = None,
    ) -> Any:
        """Manually insert a memory fact (synchronous — available for recall immediately)."""
        from convomem._types import Memory

        body: dict[str, Any] = {"content": content}
        if category:
            body["category"] = category

        if identity.customer_id:
            result = self._http._request(
                "POST", f"/customers/{identity.customer_id}/memories", body=body,
                response_type=Memory,
            )
        else:
            result = self._http._request(
                "POST", "/customers/memories",
                body={**body, **_identity_body(identity)},
                response_type=Memory,
            )
        assert result is not None
        return result

    def update_memory(
        self,
        memory_id: str,
        identity: CustomerIdentity,
        *,
        content: str | None = None,
        category: str | None = None,
    ) -> Any:
        """Update a memory's content or category. Requires ``identity.customer_id``."""
        from convomem._types import Memory

        if not identity.customer_id:
            raise ValueError("update_memory requires identity.customer_id")
        body: dict[str, Any] = {}
        if content is not None:
            body["content"] = content
        if category is not None:
            body["category"] = category
        result = self._http._request(
            "PATCH",
            f"/customers/{identity.customer_id}/memories/{memory_id}",
            body=body,
            response_type=Memory,
        )
        assert result is not None
        return result

    def delete_memory(self, memory_id: str, identity: CustomerIdentity) -> None:
        """Permanently delete a memory. Requires ``identity.customer_id``."""
        if not identity.customer_id:
            raise ValueError("delete_memory requires identity.customer_id")
        self._http._request("DELETE", f"/customers/{identity.customer_id}/memories/{memory_id}")

    # ── D. Customer management ───────────────────────────────

    def create_customer(
        self,
        *,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Create a new customer profile."""
        from convomem._types import Customer

        body: dict[str, Any] = {}
        if name:
            body["name"] = name
        if email:
            body["email"] = email
        if phone:
            body["phone"] = phone
        if external_id:
            body["externalId"] = external_id
        if metadata:
            body["metadata"] = metadata
        result = self._http._request("POST", "/customers", body=body, response_type=Customer)
        assert result is not None
        return result

    def list_customers(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
        search: str | None = None,
        sort_by: str | None = None,
        sort_order: Literal["asc", "desc"] | None = None,
        sentiment: Literal["positive", "neutral", "negative"] | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> Any:
        """Return a paginated, filterable list of customers."""
        from convomem._types import CustomerListResponse

        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if search:
            params["search"] = search
        if sort_by:
            params["sortBy"] = sort_by
        if sort_order:
            params["sortOrder"] = sort_order
        if sentiment:
            params["sentiment"] = sentiment
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        result = self._http._request("GET", "/customers", params=params, response_type=CustomerListResponse)
        assert result is not None
        return result

    def get_customer(self, identity: CustomerIdentity) -> Any:
        """Retrieve a single customer profile."""
        from convomem._types import Customer, CustomerLookupResponse
        from convomem._errors import ConvoMemError

        if identity.customer_id:
            result = self._http._request(
                "GET", f"/customers/{identity.customer_id}", response_type=Customer
            )
            assert result is not None
            return result
        response = self._http._request(
            "GET", "/customers/lookup",
            params=_identity_params(identity),
            response_type=CustomerLookupResponse,
        )
        if not response or not response.found or not response.customer:
            raise ConvoMemError("Customer not found")
        return response.customer

    def update_customer(
        self,
        identity: CustomerIdentity,
        *,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Update an existing customer profile. Metadata is merged with existing values."""
        from convomem._types import Customer

        data: dict[str, Any] = {}
        if name is not None:
            data["name"] = name
        if email is not None:
            data["email"] = email
        if phone is not None:
            data["phone"] = phone
        if external_id is not None:
            data["externalId"] = external_id
        if metadata is not None:
            data["metadata"] = metadata

        if identity.customer_id:
            result = self._http._request(
                "PATCH", f"/customers/{identity.customer_id}", body=data, response_type=Customer
            )
        else:
            result = self._http._request(
                "PATCH", "/customers",
                body={**data, **_identity_body(identity)},
                response_type=Customer,
            )
        assert result is not None
        return result

    def delete_customer(self, identity: CustomerIdentity) -> None:
        """Delete a customer and all their conversations and memories. Irreversible."""
        if identity.customer_id:
            self._http._request("DELETE", f"/customers/{identity.customer_id}")
            return
        self._http._request("DELETE", "/customers", params=_identity_params(identity))

    def list_merge_candidates(self) -> list[Any]:
        """Return profiles flagged as potential duplicates."""
        from convomem._types import MergeCandidate

        raw = self._http._request("GET", "/customers/merge-candidates")
        if not raw:
            return []
        return [MergeCandidate.model_validate(item) for item in raw]

    def dismiss_merge_candidate(self, customer_id: str, candidate_id: str) -> None:
        """Dismiss a duplicate candidate as a false positive."""
        self._http._request(
            "POST",
            f"/customers/{customer_id}/merge-candidates/{candidate_id}/dismiss",
        )

    def get_stats(self, *, from_date: str | None = None, to_date: str | None = None) -> Any:
        """Return aggregate customer statistics for the organization."""
        from convomem._types import CustomerStats

        params: dict[str, str] = {}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        result = self._http._request("GET", "/customers/stats", params=params, response_type=CustomerStats)
        assert result is not None
        return result

    # ── E. Conversations ─────────────────────────────────────

    def start_conversation(
        self,
        identity: CustomerIdentity,
        channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"],
        *,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Start an active conversation session."""
        from convomem._types import Conversation

        body: dict[str, Any] = {"channel": channel}
        if metadata:
            body["metadata"] = metadata

        if identity.customer_id:
            result = self._http._request(
                "POST", f"/customers/{identity.customer_id}/conversations",
                body=body, response_type=Conversation,
            )
        else:
            result = self._http._request(
                "POST", "/customers/conversations",
                body={**body, **_identity_body(identity)},
                response_type=Conversation,
            )
        assert result is not None
        return result

    def end_conversation(
        self,
        conversation_id: str | None,
        identity: CustomerIdentity,
        *,
        outcome: str | None = None,
    ) -> None:
        """Mark a conversation as completed. Capture final turns with capture() first."""
        if conversation_id and identity.customer_id:
            body: dict[str, Any] = {}
            if outcome:
                body["outcome"] = outcome
            self._http._request(
                "PATCH",
                f"/customers/{identity.customer_id}/conversations/{conversation_id}",
                body=body or None,
            )
            return
        body = {**_identity_body(identity)}
        if conversation_id:
            body["conversationId"] = conversation_id
        if outcome:
            body["outcome"] = outcome
        self._http._request("POST", "/customers/conversations/end", body=body)

    def escalate_conversation(
        self,
        conversation_id: str | None,
        identity: CustomerIdentity,
        *,
        reason: str | None = None,
    ) -> None:
        """Escalate a conversation to a human agent. Pair with get_handoff()."""
        if conversation_id and identity.customer_id:
            body: dict[str, Any] = {}
            if reason:
                body["reason"] = reason
            self._http._request(
                "PATCH",
                f"/customers/{identity.customer_id}/conversations/{conversation_id}/escalate",
                body=body or None,
            )
            return
        body = {**_identity_body(identity)}
        if conversation_id:
            body["conversationId"] = conversation_id
        if reason:
            body["reason"] = reason
        self._http._request("POST", "/customers/conversations/escalate", body=body)

    def list_conversations(
        self,
        identity: CustomerIdentity,
        *,
        page: int | None = None,
        limit: int | None = None,
        status: Literal["ACTIVE", "COMPLETED", "ESCALATED", "ABANDONED"] | None = None,
    ) -> Any:
        """List a customer's conversations (most recent first)."""
        from convomem._types import ConversationListResponse

        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if status:
            params["status"] = status

        if identity.customer_id:
            result = self._http._request(
                "GET", f"/customers/{identity.customer_id}/conversations",
                params=params, response_type=ConversationListResponse,
            )
        else:
            result = self._http._request(
                "GET", "/customers/conversations",
                params={**params, **_identity_params(identity)},
                response_type=ConversationListResponse,
            )
        assert result is not None
        return result

    # ── F. Handoff & Embed ───────────────────────────────────

    def get_handoff(
        self,
        identity: CustomerIdentity,
        *,
        fresh: bool | None = None,
        narrative: bool | None = None,
    ) -> Any:
        """Generate a cross-channel briefing for the human taking over."""
        from convomem._types import HandoffResponse

        params: dict[str, str] = {}
        if fresh is not None:
            params["fresh"] = "true" if fresh else "false"
        if narrative is not None:
            params["narrative"] = "true" if narrative else "false"

        if identity.customer_id:
            result = self._http._request(
                "GET", f"/customers/{identity.customer_id}/handoff",
                params=params, response_type=HandoffResponse,
            )
        else:
            result = self._http._request(
                "GET", "/customers/handoff",
                params={**params, **_identity_params(identity)},
                response_type=HandoffResponse,
            )
        assert result is not None
        return result

    def create_embed_token(
        self,
        identity: CustomerIdentity,
        *,
        ttl_seconds: int | None = None,
    ) -> Any:
        """Mint a short-lived read-only embed token for the ConvoMem agent panel."""
        from convomem._types import EmbedTokenResponse

        body: dict[str, Any] = {**_identity_body(identity)}
        if ttl_seconds is not None:
            body["ttlSeconds"] = ttl_seconds
        result = self._http._request("POST", "/embed/tokens", body=body, response_type=EmbedTokenResponse)
        assert result is not None
        return result

    # ── Lifecycle ────────────────────────────────────────────

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> ConvoMem:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


# ── Async ConvoMem ────────────────────────────────────────────────────────────


class AsyncConvoMem:
    """Primary asynchronous ConvoMem API client.

    Example::

        import asyncio
        from convomem import AsyncConvoMem, CustomerIdentity

        async def main():
            async with AsyncConvoMem(api_key="sk-org-…") as client:
                ctx = await client.lookup("billing", CustomerIdentity(email="alice@example.com"))
                print(ctx.context)

        asyncio.run(main())
    """

    def __init__(
        self,
        api_key: str,
        *,
        timeout: float = 10.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        from convomem._async_client import AsyncConvoMemClient

        self._http: AsyncConvoMemClient = AsyncConvoMemClient(
            api_key=api_key,
            timeout=timeout,
            max_retries=max_retries,
            retry_delay=retry_delay,
        )

    # ── A. Capture ──────────────────────────────────────────

    async def capture(
        self,
        messages: list[dict[str, str]],
        identity: CustomerIdentity,
        *,
        channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"] | None = None,
        user_name: str | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        """Send conversation turns for background memory extraction."""
        from convomem._types import CaptureResponse

        body: dict[str, Any] = {"messages": messages}
        if identity.customer_id:
            body["customerId"] = identity.customer_id
        if identity.external_id:
            body["externalId"] = identity.external_id
        if identity.email:
            body["email"] = identity.email
        if identity.phone:
            body["phoneNumber"] = identity.phone
        if channel:
            body["channel"] = channel
        if user_name:
            body["userName"] = user_name
        if idempotency_key:
            body["idempotencyKey"] = idempotency_key
        result = await self._http._request("POST", "/capture", body=body, response_type=CaptureResponse)
        assert result is not None
        return result

    # ── B. Recall ────────────────────────────────────────────

    async def lookup(
        self,
        topic: str,
        identity: CustomerIdentity,
        *,
        auto_create: bool | None = None,
        user_name: str | None = None,
    ) -> Any:
        """Recall semantically relevant memories and return a prompt-ready context string."""
        from convomem._types import MemoryContext

        extra: dict[str, str] = {}
        if auto_create is not None:
            extra["autoCreate"] = "true" if auto_create else "false"
        if user_name:
            extra["userName"] = user_name

        if identity.customer_id:
            result = await self._http._request(
                "GET",
                f"/customers/{identity.customer_id}/memories/lookup",
                params={"topic": topic, **extra},
                response_type=MemoryContext,
            )
        else:
            params = {"topic": topic, **_identity_params(identity), **extra}
            result = await self._http._request(
                "GET", "/customers/memories/lookup", params=params, response_type=MemoryContext
            )
        assert result is not None
        return result

    async def list_memories(
        self,
        identity: CustomerIdentity,
        *,
        page: int | None = None,
        limit: int | None = None,
        category: str | None = None,
    ) -> Any:
        """List all stored memories for a customer with pagination."""
        from convomem._types import MemoryListResponse

        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if category:
            params["category"] = category

        if identity.customer_id:
            result = await self._http._request(
                "GET", f"/customers/{identity.customer_id}/memories", params=params,
                response_type=MemoryListResponse,
            )
        else:
            result = await self._http._request(
                "GET", "/customers/memories",
                params={**params, **_identity_params(identity)},
                response_type=MemoryListResponse,
            )
        assert result is not None
        return result

    # ── C. Manual memory CRUD ────────────────────────────────

    async def add_memory(
        self,
        content: str,
        identity: CustomerIdentity,
        *,
        category: str | None = None,
    ) -> Any:
        """Manually insert a memory fact (synchronous — available for recall immediately)."""
        from convomem._types import Memory

        body: dict[str, Any] = {"content": content}
        if category:
            body["category"] = category

        if identity.customer_id:
            result = await self._http._request(
                "POST", f"/customers/{identity.customer_id}/memories", body=body,
                response_type=Memory,
            )
        else:
            result = await self._http._request(
                "POST", "/customers/memories",
                body={**body, **_identity_body(identity)},
                response_type=Memory,
            )
        assert result is not None
        return result

    async def update_memory(
        self,
        memory_id: str,
        identity: CustomerIdentity,
        *,
        content: str | None = None,
        category: str | None = None,
    ) -> Any:
        """Update a memory's content or category. Requires ``identity.customer_id``."""
        from convomem._types import Memory

        if not identity.customer_id:
            raise ValueError("update_memory requires identity.customer_id")
        body: dict[str, Any] = {}
        if content is not None:
            body["content"] = content
        if category is not None:
            body["category"] = category
        result = await self._http._request(
            "PATCH",
            f"/customers/{identity.customer_id}/memories/{memory_id}",
            body=body,
            response_type=Memory,
        )
        assert result is not None
        return result

    async def delete_memory(self, memory_id: str, identity: CustomerIdentity) -> None:
        """Permanently delete a memory. Requires ``identity.customer_id``."""
        if not identity.customer_id:
            raise ValueError("delete_memory requires identity.customer_id")
        await self._http._request(
            "DELETE", f"/customers/{identity.customer_id}/memories/{memory_id}"
        )

    # ── D. Customer management ───────────────────────────────

    async def create_customer(
        self,
        *,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Create a new customer profile."""
        from convomem._types import Customer

        body: dict[str, Any] = {}
        if name:
            body["name"] = name
        if email:
            body["email"] = email
        if phone:
            body["phone"] = phone
        if external_id:
            body["externalId"] = external_id
        if metadata:
            body["metadata"] = metadata
        result = await self._http._request("POST", "/customers", body=body, response_type=Customer)
        assert result is not None
        return result

    async def list_customers(
        self,
        *,
        page: int | None = None,
        limit: int | None = None,
        search: str | None = None,
        sort_by: str | None = None,
        sort_order: Literal["asc", "desc"] | None = None,
        sentiment: Literal["positive", "neutral", "negative"] | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> Any:
        """Return a paginated, filterable list of customers."""
        from convomem._types import CustomerListResponse

        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if search:
            params["search"] = search
        if sort_by:
            params["sortBy"] = sort_by
        if sort_order:
            params["sortOrder"] = sort_order
        if sentiment:
            params["sentiment"] = sentiment
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        result = await self._http._request(
            "GET", "/customers", params=params, response_type=CustomerListResponse
        )
        assert result is not None
        return result

    async def get_customer(self, identity: CustomerIdentity) -> Any:
        """Retrieve a single customer profile."""
        from convomem._errors import ConvoMemError
        from convomem._types import Customer, CustomerLookupResponse

        if identity.customer_id:
            result = await self._http._request(
                "GET", f"/customers/{identity.customer_id}", response_type=Customer
            )
            assert result is not None
            return result
        response = await self._http._request(
            "GET", "/customers/lookup",
            params=_identity_params(identity),
            response_type=CustomerLookupResponse,
        )
        if not response or not response.found or not response.customer:
            raise ConvoMemError("Customer not found")
        return response.customer

    async def update_customer(
        self,
        identity: CustomerIdentity,
        *,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Update an existing customer profile."""
        from convomem._types import Customer

        data: dict[str, Any] = {}
        if name is not None:
            data["name"] = name
        if email is not None:
            data["email"] = email
        if phone is not None:
            data["phone"] = phone
        if external_id is not None:
            data["externalId"] = external_id
        if metadata is not None:
            data["metadata"] = metadata

        if identity.customer_id:
            result = await self._http._request(
                "PATCH", f"/customers/{identity.customer_id}", body=data, response_type=Customer
            )
        else:
            result = await self._http._request(
                "PATCH", "/customers",
                body={**data, **_identity_body(identity)},
                response_type=Customer,
            )
        assert result is not None
        return result

    async def delete_customer(self, identity: CustomerIdentity) -> None:
        """Delete a customer and all their conversations and memories."""
        if identity.customer_id:
            await self._http._request("DELETE", f"/customers/{identity.customer_id}")
            return
        await self._http._request("DELETE", "/customers", params=_identity_params(identity))

    async def list_merge_candidates(self) -> list[Any]:
        """Return profiles flagged as potential duplicates."""
        from convomem._types import MergeCandidate

        raw = await self._http._request("GET", "/customers/merge-candidates")
        if not raw:
            return []
        return [MergeCandidate.model_validate(item) for item in raw]

    async def dismiss_merge_candidate(self, customer_id: str, candidate_id: str) -> None:
        """Dismiss a duplicate candidate as a false positive."""
        await self._http._request(
            "POST",
            f"/customers/{customer_id}/merge-candidates/{candidate_id}/dismiss",
        )

    async def get_stats(self, *, from_date: str | None = None, to_date: str | None = None) -> Any:
        """Return aggregate customer statistics for the organization."""
        from convomem._types import CustomerStats

        params: dict[str, str] = {}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        result = await self._http._request(
            "GET", "/customers/stats", params=params, response_type=CustomerStats
        )
        assert result is not None
        return result

    # ── E. Conversations ─────────────────────────────────────

    async def start_conversation(
        self,
        identity: CustomerIdentity,
        channel: Literal["VOICE", "CHAT", "SMS", "EMAIL"],
        *,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        """Start an active conversation session."""
        from convomem._types import Conversation

        body: dict[str, Any] = {"channel": channel}
        if metadata:
            body["metadata"] = metadata

        if identity.customer_id:
            result = await self._http._request(
                "POST", f"/customers/{identity.customer_id}/conversations",
                body=body, response_type=Conversation,
            )
        else:
            result = await self._http._request(
                "POST", "/customers/conversations",
                body={**body, **_identity_body(identity)},
                response_type=Conversation,
            )
        assert result is not None
        return result

    async def end_conversation(
        self,
        conversation_id: str | None,
        identity: CustomerIdentity,
        *,
        outcome: str | None = None,
    ) -> None:
        """Mark a conversation as completed."""
        if conversation_id and identity.customer_id:
            body: dict[str, Any] = {}
            if outcome:
                body["outcome"] = outcome
            await self._http._request(
                "PATCH",
                f"/customers/{identity.customer_id}/conversations/{conversation_id}",
                body=body or None,
            )
            return
        body = {**_identity_body(identity)}
        if conversation_id:
            body["conversationId"] = conversation_id
        if outcome:
            body["outcome"] = outcome
        await self._http._request("POST", "/customers/conversations/end", body=body)

    async def escalate_conversation(
        self,
        conversation_id: str | None,
        identity: CustomerIdentity,
        *,
        reason: str | None = None,
    ) -> None:
        """Escalate a conversation to a human agent."""
        if conversation_id and identity.customer_id:
            body: dict[str, Any] = {}
            if reason:
                body["reason"] = reason
            await self._http._request(
                "PATCH",
                f"/customers/{identity.customer_id}/conversations/{conversation_id}/escalate",
                body=body or None,
            )
            return
        body = {**_identity_body(identity)}
        if conversation_id:
            body["conversationId"] = conversation_id
        if reason:
            body["reason"] = reason
        await self._http._request("POST", "/customers/conversations/escalate", body=body)

    async def list_conversations(
        self,
        identity: CustomerIdentity,
        *,
        page: int | None = None,
        limit: int | None = None,
        status: Literal["ACTIVE", "COMPLETED", "ESCALATED", "ABANDONED"] | None = None,
    ) -> Any:
        """List a customer's conversations (most recent first)."""
        from convomem._types import ConversationListResponse

        params: dict[str, str] = {}
        if page is not None:
            params["page"] = str(page)
        if limit is not None:
            params["limit"] = str(limit)
        if status:
            params["status"] = status

        if identity.customer_id:
            result = await self._http._request(
                "GET", f"/customers/{identity.customer_id}/conversations",
                params=params, response_type=ConversationListResponse,
            )
        else:
            result = await self._http._request(
                "GET", "/customers/conversations",
                params={**params, **_identity_params(identity)},
                response_type=ConversationListResponse,
            )
        assert result is not None
        return result

    # ── F. Handoff & Embed ───────────────────────────────────

    async def get_handoff(
        self,
        identity: CustomerIdentity,
        *,
        fresh: bool | None = None,
        narrative: bool | None = None,
    ) -> Any:
        """Generate a cross-channel briefing for the human taking over."""
        from convomem._types import HandoffResponse

        params: dict[str, str] = {}
        if fresh is not None:
            params["fresh"] = "true" if fresh else "false"
        if narrative is not None:
            params["narrative"] = "true" if narrative else "false"

        if identity.customer_id:
            result = await self._http._request(
                "GET", f"/customers/{identity.customer_id}/handoff",
                params=params, response_type=HandoffResponse,
            )
        else:
            result = await self._http._request(
                "GET", "/customers/handoff",
                params={**params, **_identity_params(identity)},
                response_type=HandoffResponse,
            )
        assert result is not None
        return result

    async def create_embed_token(
        self,
        identity: CustomerIdentity,
        *,
        ttl_seconds: int | None = None,
    ) -> Any:
        """Mint a short-lived read-only embed token for the ConvoMem agent panel."""
        from convomem._types import EmbedTokenResponse

        body: dict[str, Any] = {**_identity_body(identity)}
        if ttl_seconds is not None:
            body["ttlSeconds"] = ttl_seconds
        result = await self._http._request(
            "POST", "/embed/tokens", body=body, response_type=EmbedTokenResponse
        )
        assert result is not None
        return result

    # ── Lifecycle ────────────────────────────────────────────

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._http.close()

    async def __aenter__(self) -> AsyncConvoMem:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.close()
