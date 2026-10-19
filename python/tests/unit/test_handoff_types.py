"""Handoff response parsing against the server's actual narrativeSource values."""

import pytest

from convomem._types import HandoffResponse


@pytest.mark.parametrize("source", ["llm", "fallback", "skipped", "pending"])
def test_handoff_response_accepts_every_server_narrative_source(source: str) -> None:
    # The server returns "pending" on the normal request path while the AI
    # narrative is generated for the next read; parsing must not fail on it.
    handoff = HandoffResponse.model_validate(
        {
            "found": True,
            "journey": [],
            "keyMemories": [],
            "sentimentTrend": {"direction": "stable", "points": []},
            "openIssue": {"isOpen": False},
            "narrative": "Returning customer with no open issue.",
            "narrativeSource": source,
        }
    )
    assert handoff.narrative_source == source


def test_handoff_sentiment_points_match_the_server_shape() -> None:
    # The server sends {at, channel, sentiment}; the old model required
    # {timestamp, score} and failed for every customer with sentiment history.
    handoff = HandoffResponse.model_validate(
        {
            "found": True,
            "journey": [],
            "keyMemories": [],
            "sentimentTrend": {
                "direction": "declining",
                "current": -0.4,
                "points": [
                    {"at": "2026-10-01T10:00:00.000Z", "channel": "VOICE", "sentiment": 0.2},
                    {"at": "2026-10-08T10:00:00.000Z", "channel": "CHAT", "sentiment": -0.4},
                ],
            },
            "openIssue": {"isOpen": True},
            "narrativeSource": "pending",
        }
    )
    assert handoff.sentiment_trend.points is not None
    assert [point.sentiment for point in handoff.sentiment_trend.points] == [0.2, -0.4]
    assert handoff.sentiment_trend.points[1].channel == "CHAT"
