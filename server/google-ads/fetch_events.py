#!/usr/bin/env python3
"""
Python wrapper for fetching Google Ads ChangeEvents
Called by Node.js backend via child_process

Usage:
    python fetch_events.py <customer_id> <days>

Returns:
    JSON array of change events to stdout
"""

import sys
import json
from datetime import datetime, timedelta, timezone
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from google.protobuf.json_format import MessageToDict


def proto_to_dict(proto_obj):
    """Convert protobuf object to Python dict"""
    return MessageToDict(
        proto_obj,
        preserving_proto_field_name=True,
    )


def unwrap_changed_resource(changed_resource):
    """Unwrap ChangedResource oneof wrapper"""
    fields = changed_resource.ListFields()
    if not fields:
        return None, None
    field_desc, value = fields[0]
    return field_desc.name, value


def deep_diff(old, new, prefix=""):
    """Deep recursive diff between two dicts"""
    diffs = {}
    all_keys = set(old.keys()) | set(new.keys())

    for key in all_keys:
        full_key = f"{prefix}.{key}" if prefix else key
        old_val = old.get(key)
        new_val = new.get(key)

        if old_val == new_val:
            continue

        if isinstance(old_val, dict) and isinstance(new_val, dict):
            nested = deep_diff(old_val, new_val, prefix=full_key)
            diffs.update(nested)
            continue

        if isinstance(old_val, list) and isinstance(new_val, list):
            if old_val != new_val:
                diffs[full_key] = {"old": old_val, "new": new_val}
            continue

        diffs[full_key] = {"old": old_val, "new": new_val}

    return diffs


def fetch_change_events(customer_id, days=7):
    """Fetch change events from Google Ads API"""

    # Load client from YAML configuration
    config_path = "googletest/google-ads.yaml"
    client = GoogleAdsClient.load_from_storage(config_path)

    ga_service = client.get_service("GoogleAdsService")

    # Calculate date range
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    end_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")

    # Build GAQL query
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
        WHERE change_event.change_date_time >= '{start_date}'
        AND change_event.change_date_time <= '{end_date}'
        AND change_event.change_resource_type IN (
            'CAMPAIGN_BUDGET',
            'CAMPAIGN',
            'AD_GROUP',
            'AD_GROUP_AD'
        )
        ORDER BY change_event.change_date_time DESC
        LIMIT 10000
    """

    # Get enum types
    ChangeEventResourceTypeEnum = client.get_type("ChangeEventResourceTypeEnum").ChangeEventResourceType
    ResourceChangeOperationEnum = client.get_type("ResourceChangeOperationEnum").ResourceChangeOperation
    ClientTypeEnum = client.get_type("ChangeClientTypeEnum").ChangeClientType

    try:
        response = ga_service.search(customer_id=customer_id, query=query)

        events = []
        for row in response:
            event = row.change_event

            # Convert enums to strings
            resource_type_name = ChangeEventResourceTypeEnum.Name(event.change_resource_type)
            operation_name = ResourceChangeOperationEnum.Name(event.resource_change_operation)
            client_type_name = ClientTypeEnum.Name(event.client_type)

            # Unwrap old/new resources
            old_type, old_proto = unwrap_changed_resource(event.old_resource)
            new_type, new_proto = unwrap_changed_resource(event.new_resource)

            # Convert to dicts for diff
            old_dict = proto_to_dict(old_proto) if old_proto else {}
            new_dict = proto_to_dict(new_proto) if new_proto else {}

            # Calculate field changes
            field_changes = deep_diff(old_dict, new_dict)

            # Extract campaign and ad group names
            campaign = event.campaign if event.campaign else None
            ad_group = event.ad_group if event.ad_group else None

            # Build summary
            summary = f"{operation_name} {resource_type_name}"
            if len(field_changes) > 0:
                changed_fields = list(field_changes.keys())[:3]
                summary += f": {', '.join(changed_fields)}"

            # Create event object matching TypeScript schema
            event_obj = {
                "timestamp": event.change_date_time,
                "userEmail": event.user_email,
                "resourceType": resource_type_name,
                "operationType": operation_name,
                "resourceName": event.change_resource_name,
                "clientType": client_type_name,
                "campaign": campaign,
                "adGroup": ad_group,
                "summary": summary,
                "fieldChanges": field_changes,
                "changedFieldsPaths": list(event.changed_fields.paths) if event.changed_fields else [],
            }

            events.append(event_obj)

        return events

    except GoogleAdsException as ex:
        error_msg = {
            "error": True,
            "code": ex.error.code().name,
            "request_id": ex.request_id,
            "messages": [f"{err.error_code}: {err.message}" for err in ex.failure.errors]
        }
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)
    except Exception as ex:
        error_msg = {
            "error": True,
            "message": str(ex)
        }
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": True, "message": "Usage: fetch_events.py <customer_id> [days]"}), file=sys.stderr)
        sys.exit(1)

    customer_id = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7

    events = fetch_change_events(customer_id, days)

    # Output JSON to stdout
    print(json.dumps(events, default=str))
