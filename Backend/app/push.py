import json
import logging

from pywebpush import WebPushException, webpush

from app.config import get_settings
from app.models import PushSubscription

logger = logging.getLogger("lexis.push")


def generate_vapid_keys() -> tuple[str, str]:
    from cryptography.hazmat.primitives import serialization
    from py_vapid import Vapid
    from py_vapid.utils import b64urlencode

    vapid = Vapid()
    vapid.generate_keys()
    private = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
    public = vapid.public_key.public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return b64urlencode(public), b64urlencode(private)


def send_web_pushes(
    subscriptions: list[PushSubscription],
    title: str,
    body: str,
    url: str,
) -> tuple[int, list[str]]:
    settings = get_settings()
    payload = json.dumps({"title": title, "body": body, "url": url})
    delivered = 0
    gone: list[str] = []
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_mailto},
                ttl=60 * 60,
            )
            delivered += 1
        except WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                gone.append(sub.id)
            else:
                logger.exception("push failed for subscription %s", sub.id)
        except Exception:
            logger.exception("push failed for subscription %s", sub.id)
    return delivered, gone


def main() -> int:
    public, private = generate_vapid_keys()
    print(f"VAPID_PUBLIC_KEY={public}")
    print(f"VAPID_PRIVATE_KEY={private}")
    print("VAPID_SUBJECT=mailto:voce@gmail.com")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
