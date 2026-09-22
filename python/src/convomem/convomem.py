"""ConvoMem flat API client — primary SDK entry point.

Identity routing: if ``customer_id`` is set on the ``CustomerIdentity``,
the path-based route is used (``/customers/:id/…``).  Otherwise the flat
route is used and the server resolves the identity from email/phone/externalId.
No client-side lookup round-trip in either case.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Literal

from convomem._types import CustomerIdentity as CustomerIdentity  # noqa: TC001

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


def _lookup_options(**values: Any) -> dict[str, str]:
    aliases = {
        "max_tokens": "maxTokens",
        "latest_only": "latestOnly",
        "reference_date": "referenceDate",
        "include_agent_facts": "includeAgentFacts",
    }
    result: dict[str, str] = {}
    for key, value in values.items():
        if value is not None:
            result[aliases.get(key, key)] = (
                str(value).lower() if isinstance(value, bool) else str(value)
            )
    return result


# ── Sync ConvoMem ─────────────────────────────────────────────────────────────


class ConvoMem:
    """Primary synchronous ConvoMem API client.

    Example::

        from convomem import ConvoMem, CustomerIdentity

        client = ConvoMem(api_key="sk-org-…")

        ctx = client.lookup("billing question", CustomerIdentity(email="alice@example.com"))
        # … generate reply using ctx.context …
        client.capture(
            [
                {"role": "user", "content": "What's my invoice?"},
                {"role": "assistant", "content": "…"},
            ],
            CustomerIdentity(email="alice@example.com"),
            channel="CHAT",
        )
    """

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.convomem.com/api/v1",
        timeout: float = 10.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        from convomem._client import ConvoMemClient

        self._http: ConvoMemClient = ConvoMemClient(
            api_key=api_key,
            base_url=base_url,
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
        social_handles: list[Any] | None = None,
        idempotency_key: str | None = None,
        end_conversation: bool | None = None,
        outcome: str | None = None,
        escalate: bool | None = None,
        reason: str | None = None,
        language: str | None = None,
        occurred_at: str | None = None,
        infer: bool | None = None,
        speaker_id: str | None = None,
        speaker_name: str | None = None,
    ) -> Any:
        """Send conversation turns for background memory extraction.

        Fire-and-forget: returns before extracted facts are searchable.
        Send turns verbatim — do not skip or summarise.

        To close a conversation, set ``end_conversation`` (or ``escalate``) on
        the final capture rather than calling ``end_conversation()`` separately.
        Capture persists the transcript in a background job, so closing in a
        second call races analysis against that write — on a voice hang-up,
        where both calls land together, the summary can be built from half a
        transcript.  Setting the flag here makes persist → close → analyse one
        ordered chain.  The two flags are mutually exclusive; sending both is
        rejected with a 422.
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
        if social_handles:
            body["socialHandles"] = social_handles
        if idempotency_key:
            body["idempotencyKey"] = idempotency_key
        if end_conversation is not None:
            body["endConversation"] = end_conversation
        if outcome:
            body["outcome"] = outcome
        if escalate is not None:
            body["escalate"] = escalate
        if reason:
            body["reason"] = reason
        if language:
            body["language"] = language
        if occurred_at:
            body["occurredAt"] = occurred_at
        if infer is not None:
            body["infer"] = infer
        if speaker_id:
            body["speakerId"] = speaker_id
        if speaker_name:
            body["speakerName"] = speaker_name
        result = self._http._request("POST", "/capture", body=body, response_type=CaptureResponse)
        assert result is not None
        return result

    def get_capture_status(self, capture_id: str) -> Any:
        """Get queued, processing, completed, or failed state for a capture."""
        return self._http.get_capture_status(capture_id)

    # ── B. Recall ────────────────────────────────────────────

    def lookup(
        self,
        topic: str,
        identity: CustomerIdentity,
        *,
        auto_create: bool | None = None,
        user_name: str | None = None,
        max_tokens: int | None = None,
        limit: int | None = None,
        threshold: float | None = None,
        rerank: bool | None = None,
        latest_only: bool | None = None,
        explain: bool | None = None,
        reference_date: str | None = None,
        include_agent_facts: bool | None = None,
        verify: bool | None = None,
    ) -> Any:
        """Recall semantically relevant memories and return a prompt-ready context string.

        The returned ``context`` wraps the memory lines in a delimited block
        marked as unverified caller statements.  Inject it verbatim — that
        framing is what stops a caller-authored "memory" from reading as an
        instruction to your model.

        ``max_tokens`` caps the context block for this call only (50-4000,
        clamped).  Omit it to use the agent's configured budget, then the
        default of 800.  A voice agent usually wants a tighter brief than an
        email one.
        """
        from convomem._types import MemoryContext

        extra: dict[str, str] = {}
        if auto_create is not None:
            extra["autoCreate"] = "true" if auto_create else "false"
        if user_name:
            extra["userName"] = user_name
        extra.update(
            _lookup_options(
                max_tokens=max_tokens,
                limit=limit,
                threshold=threshold,
                rerank=rerank,
                latest_only=latest_only,
                explain=explain,
                reference_date=reference_date,
                include_agent_facts=include_agent_facts,
                verify=verify,
            )
        )

        if identity.customer_id:
            # The path route already identifies the customer, so identity params
            # are redundant — but the tuning params must still travel, or a
            # caller passing customer_id would silently lose their max_tokens.
            path_params = {"topic": topic, **extra}
            path_params.pop("autoCreate", None)
            path_params.pop("userName", None)
            result = self._http._request(
                "GET",
                f"/customers/{identity.customer_id}/memories/lookup",
                params=path_params,
                response_type=MemoryContext,
            )
        else:
            params = {"topic": topic, **_identity_params(identity), **extra}
            result = self._http._request(
                "GET", "/customers/memories/lookup", params=params, response_type=MemoryContext
            )
        assert result is not None
        return result

    def cold_open(
        self,
        identity: CustomerIdentity,
        *,
        auto_create: bool | None = None,
        user_name: str | None = None,
        max_tokens: int | None = None,
    ) -> Any:
        """Recall context at the *start* of a conversation, before the customer
        has said why they are calling.

        This is the cold open: the phone has rung and nobody knows yet what it
        is about.  Rather than the most recent facts, you get a call-opening
        brief — any unresolved issue first (with its status and the latest
        internal agent notes), a line if this is a repeat customer, then
        memories ranked on what is knowable without a query: confidence and
        remaining strength.

        There is no embedding call and no vector search on this path, so it is
        safe to run while the caller is still hearing the ring tone.

        Returns the customer profile, the brief in ``context``, and
        ``open_issue`` when something is still outstanding.
        """
        from convomem._types import CustomerLookupResponse

        params: dict[str, str] = {**_identity_params(identity)}
        if auto_create is not None:
            params["autoCreate"] = "true" if auto_create else "false"
        if user_name:
            params["userName"] = user_name
        if max_tokens is not None:
            params["maxTokens"] = str(max_tokens)

        result = self._http._request(
            "GET", "/customers/lookup", params=params, response_type=CustomerLookupResponse
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
        include_expired: bool | None = None,
        as_of: str | None = None,
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
        if include_expired is not None:
            params["includeExpired"] = str(include_expired).lower()
        if as_of:
            params["asOf"] = as_of

        if identity.customer_id:
            result = self._http._request(
                "GET",
                f"/customers/{identity.customer_id}/memories",
                params=params,
                response_type=MemoryListResponse,
            )
        else:
            result = self._http._request(
                "GET",
                "/customers/memories",
                params={**params, **_identity_params(identity)},
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
        expires_at: str | None = None,
    ) -> Any:
        """Manually insert a memory fact (synchronous — available for recall immediately)."""
        from convomem._types import Memory

        body: dict[str, Any] = {"content": content}
        if category:
            body["category"] = category
        if expires_at is not None:
            body["expiresAt"] = expires_at

        if identity.customer_id:
            result = self._http._request(
                "POST",
                f"/customers/{identity.customer_id}/memories",
                body=body,
                response_type=Memory,
            )
        else:
            result = self._http._request(
                "POST",
                "/customers/memories",
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
        expires_at: str | None = None,
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
        if expires_at is not None:
            body["expiresAt"] = expires_at
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
        result = self._http._request(
            "GET", "/customers", params=params, response_type=CustomerListResponse
        )
        assert result is not None
        return result

    def get_customer(self, identity: CustomerIdentity) -> Any:
        """Retrieve a single customer profile."""
        from convomem._errors import ConvoMemError
        from convomem._types import Customer, CustomerLookupResponse

        if identity.customer_id:
            result = self._http._request(
                "GET", f"/customers/{identity.customer_id}", response_type=Customer
            )
            assert result is not None
            return result
        response = self._http._request(
            "GET",
            "/customers/lookup",
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
                "PATCH",
                "/customers",
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
                "POST",
                f"/customers/{identity.customer_id}/conversations",
                body=body,
                response_type=Conversation,
            )
        else:
            result = self._http._request(
                "POST",
                "/customers/conversations",
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
                "GET",
                f"/customers/{identity.customer_id}/conversations",
                params=params,
                response_type=ConversationListResponse,
            )
        else:
            result = self._http._request(
                "GET",
                "/customers/conversations",
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
                "GET",
                f"/customers/{identity.customer_id}/handoff",
                params=params,
                response_type=HandoffResponse,
            )
        else:
            result = self._http._request(
                "GET",
                "/customers/handoff",
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
        result = self._http._request(
            "POST", "/embed/tokens", body=body, response_type=EmbedTokenResponse
        )
        assert result is not None
        return result

    # ── G. Handoff routing ───────────────────────────────────

    def route_handoff(
        self,
        identity: CustomerIdentity,
        *,
        format: Literal["generic", "dograh"] | None = None,
    ) -> Any:
        """Resolve where a live transfer for this customer should go.

        Answers the question a voice platform asks mid-call: the customer wants
        a human, which one?  The judgement itself was made offline when their
        last conversation ended (or, with real-time routing enabled on the
        agent, on the last mid-call capture), so this is a single indexed read
        with no LLM work on the call path.

        **This call never fails.**  A voice platform treats a resolver error as
        a failed transfer, which strands a caller — so an unknown customer, a
        missing decision, or an internal failure all degrade to the agent's
        default destination instead of raising.  Read ``source`` to see which
        tier answered: ``memory`` is a real per-customer decision, ``default``
        is the fallback.

        Pass ``format="dograh"`` to get Dograh's ``transfer_context`` shape.
        """
        from convomem._types import HandoffRouteResponse

        params: dict[str, str] = {}
        if format:
            params["format"] = format
        result = self._http._request(
            "POST",
            "/handoff/route",
            params=params or None,
            body=_identity_body(identity),
            response_type=HandoffRouteResponse,
        )
        assert result is not None
        return result

    def list_handoff_destinations(self) -> list[Any]:
        """List the handoff destinations configured for this agent, default first."""
        from convomem._types import HandoffDestination

        raw = self._http._request("GET", "/handoff/destinations")
        if not raw:
            return []
        return [HandoffDestination.model_validate(item) for item in raw]

    def create_handoff_destination(
        self,
        *,
        name: str,
        type: Literal["PHONE", "SIP"],
        value: str,
        description: str | None = None,
        transfer_message: str | None = None,
        is_default: bool | None = None,
        is_active: bool | None = None,
    ) -> Any:
        """Create a handoff destination for this agent.

        The first destination you create becomes the default automatically —
        routing always needs somewhere to fall back to.  Write ``description``
        as a plain-English rule: it is the text the model reads when choosing
        between destinations, so "repeat callers with unresolved billing
        issues" routes far better than "Tier 2".
        """
        from convomem._types import HandoffDestination

        body: dict[str, Any] = {"name": name, "type": type, "value": value}
        if description:
            body["description"] = description
        if transfer_message:
            body["transferMessage"] = transfer_message
        if is_default is not None:
            body["isDefault"] = is_default
        if is_active is not None:
            body["isActive"] = is_active
        result = self._http._request(
            "POST", "/handoff/destinations", body=body, response_type=HandoffDestination
        )
        assert result is not None
        return result

    def update_handoff_destination(self, destination_id: str, **changes: Any) -> Any:
        """Update a handoff destination.

        Accepts the same fields as :meth:`create_handoff_destination`, in
        snake_case.  Editing a destination redirects live phone calls, so this
        requires organization write access, not just an agent-scoped key.
        """
        from convomem._types import HandoffDestination

        alias = {
            "transfer_message": "transferMessage",
            "is_default": "isDefault",
            "is_active": "isActive",
        }
        body = {alias.get(k, k): v for k, v in changes.items() if v is not None}
        result = self._http._request(
            "PATCH",
            f"/handoff/destinations/{destination_id}",
            body=body,
            response_type=HandoffDestination,
        )
        assert result is not None
        return result

    def delete_handoff_destination(self, destination_id: str) -> None:
        """Delete a handoff destination.

        Refuses to delete the default while other destinations still exist —
        promote another destination to default first, or routing would have
        nothing to fall back to.
        """
        self._http._request("DELETE", f"/handoff/destinations/{destination_id}")

    def preview_handoff_route(self, customer_id: str) -> Any:
        """Preview the resolution a live transfer would receive, without transferring."""
        from convomem._types import HandoffRouteResponse

        result = self._http._request(
            "GET",
            "/handoff/route/preview",
            params={"customerId": customer_id},
            response_type=HandoffRouteResponse,
        )
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
        base_url: str = "https://api.convomem.com/api/v1",
        timeout: float = 10.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ) -> None:
        from convomem._async_client import AsyncConvoMemClient

        self._http: AsyncConvoMemClient = AsyncConvoMemClient(
            api_key=api_key,
            base_url=base_url,
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
        social_handles: list[Any] | None = None,
        idempotency_key: str | None = None,
        end_conversation: bool | None = None,
        outcome: str | None = None,
        escalate: bool | None = None,
        reason: str | None = None,
        language: str | None = None,
        occurred_at: str | None = None,
        infer: bool | None = None,
        speaker_id: str | None = None,
        speaker_name: str | None = None,
    ) -> Any:
        """Send conversation turns for background memory extraction.

        To close a conversation, set ``end_conversation`` (or ``escalate``) on
        the final capture rather than calling ``end_conversation()`` separately.
        Capture persists the transcript in a background job, so closing in a
        second call races analysis against that write — on a voice hang-up,
        where both calls land together, the summary can be built from half a
        transcript.  Setting the flag here makes persist → close → analyse one
        ordered chain.  The two flags are mutually exclusive; sending both is
        rejected with a 422.
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
            body["phoneNumber"] = identity.phone
        if channel:
            body["channel"] = channel
        if user_name:
            body["userName"] = user_name
        if social_handles:
            body["socialHandles"] = social_handles
        if idempotency_key:
            body["idempotencyKey"] = idempotency_key
        if end_conversation is not None:
            body["endConversation"] = end_conversation
        if outcome:
            body["outcome"] = outcome
        if escalate is not None:
            body["escalate"] = escalate
        if reason:
            body["reason"] = reason
        if language:
            body["language"] = language
        if occurred_at:
            body["occurredAt"] = occurred_at
        if infer is not None:
            body["infer"] = infer
        if speaker_id:
            body["speakerId"] = speaker_id
        if speaker_name:
            body["speakerName"] = speaker_name
        result = await self._http._request(
            "POST", "/capture", body=body, response_type=CaptureResponse
        )
        assert result is not None
        return result

    async def get_capture_status(self, capture_id: str) -> Any:
        """Get queued, processing, completed, or failed state for a capture."""
        return await self._http.get_capture_status(capture_id)

    # ── B. Recall ────────────────────────────────────────────

    async def lookup(
        self,
        topic: str,
        identity: CustomerIdentity,
        *,
        auto_create: bool | None = None,
        user_name: str | None = None,
        max_tokens: int | None = None,
        limit: int | None = None,
        threshold: float | None = None,
        rerank: bool | None = None,
        latest_only: bool | None = None,
        explain: bool | None = None,
        reference_date: str | None = None,
        include_agent_facts: bool | None = None,
        verify: bool | None = None,
    ) -> Any:
        """Recall semantically relevant memories and return a prompt-ready context string.

        The returned ``context`` wraps the memory lines in a delimited block
        marked as unverified caller statements.  Inject it verbatim — that
        framing is what stops a caller-authored "memory" from reading as an
        instruction to your model.

        ``max_tokens`` caps the context block for this call only (50-4000,
        clamped).  Omit it to use the agent's configured budget, then the
        default of 800.  A voice agent usually wants a tighter brief than an
        email one.
        """
        from convomem._types import MemoryContext

        extra: dict[str, str] = {}
        if auto_create is not None:
            extra["autoCreate"] = "true" if auto_create else "false"
        if user_name:
            extra["userName"] = user_name
        extra.update(
            _lookup_options(
                max_tokens=max_tokens,
                limit=limit,
                threshold=threshold,
                rerank=rerank,
                latest_only=latest_only,
                explain=explain,
                reference_date=reference_date,
                include_agent_facts=include_agent_facts,
                verify=verify,
            )
        )

        if identity.customer_id:
            # The path route already identifies the customer, so identity params
            # are redundant — but the tuning params must still travel, or a
            # caller passing customer_id would silently lose their max_tokens.
            path_params = {"topic": topic, **extra}
            path_params.pop("autoCreate", None)
            path_params.pop("userName", None)
            result = await self._http._request(
                "GET",
                f"/customers/{identity.customer_id}/memories/lookup",
                params=path_params,
                response_type=MemoryContext,
            )
        else:
            params = {"topic": topic, **_identity_params(identity), **extra}
            result = await self._http._request(
                "GET", "/customers/memories/lookup", params=params, response_type=MemoryContext
            )
        assert result is not None
        return result

    async def cold_open(
        self,
        identity: CustomerIdentity,
        *,
        auto_create: bool | None = None,
        user_name: str | None = None,
        max_tokens: int | None = None,
    ) -> Any:
        """Recall context at the *start* of a conversation, before the customer
        has said why they are calling.

        This is the cold open: the phone has rung and nobody knows yet what it
        is about.  Rather than the most recent facts, you get a call-opening
        brief — any unresolved issue first (with its status and the latest
        internal agent notes), a line if this is a repeat customer, then
        memories ranked on what is knowable without a query: confidence and
        remaining strength.

        There is no embedding call and no vector search on this path, so it is
        safe to run while the caller is still hearing the ring tone.

        Returns the customer profile, the brief in ``context``, and
        ``open_issue`` when something is still outstanding.
        """
        from convomem._types import CustomerLookupResponse

        params: dict[str, str] = {**_identity_params(identity)}
        if auto_create is not None:
            params["autoCreate"] = "true" if auto_create else "false"
        if user_name:
            params["userName"] = user_name
        if max_tokens is not None:
            params["maxTokens"] = str(max_tokens)

        result = await self._http._request(
            "GET", "/customers/lookup", params=params, response_type=CustomerLookupResponse
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
        include_expired: bool | None = None,
        as_of: str | None = None,
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
        if include_expired is not None:
            params["includeExpired"] = str(include_expired).lower()
        if as_of:
            params["asOf"] = as_of

        if identity.customer_id:
            result = await self._http._request(
                "GET",
                f"/customers/{identity.customer_id}/memories",
                params=params,
                response_type=MemoryListResponse,
            )
        else:
            result = await self._http._request(
                "GET",
                "/customers/memories",
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
        expires_at: str | None = None,
    ) -> Any:
        """Manually insert a memory fact (synchronous — available for recall immediately)."""
        from convomem._types import Memory

        body: dict[str, Any] = {"content": content}
        if category:
            body["category"] = category
        if expires_at is not None:
            body["expiresAt"] = expires_at

        if identity.customer_id:
            result = await self._http._request(
                "POST",
                f"/customers/{identity.customer_id}/memories",
                body=body,
                response_type=Memory,
            )
        else:
            result = await self._http._request(
                "POST",
                "/customers/memories",
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
        expires_at: str | None = None,
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
        if expires_at is not None:
            body["expiresAt"] = expires_at
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
            "GET",
            "/customers/lookup",
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
                "PATCH",
                "/customers",
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
                "POST",
                f"/customers/{identity.customer_id}/conversations",
                body=body,
                response_type=Conversation,
            )
        else:
            result = await self._http._request(
                "POST",
                "/customers/conversations",
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
                "GET",
                f"/customers/{identity.customer_id}/conversations",
                params=params,
                response_type=ConversationListResponse,
            )
        else:
            result = await self._http._request(
                "GET",
                "/customers/conversations",
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
                "GET",
                f"/customers/{identity.customer_id}/handoff",
                params=params,
                response_type=HandoffResponse,
            )
        else:
            result = await self._http._request(
                "GET",
                "/customers/handoff",
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

    # ── G. Handoff routing ───────────────────────────────────

    async def route_handoff(
        self,
        identity: CustomerIdentity,
        *,
        format: Literal["generic", "dograh"] | None = None,
    ) -> Any:
        """Resolve where a live transfer for this customer should go.

        Answers the question a voice platform asks mid-call: the customer wants
        a human, which one?  The judgement itself was made offline when their
        last conversation ended (or, with real-time routing enabled on the
        agent, on the last mid-call capture), so this is a single indexed read
        with no LLM work on the call path.

        **This call never fails.**  A voice platform treats a resolver error as
        a failed transfer, which strands a caller — so an unknown customer, a
        missing decision, or an internal failure all degrade to the agent's
        default destination instead of raising.  Read ``source`` to see which
        tier answered: ``memory`` is a real per-customer decision, ``default``
        is the fallback.

        Pass ``format="dograh"`` to get Dograh's ``transfer_context`` shape.
        """
        from convomem._types import HandoffRouteResponse

        params: dict[str, str] = {}
        if format:
            params["format"] = format
        result = await self._http._request(
            "POST",
            "/handoff/route",
            params=params or None,
            body=_identity_body(identity),
            response_type=HandoffRouteResponse,
        )
        assert result is not None
        return result

    async def list_handoff_destinations(self) -> list[Any]:
        """List the handoff destinations configured for this agent, default first."""
        from convomem._types import HandoffDestination

        raw = await self._http._request(  # type: ignore[func-returns-value]
            "GET", "/handoff/destinations"
        )
        if not raw:
            return []
        return [HandoffDestination.model_validate(item) for item in raw]

    async def create_handoff_destination(
        self,
        *,
        name: str,
        type: Literal["PHONE", "SIP"],
        value: str,
        description: str | None = None,
        transfer_message: str | None = None,
        is_default: bool | None = None,
        is_active: bool | None = None,
    ) -> Any:
        """Create a handoff destination for this agent.

        The first destination you create becomes the default automatically —
        routing always needs somewhere to fall back to.  Write ``description``
        as a plain-English rule: it is the text the model reads when choosing
        between destinations, so "repeat callers with unresolved billing
        issues" routes far better than "Tier 2".
        """
        from convomem._types import HandoffDestination

        body: dict[str, Any] = {"name": name, "type": type, "value": value}
        if description:
            body["description"] = description
        if transfer_message:
            body["transferMessage"] = transfer_message
        if is_default is not None:
            body["isDefault"] = is_default
        if is_active is not None:
            body["isActive"] = is_active
        result = await self._http._request(
            "POST", "/handoff/destinations", body=body, response_type=HandoffDestination
        )
        assert result is not None
        return result

    async def update_handoff_destination(self, destination_id: str, **changes: Any) -> Any:
        """Update a handoff destination.

        Accepts the same fields as :meth:`create_handoff_destination`, in
        snake_case.  Editing a destination redirects live phone calls, so this
        requires organization write access, not just an agent-scoped key.
        """
        from convomem._types import HandoffDestination

        alias = {
            "transfer_message": "transferMessage",
            "is_default": "isDefault",
            "is_active": "isActive",
        }
        body = {alias.get(k, k): v for k, v in changes.items() if v is not None}
        result = await self._http._request(
            "PATCH",
            f"/handoff/destinations/{destination_id}",
            body=body,
            response_type=HandoffDestination,
        )
        assert result is not None
        return result

    async def delete_handoff_destination(self, destination_id: str) -> None:
        """Delete a handoff destination.

        Refuses to delete the default while other destinations still exist —
        promote another destination to default first, or routing would have
        nothing to fall back to.
        """
        await self._http._request("DELETE", f"/handoff/destinations/{destination_id}")

    async def preview_handoff_route(self, customer_id: str) -> Any:
        """Preview the resolution a live transfer would receive, without transferring."""
        from convomem._types import HandoffRouteResponse

        result = await self._http._request(
            "GET",
            "/handoff/route/preview",
            params={"customerId": customer_id},
            response_type=HandoffRouteResponse,
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
