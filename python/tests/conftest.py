from __future__ import annotations

import pytest

from convomem import AsyncConvoMemClient, ConvoMemClient


@pytest.fixture
def client() -> ConvoMemClient:
    """Create a sync test client."""
    return ConvoMemClient(api_key="test-key")


@pytest.fixture
async def async_client() -> AsyncConvoMemClient:
    """Create an async test client."""
    return AsyncConvoMemClient(api_key="test-key")


@pytest.fixture
def api_url() -> str:
    return "https://api.convomem.com/api/v1"
