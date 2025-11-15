from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.utils.jwt import verify_token
from app.config.firebase import firebase_client
from app.models.auth import TokenData
from app.models.token_blacklist import TokenBlacklist
from typing import Optional

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """
    Get current user from JWT token

    Args:
        credentials: HTTP Authorization credentials

    Returns:
        TokenData object containing user information

    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials

        # Check if token is blacklisted (logged out)
        if TokenBlacklist.is_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked. Please login again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify JWT token
        token_data = verify_token(token, token_type="access")

        if token_data.uid is None:
            raise credentials_exception

        return token_data

    except HTTPException:
        raise
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    current_user: TokenData = Depends(get_current_user)
) -> dict:
    """
    Get current active user with full user data from Firestore

    Also syncs email_verified status from Firebase Auth to Firestore

    Args:
        current_user: TokenData from get_current_user dependency

    Returns:
        User data dictionary from Firestore

    Raises:
        HTTPException: If user not found or inactive
    """
    try:
        # Get user data from Firestore
        from app.config.settings import settings

        user_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS).document(current_user.uid)
        user_doc = user_ref.get()

        if not user_doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user_data = user_doc.to_dict()
        user_data["uid"] = current_user.uid

        # Check if token was issued before password was changed (session invalidation)
        if current_user.iat and user_data.get("password_changed_at"):
            from datetime import datetime

            # Convert iat (unix timestamp) to datetime (naive UTC)
            token_issued_at = datetime.utcfromtimestamp(current_user.iat)
            password_changed_at = user_data.get("password_changed_at")

            # Convert password_changed_at to naive datetime if it's timezone-aware
            if hasattr(password_changed_at, 'tzinfo') and password_changed_at.tzinfo is not None:
                password_changed_at = password_changed_at.replace(tzinfo=None)

            # If password was changed after token was issued, invalidate the session
            if password_changed_at > token_issued_at:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Your password was changed. Please login again with your new password.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Sync email_verified status from Firebase Auth
        try:
            from datetime import datetime

            firebase_user = firebase_client.get_user(current_user.uid)
            firebase_email_verified = firebase_user.email_verified

            # If status is different, update Firestore
            if user_data.get("email_verified") != firebase_email_verified:
                user_ref.update({
                    "email_verified": firebase_email_verified,
                    "updated_at": datetime.utcnow()
                })
                user_data["email_verified"] = firebase_email_verified
                print(f"✅ Synced email_verified status for user {current_user.uid}: {firebase_email_verified}")
        except Exception as e:
            # Don't fail the request if sync fails, just log it
            print(f"⚠️ Warning: Could not sync email_verified status: {str(e)}")

        return user_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user data: {str(e)}"
        )


async def verify_refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """
    Verify refresh token

    Args:
        credentials: HTTP Authorization credentials

    Returns:
        TokenData object

    Raises:
        HTTPException: If token is invalid or not a refresh token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials

        # Verify JWT token as refresh token
        token_data = verify_token(token, token_type="refresh")

        if token_data.uid is None:
            raise credentials_exception

        return token_data

    except HTTPException:
        raise
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification error: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
