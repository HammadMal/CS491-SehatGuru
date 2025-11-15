from datetime import datetime
from typing import Optional, Dict
from fastapi import HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests
from app.config.firebase import firebase_client
from app.config.settings import settings
from app.utils.password import hash_password, verify_password
from app.utils.jwt import (
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    verify_password_reset_token
)
from app.utils.email import send_verification_email, send_password_reset_email
from app.models.auth import UserRegister, UserLogin, Token


class AuthService:
    """Authentication service for handling user auth operations"""

    @staticmethod
    async def register_user(user_data: UserRegister) -> Dict:
        """
        Register a new user with email and password

        Args:
            user_data: User registration data

        Returns:
            User data dictionary

        Raises:
            HTTPException: If user already exists or registration fails
        """
        try:
            # Check if user already exists in Firestore
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            existing_user = users_ref.where("email", "==", user_data.email).limit(1).get()

            if len(list(existing_user)) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

            # Create Firebase Auth user
            firebase_user = firebase_client.create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=user_data.full_name
            )

            # Hash password for server-side verification
            hashed_password = hash_password(user_data.password)

            # Create user document in Firestore
            now = datetime.utcnow()
            user_doc_data = {
                "email": user_data.email,
                "full_name": user_data.full_name,
                "email_verified": False,
                "created_at": now,
                "updated_at": now,
                "auth_provider": "email",
                "hashed_password": hashed_password,  # Store for server-side verification
                "password_changed_at": now,  # Track when password was set/changed
            }

            users_ref.document(firebase_user.uid).set(user_doc_data)

            # Generate email verification link
            try:
                verification_link = firebase_client.generate_email_verification_link(user_data.email)
                # Send verification email
                await send_verification_email(user_data.email, verification_link)
            except Exception as e:
                print(f"Error sending verification email: {str(e)}")
                # Don't fail registration if email fails

            return {
                "uid": firebase_user.uid,
                "email": firebase_user.email,
                "full_name": user_data.full_name,
                "email_verified": False,
                "created_at": user_doc_data["created_at"]
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {str(e)}"
            )

    @staticmethod
    async def login_user(login_data: UserLogin) -> Token:
        """
        Login user with email and password

        Args:
            login_data: User login credentials

        Returns:
            Token object with access and refresh tokens

        Raises:
            HTTPException: If credentials are invalid
        """
        try:
            # Get user from Firestore
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            user_query = users_ref.where("email", "==", login_data.email).limit(1).get()

            users_list = list(user_query)
            if len(users_list) == 0:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            user_doc = users_list[0]
            user_data = user_doc.to_dict()
            uid = user_doc.id

            # Verify password (server-side verification)
            stored_password = user_data.get("hashed_password")

            if not stored_password:
                # User might have registered with Google OAuth
                if user_data.get("auth_provider") == "google":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This account uses Google Sign-In. Please login with Google."
                    )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            # Verify the password
            if not verify_password(login_data.password, stored_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            # Update last login timestamp
            users_ref.document(uid).update({
                "last_login": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

            # Create JWT tokens
            token_data = {"sub": uid, "email": login_data.email}
            access_token = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data)

            return Token(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Login failed: {str(e)}"
            )

    @staticmethod
    async def google_auth(id_token_str: str) -> Token:
        """
        Authenticate user with Google OAuth

        Args:
            id_token_str: Google ID token from client

        Returns:
            Token object with access and refresh tokens

        Raises:
            HTTPException: If authentication fails
        """
        try:
            # Verify Google ID token
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            # Extract user info
            email = idinfo.get("email")
            name = idinfo.get("name")
            google_uid = idinfo.get("sub")
            picture = idinfo.get("picture")

            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email not provided by Google"
                )

            # Check if user exists
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            existing_user = users_ref.where("email", "==", email).limit(1).get()

            existing_users_list = list(existing_user)

            if len(existing_users_list) > 0:
                # User exists, log them in
                user_doc = existing_users_list[0]
                uid = user_doc.id
                user_data = user_doc.to_dict()

                # Update last login
                users_ref.document(uid).update({
                    "updated_at": datetime.utcnow()
                })

            else:
                # Create new user
                try:
                    firebase_user = firebase_client.create_user(
                        email=email,
                        display_name=name,
                        email_verified=True,  # Google already verified
                        photo_url=picture
                    )
                    uid = firebase_user.uid
                except Exception as e:
                    # User might exist in Firebase Auth but not Firestore
                    # Try to get existing user
                    try:
                        firebase_user = firebase_client.get_auth().get_user_by_email(email)
                        uid = firebase_user.uid
                    except:
                        raise e

                # Create user document in Firestore
                user_doc_data = {
                    "email": email,
                    "full_name": name,
                    "email_verified": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "auth_provider": "google",
                    "photo_url": picture,
                    "google_uid": google_uid
                }

                users_ref.document(uid).set(user_doc_data)

            # Create JWT tokens
            token_data = {"sub": uid, "email": email}
            access_token = create_access_token(token_data)
            refresh_token_str = create_refresh_token(token_data)

            return Token(
                access_token=access_token,
                refresh_token=refresh_token_str,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google authentication failed: {str(e)}"
            )

    @staticmethod
    async def refresh_access_token(uid: str, email: str) -> Token:
        """
        Refresh access token using refresh token

        Args:
            uid: User ID
            email: User email

        Returns:
            New Token object
        """
        token_data = {"sub": uid, "email": email}
        access_token = create_access_token(token_data)
        refresh_token_str = create_refresh_token(token_data)

        return Token(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    @staticmethod
    async def request_password_reset(email: str) -> bool:
        """
        Request password reset

        Args:
            email: User email

        Returns:
            True if email sent successfully

        Raises:
            HTTPException: If user not found
        """
        try:
            # Check if user exists
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            user_query = users_ref.where("email", "==", email).limit(1).get()

            if len(list(user_query)) == 0:
                # Don't reveal if user exists or not for security
                return True

            # Generate password reset token
            reset_token = create_password_reset_token(email)

            # Create reset link
            reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

            # Send password reset email
            await send_password_reset_email(email, reset_link)

            return True

        except Exception as e:
            print(f"Error requesting password reset: {str(e)}")
            return True  # Don't reveal errors for security

    @staticmethod
    async def reset_password(token: str, new_password: str) -> bool:
        """
        Reset user password

        Args:
            token: Password reset token
            new_password: New password

        Returns:
            True if password reset successfully

        Raises:
            HTTPException: If token is invalid or reset fails
        """
        try:
            # Verify reset token
            email = verify_password_reset_token(token)

            # Get user
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            user_query = users_ref.where("email", "==", email).limit(1).get()

            users_list = list(user_query)
            if len(users_list) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            user_doc = users_list[0]
            uid = user_doc.id
            user_data = user_doc.to_dict()

            # Check if user registered with email/password
            if user_data.get("auth_provider") == "google":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This account uses Google Sign-In. Password cannot be reset."
                )

            # Update password in Firebase Auth
            firebase_client.update_user(uid, password=new_password)

            # Hash new password and update in Firestore
            # Also update password_changed_at to invalidate all existing sessions
            now = datetime.utcnow()
            new_hashed_password = hash_password(new_password)
            users_ref.document(uid).update({
                "hashed_password": new_hashed_password,
                "password_changed_at": now,  # This will invalidate all existing tokens
                "updated_at": now
            })

            return True

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password reset failed: {str(e)}"
            )

    @staticmethod
    async def delete_user_account(uid: str) -> bool:
        """
        Delete user account

        Args:
            uid: User ID

        Returns:
            True if deleted successfully

        Raises:
            HTTPException: If deletion fails
        """
        try:
            # Delete from Firebase Auth
            firebase_client.delete_user(uid)

            # Delete from Firestore
            users_ref = firebase_client.db.collection(settings.FIRESTORE_COLLECTION_USERS)
            users_ref.document(uid).delete()

            # TODO: Delete related data (food logs, meal plans, etc.)

            return True

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Account deletion failed: {str(e)}"
            )
