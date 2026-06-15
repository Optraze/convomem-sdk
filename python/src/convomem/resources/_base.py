from __future__ import annotations


class _BaseResource:
    """Base class for all resource classes."""

    pass


class _BaseCustomersResource(_BaseResource):
    """Shared parameter-building logic for customer operations."""

    @staticmethod
    def _lookup_params(
        *,
        customer_id: str | None = None,
        phone: str | None = None,
        email: str | None = None,
        external_id: str | None = None,
        topic: str | None = None,
        auto_create: str | None = None,
        user_name: str | None = None,
    ) -> dict[str, str]:
        params: dict[str, str] = {}
        if customer_id is not None:
            params["customerId"] = customer_id
        if phone is not None:
            params["phone"] = phone
        if email is not None:
            params["email"] = email
        if external_id is not None:
            params["externalId"] = external_id
        if topic is not None:
            params["topic"] = topic
        if auto_create is not None:
            params["autoCreate"] = auto_create
        if user_name is not None:
            params["userName"] = user_name
        return params

def _pagination_params(
    *, page: int | None = None, limit: int | None = None
) -> dict[str, str]:
    """Build pagination query parameters."""
    params: dict[str, str] = {}
    if page is not None:
        params["page"] = str(page)
    if limit is not None:
        params["limit"] = str(limit)
    return params
