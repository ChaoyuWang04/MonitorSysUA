"""
Email notification module for AppsFlyer sync failures.

This module provides email notification functionality when AppsFlyer data sync fails.
Configure SMTP settings via environment variables (see .env.example).

Usage:
    from email_notifier import send_failure_notification, is_email_configured

    if is_email_configured():
        send_failure_notification(
            sync_type='events',
            date_range='2025-01-01 to 2025-01-02',
            error_message='API rate limit exceeded',
            records_processed=0
        )
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def get_smtp_config() -> dict:
    """
    Get SMTP configuration from environment variables.

    Returns:
        dict with SMTP configuration:
        - host: SMTP server hostname
        - port: SMTP server port (default 587)
        - user: SMTP username
        - password: SMTP password
        - from_addr: Sender email address
        - to_addr: Recipient email address
    """
    return {
        'host': os.getenv('SMTP_HOST'),
        'port': int(os.getenv('SMTP_PORT', '587')),
        'user': os.getenv('SMTP_USER'),
        'password': os.getenv('SMTP_PASSWORD'),
        'from_addr': os.getenv('SMTP_FROM'),
        'to_addr': os.getenv('SMTP_TO'),
    }


def is_email_configured() -> bool:
    """
    Check if all required email configuration is present.

    Returns:
        True if all required SMTP settings are configured, False otherwise.
    """
    config = get_smtp_config()
    required = ['host', 'user', 'password', 'from_addr', 'to_addr']
    return all(config.get(key) for key in required)


def send_failure_notification(
    sync_type: str,
    date_range: str,
    error_message: str,
    records_processed: int = 0
) -> bool:
    """
    Send email notification when AppsFlyer sync fails.

    Args:
        sync_type: Type of sync that failed ('events', 'cohort_kpi', 'baseline')
        date_range: Date range that was being synced
        error_message: Error message from the failure
        records_processed: Number of records processed before failure

    Returns:
        True if email was sent successfully, False otherwise.
    """
    if not is_email_configured():
        logger.warning("Email not configured, skipping notification")
        return False

    config = get_smtp_config()

    subject = f"[MonitorSysUA] AppsFlyer {sync_type} Sync Failed"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        h2 {{ color: #d32f2f; margin-bottom: 20px; }}
        table {{ border-collapse: collapse; width: 100%; margin-bottom: 20px; }}
        td {{ padding: 12px; border: 1px solid #e0e0e0; }}
        td:first-child {{ background: #f5f5f5; font-weight: 600; width: 150px; }}
        .error {{ color: #d32f2f; }}
        pre {{ background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 0; white-space: pre-wrap; word-wrap: break-word; }}
        .footer {{ color: #666; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; }}
        code {{ background: #e8e8e8; padding: 2px 6px; border-radius: 3px; font-family: monospace; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>AppsFlyer Sync Failed</h2>

        <table>
            <tr>
                <td>Sync Type</td>
                <td>{sync_type}</td>
            </tr>
            <tr>
                <td>Date Range</td>
                <td>{date_range}</td>
            </tr>
            <tr>
                <td>Records Processed</td>
                <td>{records_processed:,}</td>
            </tr>
            <tr>
                <td>Time (UTC)</td>
                <td>{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}</td>
            </tr>
            <tr>
                <td>Error</td>
                <td class="error">
                    <pre>{error_message}</pre>
                </td>
            </tr>
        </table>

        <div class="footer">
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Check container logs: <code>just af-docker-logs</code></li>
                <li>View sync log: <code>just af-docker-sync-logs</code></li>
                <li>Retry manually: <code>just af-docker-sync-yesterday</code></li>
                <li>Check database: <code>just af-status</code></li>
            </ul>
            <p style="color: #999; font-size: 12px;">
                This is an automated notification from MonitorSysUA AppsFlyer ETL.
            </p>
        </div>
    </div>
</body>
</html>
"""

    # Plain text fallback
    text_body = f"""
AppsFlyer Sync Failed

Sync Type: {sync_type}
Date Range: {date_range}
Records Processed: {records_processed:,}
Time (UTC): {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}

Error:
{error_message}

Next Steps:
- Check container logs: just af-docker-logs
- View sync log: just af-docker-sync-logs
- Retry manually: just af-docker-sync-yesterday
- Check database: just af-status
"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = config['from_addr']
    msg['To'] = config['to_addr']
    msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(config['host'], config['port']) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.send_message(msg)
        logger.info(f"Failure notification sent to {config['to_addr']}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def send_success_notification(
    sync_type: str,
    date_range: str,
    records_processed: int,
    duration_seconds: float = 0
) -> bool:
    """
    Send email notification when AppsFlyer sync succeeds (optional, disabled by default).

    This function is provided for completeness but typically not needed for successful syncs.
    Enable by setting SMTP_NOTIFY_SUCCESS=true in environment.

    Args:
        sync_type: Type of sync ('events', 'cohort_kpi', 'baseline')
        date_range: Date range that was synced
        records_processed: Number of records processed
        duration_seconds: How long the sync took

    Returns:
        True if email was sent successfully, False otherwise.
    """
    if not os.getenv('SMTP_NOTIFY_SUCCESS', '').lower() in ('true', '1', 'yes'):
        return False

    if not is_email_configured():
        return False

    config = get_smtp_config()

    subject = f"[MonitorSysUA] AppsFlyer {sync_type} Sync Complete"

    duration_str = f"{duration_seconds:.1f}s" if duration_seconds > 0 else "N/A"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        h2 {{ color: #388e3c; }}
        table {{ border-collapse: collapse; width: 100%; }}
        td {{ padding: 10px; border: 1px solid #e0e0e0; }}
        td:first-child {{ background: #f5f5f5; font-weight: 600; width: 150px; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>AppsFlyer Sync Complete</h2>
        <table>
            <tr><td>Sync Type</td><td>{sync_type}</td></tr>
            <tr><td>Date Range</td><td>{date_range}</td></tr>
            <tr><td>Records Processed</td><td>{records_processed:,}</td></tr>
            <tr><td>Duration</td><td>{duration_str}</td></tr>
            <tr><td>Time (UTC)</td><td>{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}</td></tr>
        </table>
    </div>
</body>
</html>
"""

    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = config['from_addr']
    msg['To'] = config['to_addr']
    msg.attach(MIMEText(html_body, 'html'))

    try:
        with smtplib.SMTP(config['host'], config['port']) as server:
            server.starttls()
            server.login(config['user'], config['password'])
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send success notification: {e}")
        return False
