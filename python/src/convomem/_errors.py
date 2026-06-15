from __future__ import annotations

from typing import Any


class ConvoMemError(Exception):
    """Base error for all ConvoMem SDK errors."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ConvoMemApiError(ConvoMemError):
    """HTTP error returned by the ConvoMem API."""

    def __init__(self, status: int, message: str, url: str, body: Any | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.url = url
        self.body = body

    def __repr__(self) -> str:
        return (
            f"ConvoMemApiError(status={self.status!r}, message={self.message!r}, url={self.url!r})"
        )


class ConvoMemConfigError(ConvoMemError):
    """Invalid client configuration."""

    pass


class ConvoMemTimeoutError(ConvoMemError):
    """Request timed out."""

    def __init__(self, message: str, timeout: float) -> None:
        super().__init__(message)
        self.timeout = timeout
