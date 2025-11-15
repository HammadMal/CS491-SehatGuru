from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from app.config.settings import settings
from app.models.auth import TokenData


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token

    Args:
        data: Dictionary containing token payload
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": "access"
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT refresh token

    Args:
        data: Dictionary containing token payload
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": "refresh"
    })

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> TokenData:
    """
    Verify and decode JWT token

    Args:
        token: JWT token string
        token_type: Type of token ("access" or "refresh")

    Returns:
        TokenData object

    Raises:
        JWTError: If token is invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        uid: str = payload.get("sub")
        email: str = payload.get("email")
        payload_token_type: str = payload.get("token_type")

        if uid is None:
            raise JWTError("Token missing subject (uid)")

        if payload_token_type != token_type:
            raise JWTError(f"Invalid token type. Expected {token_type}, got {payload_token_type}")

        return TokenData(uid=uid, email=email, token_type=payload_token_type)

    except JWTError as e:
        raise JWTError(f"Could not validate token: {str(e)}")


def decode_token(token: str) -> Dict:
    """
    Decode JWT token without verification (for debugging)

    Args:
        token: JWT token string

    Returns:
        Decoded token payload
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_signature": False}
        )
        return payload
    except JWTError as e:
        raise JWTError(f"Could not decode token: {str(e)}")


def create_password_reset_token(email: str) -> str:
    """
    Create password reset token

    Args:
        email: User email

    Returns:
        Encoded JWT token for password reset
    """
    expire = datetime.utcnow() + timedelta(hours=1)  # Reset token expires in 1 hour

    to_encode = {
        "sub": email,
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": "password_reset"
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def verify_password_reset_token(token: str) -> str:
    """
    Verify password reset token and return email

    Args:
        token: Password reset token

    Returns:
        Email address from token

    Raises:
        JWTError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        email: str = payload.get("sub")
        token_type: str = payload.get("token_type")

        if email is None:
            raise JWTError("Token missing email")

        if token_type != "password_reset":
            raise JWTError("Invalid token type for password reset")

        return email

    except JWTError as e:
        raise JWTError(f"Invalid or expired reset token: {str(e)}")
