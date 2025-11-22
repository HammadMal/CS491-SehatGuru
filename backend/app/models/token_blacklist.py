from datetime import datetime
from typing import Optional


class TokenBlacklist:
    """
    In-memory token blacklist for logout functionality.

    Note: In production, use Redis or database for distributed systems.
    This simple implementation works for single-server deployments.
    """

    _blacklist = set()

    @classmethod
    def add_token(cls, token: str, expires_at: Optional[datetime] = None):
        """Add token to blacklist"""
        cls._blacklist.add(token)

    @classmethod
    def is_blacklisted(cls, token: str) -> bool:
        """Check if token is blacklisted"""
        return token in cls._blacklist

    @classmethod
    def remove_token(cls, token: str):
        """Remove token from blacklist"""
        cls._blacklist.discard(token)

    @classmethod
    def clear_all(cls):
        """Clear all blacklisted tokens (for testing)"""
        cls._blacklist.clear()
