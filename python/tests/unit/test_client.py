from __future__ import annotations

import pytest
import respx
from httpx import Response

from convomem import (
    CaptureRequest,
    ConvoMemClient,
    CustomerCreateRequest,
)
from convomem._errors import ConvoMemApiError


@pytest.fixture
def client() -> ConvoMemClient:
    return ConvoMemClient(api_key="test-key")


class TestClientConstruction:
    def test_creates_client_with_default_base_url(self, client: ConvoMemClient):
        assert client._base_url == "https://api.convomem.com/api/v1"

    def test_creates_client_with_custom_base_url(self):
        client = ConvoMemClient(api_key="test-key", base_url="https://custom.api.com/v1")
        assert client._base_url == "https://custom.api.com/v1"

    def test_strips_trailing_slash(self):
        client = ConvoMemClient(api_key="test-key", base_url="https://custom.api.com/v1/")
        assert client._base_url == "https://custom.api.com/v1"

    def test_context_manager(self):
        with ConvoMemClient(api_key="test-key") as client:
            assert client._api_key == "test-key"


class TestCapture:
    @respx.mock
    def test_capture_sends_post(self, client: ConvoMemClient):
        respx.post("https://api.convomem.com/api/v1/capture").mock(
            return_value=Response(
                200,
                json={
                    "conversationId": "conv-123",
                    "customerId": "cust-456",
                    "status": "new",
                    "isNewConversation": True,
                    "isNewCustomer": True,
                },
            )
        )

        result = client.capture(
            CaptureRequest(message="Hello", email="test@example.com", channel="CHAT")
        )

        assert result.conversation_id == "conv-123"
        assert result.customer_id == "cust-456"
        assert result.is_new_conversation is True

    @respx.mock
    def test_capture_sends_api_key_header(self, client: ConvoMemClient):
        route = respx.post("https://api.convomem.com/api/v1/capture").mock(
            return_value=Response(
                200,
                json={
                    "conversationId": "conv-1",
                    "customerId": "cust-1",
                    "status": "new",
                    "isNewConversation": False,
                    "isNewCustomer": False,
                },
            )
        )

        client.capture(CaptureRequest(message="Test"))

        assert route.calls[0].request.headers["X-API-Key"] == "test-key"


class TestCustomers:
    @respx.mock
    def test_list_customers(self, client: ConvoMemClient):
        respx.get("https://api.convomem.com/api/v1/customers").mock(
            return_value=Response(
                200,
                json={
                    "customers": [{"id": "cust-1", "name": "Alice"}],
                    "page": 1,
                    "limit": 20,
                    "total": 1,
                },
            )
        )

        result = client.customers.list()

        assert len(result.customers) == 1
        assert result.customers[0].id == "cust-1"

    @respx.mock
    def test_get_customer(self, client: ConvoMemClient):
        respx.get("https://api.convomem.com/api/v1/customers/cust-123").mock(
            return_value=Response(
                200,
                json={"id": "cust-123", "name": "Bob", "email": "bob@example.com"},
            )
        )

        result = client.customers.get("cust-123")

        assert result.id == "cust-123"
        assert result.name == "Bob"

    @respx.mock
    def test_create_customer(self, client: ConvoMemClient):
        respx.post("https://api.convomem.com/api/v1/customers").mock(
            return_value=Response(
                201,
                json={"id": "cust-new", "name": "New User", "email": "new@example.com"},
            )
        )

        result = client.customers.create(
            CustomerCreateRequest(name="New User", email="new@example.com")
        )

        assert result.id == "cust-new"

    @respx.mock
    def test_delete_customer(self, client: ConvoMemClient):
        respx.delete("https://api.convomem.com/api/v1/customers/cust-123").mock(
            return_value=Response(204)
        )

        client.customers.delete("cust-123")  # Should not raise

    @respx.mock
    def test_api_error(self, client: ConvoMemClient):
        respx.get("https://api.convomem.com/api/v1/customers/bad-id").mock(
            return_value=Response(404, json={"error": "Not found"})
        )

        with pytest.raises(ConvoMemApiError) as exc_info:
            client.customers.get("bad-id")

        assert exc_info.value.status == 404


class TestMemories:
    @respx.mock
    def test_list_memories(self, client: ConvoMemClient):
        respx.get("https://api.convomem.com/api/v1/customers/cust-1/memories").mock(
            return_value=Response(
                200,
                json={
                    "memories": [{"id": "mem-1", "fact": "Test fact"}],
                    "page": 1,
                    "limit": 20,
                    "total": 1,
                },
            )
        )

        result = client.memories.list("cust-1")

        assert len(result.memories) == 1
        assert result.memories[0].id == "mem-1"

    @respx.mock
    def test_ingest_memories(self, client: ConvoMemClient):
        respx.post("https://api.convomem.com/api/v1/customers/cust-1/memories/ingest").mock(
            return_value=Response(
                200,
                json={"captureId": "cap-123", "status": "queued"},
            )
        )

        from convomem import MemoryIngestRequest, Message

        result = client.memories.ingest(
            "cust-1",
            MemoryIngestRequest(messages=[Message(role="user", content="Test")]),
        )

        assert result.capture_id == "cap-123"


class TestConversations:
    @respx.mock
    def test_start_conversation(self, client: ConvoMemClient):
        respx.post("https://api.convomem.com/api/v1/customers/cust-1/conversations").mock(
            return_value=Response(
                200,
                json={"id": "conv-1", "channel": "CHAT", "status": "ACTIVE"},
            )
        )

        result = client.conversations.start("cust-1", "CHAT")

        assert result.id == "conv-1"
        assert result.status == "ACTIVE"

    @respx.mock
    def test_list_conversations(self, client: ConvoMemClient):
        respx.get("https://api.convomem.com/api/v1/customers/cust-1/conversations").mock(
            return_value=Response(
                200,
                json={
                    "conversations": [{"id": "conv-1", "channel": "CHAT", "status": "ACTIVE"}],
                    "page": 1,
                    "limit": 20,
                    "total": 1,
                },
            )
        )

        result = client.conversations.list("cust-1")

        assert len(result.conversations) == 1


class TestEmbed:
    @respx.mock
    def test_create_token(self, client: ConvoMemClient):
        respx.post("https://api.convomem.com/api/v1/embed/tokens").mock(
            return_value=Response(
                200,
                json={"token": "embed-abc", "expiresIn": 3600, "scope": "handoff:read"},
            )
        )

        from convomem import EmbedTokenRequest

        result = client.embed.create_token(EmbedTokenRequest(customer_id="cust-1"))

        assert result.token == "embed-abc"
        assert result.expires_in == 3600
