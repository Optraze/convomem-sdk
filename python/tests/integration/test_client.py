from __future__ import annotations

import os
import time

import pytest

from convomem import (
    CaptureRequest,
    ConvoMemClient,
    CustomerCreateRequest,
)

pytestmark = pytest.mark.integration

API_KEY = os.environ.get("CONVOMEM_API_KEY")


@pytest.fixture
def client() -> ConvoMemClient:
    if not API_KEY:
        pytest.skip("CONVOMEM_API_KEY not set")
    return ConvoMemClient(api_key=API_KEY)


def _unique_suffix() -> str:
    return f"{os.getpid()}-{int(time.time())}"


class TestCaptureIntegration:
    def test_capture_roundtrip(self, client: ConvoMemClient):
        result = client.capture(
            CaptureRequest(
                message="Integration test message",
                email=f"integ-{_unique_suffix()}@example.com",
                channel="CHAT",
            )
        )
        assert result.conversation_id
        assert result.customer_id


class TestCustomerIntegration:
    def test_customer_crud(self, client: ConvoMemClient):
        suffix = _unique_suffix()

        # Create
        created = client.customers.create(
            CustomerCreateRequest(name=f"Test {suffix}", email=f"test-{suffix}@example.com")
        )
        assert created.id

        # Get
        fetched = client.customers.get(created.id)
        assert fetched.id == created.id

        # List
        result = client.customers.list()
        assert result.customers  # May or may not contain our customer

        # Cleanup
        client.customers.delete(created.id)


class TestMemoryIntegration:
    def test_memory_lookup(self, client: ConvoMemClient):
        suffix = _unique_suffix()

        # Create customer with external_id
        created = client.customers.create(
            CustomerCreateRequest(
                name=f"Mem Test {suffix}",
                external_id=f"mem-test-{suffix}",
            )
        )

        # Lookup memories (may be empty)
        result = client.memories.list(created.id)
        assert result.memories is not None

        # Cleanup
        client.customers.delete(created.id)


class TestConversationIntegration:
    def test_conversation_lifecycle(self, client: ConvoMemClient):
        suffix = _unique_suffix()

        # Create customer with email
        created = client.customers.create(
            CustomerCreateRequest(
                name=f"Conv Test {suffix}",
                email=f"conv-{suffix}@example.com",
            )
        )

        # Start conversation
        conv = client.conversations.start(created.id, "CHAT")
        assert conv.status == "ACTIVE"

        # List conversations
        result = client.conversations.list(created.id)
        assert any(c.id == conv.id for c in result.conversations)

        # Cleanup
        client.customers.delete(created.id)
