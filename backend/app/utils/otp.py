import random
from datetime import datetime, timedelta
from typing import Optional
from google.cloud.firestore_v1.base_query import FieldFilter
from app.config.firebase import firebase_client
from app.config.settings import settings


class OTPService:
    """Service for managing OTP codes for password reset"""

    OTP_COLLECTION = "password_reset_otps"
    OTP_LENGTH = 6
    OTP_EXPIRY_MINUTES = 10  # OTP valid for 10 minutes

    @staticmethod
    def generate_otp() -> str:
        """
        Generate a 6-digit OTP code

        Returns:
            6-digit OTP as string
        """
        return ''.join([str(random.randint(0, 9)) for _ in range(OTPService.OTP_LENGTH)])

    @staticmethod
    async def store_otp(email: str, otp: str) -> bool:
        """
        Store OTP in Firestore with expiry time

        Args:
            email: User email address
            otp: OTP code to store

        Returns:
            True if stored successfully
        """
        try:
            otp_ref = firebase_client.db.collection(OTPService.OTP_COLLECTION)

            # Delete any existing OTP for this email
            existing_otps = otp_ref.where(filter=FieldFilter("email", "==", email)).stream()
            for doc in existing_otps:
                doc.reference.delete()

            # Store new OTP
            expiry_time = datetime.utcnow() + timedelta(minutes=OTPService.OTP_EXPIRY_MINUTES)

            otp_data = {
                "email": email,
                "otp": otp,
                "created_at": datetime.utcnow(),
                "expires_at": expiry_time,
                "verified": False
            }

            otp_ref.add(otp_data)
            return True

        except Exception as e:
            print(f"Error storing OTP: {str(e)}")
            return False

    @staticmethod
    async def verify_otp(email: str, otp: str) -> bool:
        """
        Verify OTP code for given email

        Args:
            email: User email address
            otp: OTP code to verify

        Returns:
            True if OTP is valid and not expired
        """
        try:
            otp_ref = firebase_client.db.collection(OTPService.OTP_COLLECTION)

            # Find OTP for this email
            otp_query = otp_ref.where(filter=FieldFilter("email", "==", email)).where(filter=FieldFilter("otp", "==", otp)).limit(1).stream()

            otp_docs = list(otp_query)
            if len(otp_docs) == 0:
                return False

            otp_doc = otp_docs[0]
            otp_data = otp_doc.to_dict()

            # Check if already verified
            if otp_data.get("verified"):
                return False

            # Check if expired
            expires_at = otp_data.get("expires_at")
            if expires_at:
                # Convert both to naive datetime for comparison
                now = datetime.utcnow()
                if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo is not None:
                    # expires_at is timezone-aware, convert to naive
                    expires_at = expires_at.replace(tzinfo=None)

                if now > expires_at:
                    # Delete expired OTP
                    otp_doc.reference.delete()
                    return False

            # Mark as verified
            otp_doc.reference.update({"verified": True})

            return True

        except Exception as e:
            print(f"Error verifying OTP: {str(e)}")
            return False

    @staticmethod
    async def check_otp_verified(email: str) -> bool:
        """
        Check if user has a verified OTP (for password reset)

        Args:
            email: User email address

        Returns:
            True if user has a valid verified OTP
        """
        try:
            otp_ref = firebase_client.db.collection(OTPService.OTP_COLLECTION)

            # Find verified OTP for this email
            otp_query = otp_ref.where(filter=FieldFilter("email", "==", email)).where(filter=FieldFilter("verified", "==", True)).limit(1).stream()

            otp_docs = list(otp_query)
            if len(otp_docs) == 0:
                return False

            otp_doc = otp_docs[0]
            otp_data = otp_doc.to_dict()

            # Check if expired
            expires_at = otp_data.get("expires_at")
            if expires_at:
                # Convert both to naive datetime for comparison
                now = datetime.utcnow()
                if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo is not None:
                    # expires_at is timezone-aware, convert to naive
                    expires_at = expires_at.replace(tzinfo=None)

                if now > expires_at:
                    # Delete expired OTP
                    otp_doc.reference.delete()
                    return False

            return True

        except Exception as e:
            print(f"Error checking OTP verification: {str(e)}")
            return False

    @staticmethod
    async def delete_otp(email: str) -> bool:
        """
        Delete OTP for given email (after password reset)

        Args:
            email: User email address

        Returns:
            True if deleted successfully
        """
        try:
            otp_ref = firebase_client.db.collection(OTPService.OTP_COLLECTION)

            # Delete all OTPs for this email
            otps = otp_ref.where(filter=FieldFilter("email", "==", email)).stream()
            for doc in otps:
                doc.reference.delete()

            return True

        except Exception as e:
            print(f"Error deleting OTP: {str(e)}")
            return False

    @staticmethod
    async def cleanup_expired_otps() -> int:
        """
        Delete all expired OTPs (maintenance function)

        Returns:
            Number of OTPs deleted
        """
        try:
            otp_ref = firebase_client.db.collection(OTPService.OTP_COLLECTION)

            # Get all expired OTPs
            now = datetime.utcnow()
            expired_otps = otp_ref.where(filter=FieldFilter("expires_at", "<", now)).stream()

            count = 0
            for doc in expired_otps:
                doc.reference.delete()
                count += 1

            return count

        except Exception as e:
            print(f"Error cleaning up expired OTPs: {str(e)}")
            return 0
