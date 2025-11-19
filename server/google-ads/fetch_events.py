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


def format_micros_to_currency(micros_value, currency='USD'):
    """Convert micros (1/1,000,000 currency units) to formatted currency string"""
    if micros_value is None:
        return None

    # Convert to int/float if it's a string
    try:
        if isinstance(micros_value, str):
            micros_value = float(micros_value)
        micros_value = float(micros_value)
    except (ValueError, TypeError):
        return None

    # Currency symbol mapping
    currency_symbols = {
        'USD': '$',
        'CNY': '¥',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'KRW': '₩',
    }

    symbol = currency_symbols.get(currency, '$')
    amount = micros_value / 1_000_000
    return f"{symbol}{amount:,.2f}"


def generate_chinese_summary(resource_type, operation_type, field_changes, currency='USD'):
    """Generate user-friendly Chinese summary for change events"""

    # Resource type translations
    resource_zh = {
        'CAMPAIGN_BUDGET': '广告系列预算',
        'CAMPAIGN': '广告系列',
        'AD_GROUP': '广告组',
        'AD_GROUP_AD': '广告',
        'AD_GROUP_CRITERION': '广告组条件',
        'KEYWORD': '关键字',
    }

    # Operation type translations
    operation_zh = {
        'CREATE': '创建',
        'UPDATE': '更新',
        'REMOVE': '删除',
    }

    # Field name translations
    field_zh = {
        'amount_micros': '预算',
        'name': '名称',
        'status': '状态',
        'cpc_bid_micros': '每次点击费用',
        'cpm_bid_micros': '每千次展示费用',
        'target_cpa_micros': '目标每次转化费用',
        'target_roas': '目标广告支出回报率',
        'url': '网址',
        'headline': '标题',
        'description': '描述',
        'final_urls': '最终网址',
    }

    # Status value translations
    status_zh = {
        'ENABLED': '已启用',
        'PAUSED': '已暂停',
        'REMOVED': '已移除',
        'UNKNOWN': '未知',
        'UNSPECIFIED': '未指定',
    }

    resource_name = resource_zh.get(resource_type, resource_type)
    operation_name = operation_zh.get(operation_type, operation_type)

    # CREATE/REMOVE operations - simple summary
    if operation_type == 'CREATE':
        return f"{operation_name}了{resource_name}"

    if operation_type == 'REMOVE':
        return f"{operation_name}了{resource_name}"

    # UPDATE operations - detailed summaries
    if operation_type == 'UPDATE':
        # Special handling for CAMPAIGN_BUDGET amount changes
        if resource_type == 'CAMPAIGN_BUDGET' and 'amount_micros' in field_changes:
            old_val = field_changes['amount_micros'].get('old')
            new_val = field_changes['amount_micros'].get('new')
            if old_val is not None and new_val is not None:
                old_amount = format_micros_to_currency(old_val, currency)
                new_amount = format_micros_to_currency(new_val, currency)
                return f"预算从 {old_amount} 更改为 {new_amount}"

        # Handle name changes
        if 'name' in field_changes:
            old_name = field_changes['name'].get('old', '')
            new_name = field_changes['name'].get('new', '')
            return f"{resource_name}名称从「{old_name}」更改为「{new_name}」"

        # Handle status changes
        if 'status' in field_changes:
            old_status = field_changes['status'].get('old', '')
            new_status = field_changes['status'].get('new', '')
            old_status_zh = status_zh.get(old_status, old_status)
            new_status_zh = status_zh.get(new_status, new_status)
            return f"{resource_name}状态从「{old_status_zh}」更改为「{new_status_zh}」"

        # Handle CPC bid changes
        if 'cpc_bid_micros' in field_changes:
            old_val = field_changes['cpc_bid_micros'].get('old')
            new_val = field_changes['cpc_bid_micros'].get('new')
            if old_val is not None and new_val is not None:
                old_bid = format_micros_to_currency(old_val, currency)
                new_bid = format_micros_to_currency(new_val, currency)
                return f"{resource_name}每次点击费用从 {old_bid} 更改为 {new_bid}"

        # Handle CPM bid changes
        if 'cpm_bid_micros' in field_changes:
            old_val = field_changes['cpm_bid_micros'].get('old')
            new_val = field_changes['cpm_bid_micros'].get('new')
            if old_val is not None and new_val is not None:
                old_bid = format_micros_to_currency(old_val, currency)
                new_bid = format_micros_to_currency(new_val, currency)
                return f"{resource_name}每千次展示费用从 {old_bid} 更改为 {new_bid}"

        # Handle Target CPA changes
        if 'target_cpa_micros' in field_changes:
            old_val = field_changes['target_cpa_micros'].get('old')
            new_val = field_changes['target_cpa_micros'].get('new')
            if old_val is not None and new_val is not None:
                old_cpa = format_micros_to_currency(old_val, currency)
                new_cpa = format_micros_to_currency(new_val, currency)
                return f"{resource_name}目标每次转化费用从 {old_cpa} 更改为 {new_cpa}"

        # Multiple changes - show count
        change_count = len(field_changes)
        if change_count > 1:
            # Try to get translated field names for first 2 changes
            changed_field_names = []
            for field_key in list(field_changes.keys())[:2]:
                field_name = field_zh.get(field_key, field_key)
                changed_field_names.append(field_name)

            if len(changed_field_names) == 1:
                return f"{resource_name}更新：{changed_field_names[0]}"
            elif len(changed_field_names) == 2:
                return f"{resource_name}更新：{changed_field_names[0]}、{changed_field_names[1]}等（共{change_count}项变更）"
            else:
                return f"{resource_name}更新（共{change_count}项变更）"

        # Single change - generic format
        if change_count == 1:
            field_key = list(field_changes.keys())[0]
            field_name = field_zh.get(field_key, field_key)
            return f"{resource_name}更新：{field_name}"

    # Fallback to generic format
    return f"{operation_name}{resource_name}"


def fetch_change_events(customer_id, days=7, currency='USD'):
    """Fetch change events from Google Ads API

    Args:
        customer_id: Google Ads customer ID
        days: Number of days to fetch events for
        currency: Currency code for formatting monetary values (e.g., 'USD', 'CNY')
    """

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

            # Build English summary (technical reference)
            summary = f"{operation_name} {resource_type_name}"
            if len(field_changes) > 0:
                changed_fields = list(field_changes.keys())[:3]
                summary += f": {', '.join(changed_fields)}"

            # Generate Chinese summary (user-facing)
            summary_zh = generate_chinese_summary(
                resource_type_name,
                operation_name,
                field_changes,
                currency
            )

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
                "summaryZh": summary_zh,
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
        print(json.dumps({"error": True, "message": "Usage: fetch_events.py <customer_id> [days] [currency]"}), file=sys.stderr)
        sys.exit(1)

    customer_id = sys.argv[1]
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    currency = sys.argv[3] if len(sys.argv) > 3 else 'USD'

    events = fetch_change_events(customer_id, days, currency)

    # Output JSON to stdout
    print(json.dumps(events, default=str))
