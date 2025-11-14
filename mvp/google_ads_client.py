"""
Google Ads API Client for fetching ChangeEvent data.
Simplified version for MVP - focuses on 4 resource types.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


class GoogleAdsChangeEventClient:
    """Client for fetching Google Ads ChangeEvent data."""

    # Resource types we support in MVP
    SUPPORTED_RESOURCE_TYPES = [
        'CAMPAIGN_BUDGET',
        'CAMPAIGN',
        'AD_GROUP',
        'AD_GROUP_AD'
    ]

    def __init__(self, config_path: str, customer_id: str):
        """
        Initialize the Google Ads client.

        Args:
            config_path: Path to google-ads.yaml configuration file
            customer_id: Google Ads customer ID (without dashes)
        """
        self.client = GoogleAdsClient.load_from_storage(config_path)
        self.customer_id = customer_id
        self.ga_service = self.client.get_service("GoogleAdsService")

    def get_unwrapped_resource(self, changed_resource) -> Tuple[Optional[str], Any]:
        """
        Unwrap the oneof wrapper from ChangeEvent.old_resource / new_resource.

        Args:
            changed_resource: The protobuf oneof resource wrapper

        Returns:
            Tuple of (resource_type_name, resource_object)
            Returns (None, None) if empty
        """
        fields = changed_resource.ListFields()
        if not fields:
            return None, None
        field_desc, value = fields[0]
        return field_desc.name, value

    def fetch_change_events(
        self,
        days: int = 7,
        resource_types: Optional[List[str]] = None,
        operation: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch ChangeEvent data from Google Ads API.

        Args:
            days: Number of days to look back (default: 7)
            resource_types: List of resource types to fetch (default: all supported)
            operation: Filter by operation type (CREATE/UPDATE/REMOVE, default: all)

        Returns:
            List of parsed change events as dictionaries
        """
        if resource_types is None:
            resource_types = self.SUPPORTED_RESOURCE_TYPES

        # Validate resource types
        for rt in resource_types:
            if rt not in self.SUPPORTED_RESOURCE_TYPES:
                raise ValueError(f"Unsupported resource type: {rt}")

        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
        end_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")

        all_events = []

        # Fetch events for each resource type
        for resource_type in resource_types:
            try:
                events = self._fetch_events_for_type(
                    resource_type,
                    start_date,
                    end_date,
                    operation
                )
                all_events.extend(events)
            except Exception as e:
                print(f"Error fetching {resource_type}: {e}")
                # Continue with other resource types
                continue

        # Sort by timestamp descending
        all_events.sort(key=lambda x: x['timestamp'], reverse=True)

        return all_events

    def _fetch_events_for_type(
        self,
        resource_type: str,
        start_date: str,
        end_date: str,
        operation: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Fetch events for a single resource type."""

        # Build query
        operation_filter = ""
        if operation:
            operation_filter = f"AND change_event.resource_change_operation = '{operation}'"

        query = f"""
            SELECT
              change_event.resource_name,
              change_event.change_date_time,
              change_event.change_resource_name,
              change_event.user_email,
              change_event.client_type,
              change_event.change_resource_type,
              change_event.resource_change_operation,
              change_event.changed_fields,
              change_event.old_resource,
              change_event.new_resource,
              change_event.campaign,
              change_event.ad_group
            FROM change_event
            WHERE change_event.change_resource_type = '{resource_type}'
            {operation_filter}
            AND change_event.change_date_time >= '{start_date}'
            AND change_event.change_date_time <= '{end_date}'
            ORDER BY change_event.change_date_time DESC
            LIMIT 1000
        """

        try:
            response = self.ga_service.search(
                customer_id=self.customer_id,
                query=query
            )

            events = []
            for row in response:
                event = self._parse_change_event(row.change_event)
                if event:
                    events.append(event)

            return events

        except GoogleAdsException as ex:
            print(f"Google Ads API error for {resource_type}:")
            print(f"  Error code: {ex.error.code().name}")
            print(f"  Request ID: {ex.request_id}")
            for error in ex.failure.errors:
                print(f"  - {error.error_code}: {error.message}")
            raise

    def _parse_change_event(self, event) -> Optional[Dict[str, Any]]:
        """
        Parse a ChangeEvent protobuf object into a dictionary.

        Args:
            event: ChangeEvent protobuf object

        Returns:
            Parsed event dictionary or None if parsing fails
        """
        try:
            # Unwrap old and new resources
            old_type, old_resource = self.get_unwrapped_resource(event.old_resource)
            new_type, new_resource = self.get_unwrapped_resource(event.new_resource)

            # Extract field changes
            field_changes = {}
            if old_resource and new_resource:
                field_changes = self._extract_field_changes(
                    old_resource,
                    new_resource,
                    event.changed_fields
                )

            # Generate human-readable summary
            summary = self._generate_summary(
                event.change_resource_type,
                event.resource_change_operation,
                field_changes
            )

            return {
                'timestamp': event.change_date_time,
                'user_email': event.user_email or 'Unknown',
                'resource_type': event.change_resource_type,
                'operation_type': event.resource_change_operation,
                'resource_name': event.change_resource_name,
                'client_type': event.client_type,
                'campaign': event.campaign or '',
                'ad_group': event.ad_group or '',
                'summary': summary,
                'field_changes': field_changes,
                'changed_fields_paths': list(event.changed_fields.paths) if event.changed_fields else []
            }

        except Exception as e:
            print(f"Error parsing event: {e}")
            return None

    def _extract_field_changes(
        self,
        old_resource,
        new_resource,
        changed_fields
    ) -> Dict[str, Dict[str, Any]]:
        """
        Extract field-level changes from old/new resources.

        Returns:
            Dict mapping field names to {old, new, human_readable} values
        """
        changes = {}

        if not changed_fields or not changed_fields.paths:
            return changes

        for field_path in changed_fields.paths:
            # Get field name (last part of path)
            field_name = field_path.split('.')[-1]

            try:
                old_value = getattr(old_resource, field_name, None)
                new_value = getattr(new_resource, field_name, None)

                changes[field_name] = {
                    'old': self._format_value(field_name, old_value),
                    'new': self._format_value(field_name, new_value),
                    'path': field_path
                }
            except Exception as e:
                print(f"Error extracting field {field_path}: {e}")
                continue

        return changes

    def _format_value(self, field_name: str, value: Any) -> Any:
        """Format values for human readability."""
        if value is None:
            return None

        # Convert micros to dollars
        if 'micros' in field_name.lower() and isinstance(value, (int, float)):
            return f"${value / 1_000_000:.2f}"

        # Handle enums
        if hasattr(value, 'name'):
            return value.name

        # Handle nested objects (convert to string)
        if not isinstance(value, (str, int, float, bool, type(None))):
            return str(value)

        return value

    def _generate_summary(
        self,
        resource_type: str,
        operation: str,
        field_changes: Dict[str, Dict[str, Any]]
    ) -> str:
        """Generate human-readable summary of the change."""

        if operation == 'CREATE':
            return f"Created new {resource_type.replace('_', ' ').title()}"

        if operation == 'REMOVE':
            return f"Removed {resource_type.replace('_', ' ').title()}"

        # For UPDATE, describe what changed
        if not field_changes:
            return f"Updated {resource_type.replace('_', ' ').title()}"

        # Describe key changes
        descriptions = []
        for field_name, change in list(field_changes.items())[:3]:  # Show max 3 changes
            old = change['old']
            new = change['new']
            field_label = field_name.replace('_', ' ').title()
            descriptions.append(f"{field_label}: {old} → {new}")

        if len(field_changes) > 3:
            descriptions.append(f"and {len(field_changes) - 3} more changes")

        return "; ".join(descriptions)


def test_client():
    """Simple test function to verify the client works."""
    import os
    from pathlib import Path

    # Get paths
    project_root = Path(__file__).parent.parent
    config_path = project_root / "googletest" / "google-ads.yaml"

    # Load customer ID from env or use default
    customer_id = os.getenv("GOOGLE_ADS_CUSTOMER_ID", "2766411035")

    print(f"Testing Google Ads client...")
    print(f"Config: {config_path}")
    print(f"Customer ID: {customer_id}")

    client = GoogleAdsChangeEventClient(str(config_path), customer_id)

    print("\nFetching last 7 days of changes...")
    events = client.fetch_change_events(days=7)

    print(f"\nFound {len(events)} events")

    # Show first 3
    for i, event in enumerate(events[:3], 1):
        print(f"\n{i}. {event['timestamp']}")
        print(f"   User: {event['user_email']}")
        print(f"   Type: {event['resource_type']}")
        print(f"   Operation: {event['operation_type']}")
        print(f"   Summary: {event['summary']}")


if __name__ == "__main__":
    test_client()
