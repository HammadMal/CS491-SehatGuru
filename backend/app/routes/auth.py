from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.auth import (
    UserRegister,
    UserLogin,
    Token,
    GoogleAuthRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    EmailVerificationRequest,
    UserResponse,
    MessageResponse
)
from app.services.auth_service import AuthService
from app.middleware.auth import get_current_user, get_current_active_user, verify_refresh_token
from app.models.auth import TokenData
from app.models.token_blacklist import TokenBlacklist

security = HTTPBearer()

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """
    Register a new user with email and password

    - **full_name**: User's full name (2-100 characters)
    - **email**: Valid email address
    - **password**: Password (minimum 6 characters)

    Returns user data with UID and sends verification email
    """
    user = await AuthService.register_user(user_data)
    return user


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """
    Login with email and password

    - **email**: User's email address
    - **password**: User's password

    Returns JWT access token and refresh token
    """
    token = await AuthService.login_user(login_data)
    return token


@router.post("/google", response_model=Token)
async def google_auth(auth_request: GoogleAuthRequest):
    """
    Authenticate with Google OAuth

    - **id_token**: Google ID token from client-side OAuth flow

    Returns JWT access token and refresh token.
    Creates new user if doesn't exist.
    """
    token = await AuthService.google_auth(auth_request.id_token)
    return token


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: TokenData = Depends(verify_refresh_token)):
    """
    Refresh access token using refresh token

    Requires valid refresh token in Authorization header.
    Returns new access token and refresh token.
    """
    token = await AuthService.refresh_access_token(token_data.uid, token_data.email)
    return token


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """
    Get current user information

    Requires valid access token in Authorization header.
    Returns full user profile data.
    """
    return UserResponse(
        uid=current_user["uid"],
        email=current_user["email"],
        full_name=current_user.get("full_name"),
        email_verified=current_user.get("email_verified", False),
        created_at=current_user.get("created_at"),
        photo_url=current_user.get("photo_url")
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: PasswordResetRequest):
    """
    Request password reset

    - **email**: User's email address

    Sends password reset email with reset link (expires in 1 hour).
    Returns success message even if email doesn't exist (security).
    """
    await AuthService.request_password_reset(request.email)
    return MessageResponse(
        message="If the email exists, a password reset link has been sent.",
        success=True
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: PasswordResetConfirm):
    """
    Reset password with token

    - **token**: Password reset token from email
    - **new_password**: New password (minimum 6 characters)

    Resets user password and returns success message.
    """
    await AuthService.reset_password(request.token, request.new_password)
    return MessageResponse(
        message="Password has been reset successfully.",
        success=True
    )


@router.post("/verify-email", response_model=MessageResponse)
async def request_email_verification(request: EmailVerificationRequest):
    """
    Request email verification link

    - **email**: User's email address

    Sends verification email with verification link.
    """
    from app.config.firebase import firebase_client
    from app.utils.email import send_verification_email

    try:
        verification_link = firebase_client.generate_email_verification_link(request.email)
        await send_verification_email(request.email, verification_link)

        return MessageResponse(
            message="Verification email has been sent.",
            success=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification email: {str(e)}"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Logout user by invalidating the current access token

    Requires valid access token in Authorization header.
    Adds the token to a blacklist so it can no longer be used.

    **Note:** Client should also delete stored tokens (access & refresh).
    """
    token = credentials.credentials

    # Add token to blacklist
    TokenBlacklist.add_token(token)

    return MessageResponse(
        message="Logged out successfully. Token has been revoked.",
        success=True
    )


@router.delete("/delete-account", response_model=MessageResponse)
async def delete_account(current_user: TokenData = Depends(get_current_user)):
    """
    Delete user account

    Requires valid access token in Authorization header.
    Permanently deletes user account and all associated data.
    """
    await AuthService.delete_user_account(current_user.uid)
    return MessageResponse(
        message="Account has been deleted successfully.",
        success=True
    )


@router.delete("/admin/delete-user-by-email/{email}", response_model=MessageResponse)
async def admin_delete_user_by_email(email: str):
    """
    **ADMIN ONLY - FOR DEVELOPMENT**

    Delete user by email from both Firebase Auth and Firestore.
    Use this to clean up test users during development.

    **WARNING:** Remove this endpoint in production!
    """
    from app.config.firebase import firebase_client
    from app.config.settings import settings

    try:
        # Get user by email from Firebase Auth
        try:
            user = firebase_client.get_auth().get_user_by_email(email)
            uid = user.uid

            # Delete from Firebase Auth
            firebase_client.delete_user(uid)

            # Delete from Firestore
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            users_ref.document(uid).delete()

            return MessageResponse(
                message=f"User {email} deleted from Firebase Auth and Firestore",
                success=True
            )
        except Exception as e:
            if "USER_NOT_FOUND" in str(e):
                return MessageResponse(
                    message=f"User {email} not found in Firebase Auth",
                    success=False
                )
            raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "authentication"}
